import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { loadChips, updateChipHealth } from '@/lib/db-chips';
import { getConnectionState, restartInstance, getProfilePicture } from '@/lib/evolution';
import { updateChipProfile } from '@/lib/db-chips';
import { reassignMessagesFromChip } from '@/lib/db-message-queue';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';
import { withCronLock } from '@/lib/cron-lock';
import { syslog } from '@/lib/system-logger';

export const maxDuration = 60;

const WEBHOOK_STALE_MS = 5 * 60 * 1000; // 5 minutes - increased from 2min for reliability
const RESTART_WAIT_MS = 5000;
const PROFILE_SYNC_INTERVAL_MS = 60 * 60 * 1000; // 1 hour between profile syncs per chip

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProfileSyncChip {
  id: string;
  instanceName: string;
  profilePictureUrl: string | null;
  updatedAt: Date | null;
}

/**
 * Sync the profile picture from Evolution API to DB if it has changed.
 * Rate-limited to once per hour per chip to avoid excessive API calls.
 * Wrapped in try/catch — profile sync errors never crash the health cron.
 */
async function syncChipProfilePicture(
  chip: ProfileSyncChip,
  evolutionApiUrl: string,
  evolutionApiKey: string,
  now: Date,
): Promise<void> {
  // Rate limit: skip if chip was updated (profile sync) within the last hour
  if (chip.updatedAt && now.getTime() - new Date(chip.updatedAt).getTime() < PROFILE_SYNC_INTERVAL_MS) {
    return;
  }

  try {
    const pictureUrl = await getProfilePicture(evolutionApiUrl, evolutionApiKey, chip.instanceName);
    if (pictureUrl && pictureUrl !== chip.profilePictureUrl) {
      await updateChipProfile(chip.id, { profilePictureUrl: pictureUrl });
    }
  } catch (err) {
    // Non-fatal — profile sync is best-effort
    console.warn(`[chip-health] Profile sync failed for ${chip.instanceName}:`, err);
  }
}

/**
 * GET /api/cron/chip-health
 *
 * Polls all chips, checks connection state, auto-restarts disconnected instances,
 * and updates healthStatus in the DB.
 *
 * Triggered every ~30 seconds by the cron scheduler.
 * Auth: CRON_SECRET header OR loopback request.
 */
export async function GET(request: NextRequest) {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lockResult = await withCronLock('chip-health', 90000, async () => {
    syslog({ level: 'info', category: 'cron', message: 'chip-health started' });
    const config = await loadConfig();
    if (!config) {
      return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
    }

    const { evolutionApiUrl, evolutionApiKey } = config;
    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 });
    }

    const allChips = await loadChips();
    const enabled = allChips.filter((c) => c.enabled && c.instanceName);

    let healthy = 0;
    let degraded = 0;
    let disconnected = 0;
    let quarantined = 0;
    let notFound = 0;

    const now = new Date();

    for (const chip of enabled) {
      const instanceName = chip.instanceName!;

      try {
        // eslint-disable-next-line prefer-const
        let { status: connStatus, instanceExists } = await getConnectionState(
          evolutionApiUrl, 
          evolutionApiKey, 
          instanceName
        );

        // ─── Instance doesn't exist in Evolution API ──────────────────────────
        if (!instanceExists) {
          await updateChipHealth(chip.id, {
            healthStatus: 'not_found',
            lastHealthCheck: now,
          });
          notFound++;
          console.warn(`[chip-health] Instance "${instanceName}" not found in Evolution API`);
          continue;
        }

        // ─── Connection handling ───────────────────────────────────────────
        if (connStatus === 'connecting' || connStatus === 'disconnected') {
          // Attempt restart unless already quarantined
          if ((chip.errorCount ?? 0) < 3) {
            const result = await restartInstance(evolutionApiUrl, evolutionApiKey, instanceName);
            if (!result.success) {
              console.log(`[chip-health] Restart not available for ${instanceName}: ${result.message}`);
            }
            await sleep(RESTART_WAIT_MS);
            const recheck = await getConnectionState(evolutionApiUrl, evolutionApiKey, instanceName);
            connStatus = recheck.status;
          }
        }

        // ─── Check cooldown expiry ─────────────────────────────────────────
        if (
          chip.healthStatus === 'cooldown' &&
          chip.cooldownUntil &&
          new Date(chip.cooldownUntil) <= now
        ) {
          // Cooldown expired — restore to healthy if connected
          if (connStatus === 'connected') {
            await updateChipHealth(chip.id, {
              healthStatus: 'healthy',
              errorCount: 0,
              cooldownUntil: null,
              lastHealthCheck: now,
            });
            healthy++;
            continue;
          }
        }

        // ─── Determine new health status ───────────────────────────────────
        if (connStatus === 'connected') {
          const isWebhookStale =
            chip.lastWebhookEvent
              ? now.getTime() - new Date(chip.lastWebhookEvent).getTime() > WEBHOOK_STALE_MS
              : true; // No webhook event ever — treat as stale until first event

          if (isWebhookStale) {
            // Connected but webhook is stale → degraded
            await updateChipHealth(chip.id, {
              healthStatus: 'degraded',
              lastHealthCheck: now,
            });
            degraded++;
          } else {
            // Fully healthy
            await updateChipHealth(chip.id, {
              healthStatus: 'healthy',
              errorCount: 0,
              lastHealthCheck: now,
            });
            healthy++;
          }

          // ─── Profile sync (healthy + degraded chips only) ──────────────────
          // Best-effort — errors are caught inside syncChipProfilePicture
          await syncChipProfilePicture(
            {
              id: chip.id,
              instanceName,
              profilePictureUrl: chip.profilePictureUrl ?? null,
              updatedAt: chip.updatedAt ?? null,
            },
            evolutionApiUrl,
            evolutionApiKey,
            now,
          );
        } else {
          // Still disconnected after restart attempt
          const newErrorCount = (chip.errorCount ?? 0) + 1;
          const newStatus = newErrorCount >= 3 ? 'quarantined' : 'disconnected';

          await updateChipHealth(chip.id, {
            healthStatus: newStatus,
            errorCount: newErrorCount,
            lastHealthCheck: now,
          });

          if (newStatus === 'quarantined') {
            quarantined++;
            console.warn(`[chip-health] Chip ${instanceName} quarantined after ${newErrorCount} failed restarts`);
            
            // Reassign pending messages from this chip back to the queue
            const reassigned = await reassignMessagesFromChip(chip.id);
            if (reassigned > 0) {
              console.log(`[chip-health] Reassigned ${reassigned} messages from ${instanceName} to queue`);
            }
          } else {
            disconnected++;
          }
        }
      } catch (err) {
        console.error(`[chip-health] Error checking chip ${instanceName}:`, err);
        // Mark as disconnected on unexpected errors
        await updateChipHealth(chip.id, {
          healthStatus: 'disconnected',
          errorCount: (chip.errorCount ?? 0) + 1,
          lastHealthCheck: now,
        });
        disconnected++;
      }
    }

    const summary = {
      timestamp: now.toISOString(),
      checked: enabled.length,
      healthy,
      degraded,
      disconnected,
      quarantined,
      notFound,
      skipped: allChips.length - enabled.length,
    };

    syslog({ level: 'info', category: 'cron', message: 'chip-health completed', details: { checked: enabled.length, healthy, degraded, disconnected, quarantined, notFound } });
    console.log('[chip-health] Check complete:', summary);
    return NextResponse.json(summary);
  });

  if (!lockResult.locked) {
    return NextResponse.json({
      message: 'Execução anterior ainda em andamento',
      skipped: true,
    });
  }

  return lockResult.result;
}