import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { loadChips, updateChipHealth } from '@/lib/db-chips';
import { getConnectionState, restartInstance } from '@/lib/evolution';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';

const WEBHOOK_STALE_MS = 2 * 60 * 1000; // 2 minutes
const RESTART_WAIT_MS = 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  const now = new Date();

  for (const chip of enabled) {
    const instanceName = chip.instanceName!;

    try {
      let state = await getConnectionState(evolutionApiUrl, evolutionApiKey, instanceName);

      // ─── Connection handling ─────────────────────────────────────────────
      if (state === 'connecting' || state === 'disconnected') {
        // Attempt restart unless already quarantined
        if ((chip.errorCount ?? 0) < 3) {
          try {
            await restartInstance(evolutionApiUrl, evolutionApiKey, instanceName);
            await sleep(RESTART_WAIT_MS);
            state = await getConnectionState(evolutionApiUrl, evolutionApiKey, instanceName);
          } catch (restartErr) {
            console.error(`[chip-health] restart failed for ${instanceName}:`, restartErr);
          }
        }
      }

      // ─── Check cooldown expiry ───────────────────────────────────────────
      if (
        chip.healthStatus === 'cooldown' &&
        chip.cooldownUntil &&
        new Date(chip.cooldownUntil) <= now
      ) {
        // Cooldown expired — restore to healthy if connected
        if (state === 'connected') {
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

      // ─── Determine new health status ─────────────────────────────────────
      if (state === 'connected') {
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
    skipped: allChips.length - enabled.length,
  };

  console.log('[chip-health] Check complete:', summary);
  return NextResponse.json(summary);
}
