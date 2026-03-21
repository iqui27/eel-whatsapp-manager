import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { loadChips, updateChip, updateChipHealth } from '@/lib/db-chips';
import { requirePermission } from '@/lib/api-auth';
import { getConnectionState, restartInstance, fetchInstances } from '@/lib/evolution';
import type { EvolutionInstance } from '@/lib/evolution';

const WEBHOOK_STALE_MS = 2 * 60 * 1000; // 2 minutes

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * POST /api/chips/sync
 *
 * Runs a health check on all chips:
 * - Polls getConnectionState for each chip with an instanceName
 * - Checks lastWebhookEvent staleness
 * - Attempts restart for connecting/disconnected chips
 * - Updates healthStatus + legacy status in DB
 * - Returns a summary of health states
 */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode sincronizar chips');
  if (auth.response) return auth.response;

  const config = await loadConfig();
  if (!config) return NextResponse.json({ error: 'Configuração ausente' }, { status: 404 });

  const { evolutionApiUrl, evolutionApiKey } = config;
  if (!evolutionApiUrl || !evolutionApiKey) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 });
  }

  try {
    const chips = await loadChips();
    const enabled = chips.filter((c) => c.enabled && c.instanceName);
    const now = new Date();

    let healthy = 0;
    let degraded = 0;
    let disconnected = 0;
    let notFound = 0;
    const results: Array<{ id: string; name: string; healthStatus: string; changed: boolean }> = [];

    // Fetch full instance info from Evolution once (includes proxy settings if configured there)
    let evolutionInstanceMap: Map<string, EvolutionInstance> = new Map();
    try {
      const instances = await fetchInstances(evolutionApiUrl, evolutionApiKey);
      for (const inst of instances) {
        evolutionInstanceMap.set(inst.name, inst);
      }
    } catch (err) {
      console.warn('[sync] Could not fetch full instance list from Evolution:', err);
      // Non-fatal — continue without instance detail sync
    }

    for (const chip of enabled) {
      const instanceName = chip.instanceName!;

      try {
        // eslint-disable-next-line prefer-const
        let { status: state, instanceExists } = await getConnectionState(evolutionApiUrl, evolutionApiKey, instanceName);

        // Instance doesn't exist
        if (!instanceExists) {
          await updateChipHealth(chip.id, {
            healthStatus: 'not_found',
            lastHealthCheck: now,
          });
          await updateChip(chip.id, { status: 'disconnected' });
          notFound++;
          results.push({
            id: chip.id,
            name: chip.name,
            healthStatus: 'not_found',
            changed: chip.healthStatus !== 'not_found',
          });
          continue;
        }

        // Attempt restart for non-healthy states
        if (state !== 'connected') {
          const result = await restartInstance(evolutionApiUrl, evolutionApiKey, instanceName);
          if (!result.success) {
            console.log(`[sync] Restart not available for ${instanceName}: ${result.message}`);
          }
          await sleep(3000);
          const recheck = await getConnectionState(evolutionApiUrl, evolutionApiKey, instanceName);
          state = recheck.status;
        }

        const legacyStatus: 'connected' | 'disconnected' = state === 'connected' ? 'connected' : 'disconnected';
        await updateChip(chip.id, { status: legacyStatus });

        let healthStatus: string;
        if (state === 'connected') {
          const isWebhookStale =
            chip.lastWebhookEvent
              ? now.getTime() - new Date(chip.lastWebhookEvent).getTime() > WEBHOOK_STALE_MS
              : true;

          healthStatus = isWebhookStale ? 'degraded' : 'healthy';
          if (healthStatus === 'healthy') {
            healthy++;
          } else {
            degraded++;
          }
        } else {
          healthStatus = 'disconnected';
          disconnected++;
        }

        await updateChipHealth(chip.id, {
          healthStatus,
          errorCount: state === 'connected' ? 0 : (chip.errorCount ?? 0) + 1,
          lastHealthCheck: now,
        });

        // Sync instance details from Evolution → DB (proxy, profile name)
        const evInst = evolutionInstanceMap.get(instanceName);
        if (evInst) {
          const updates: Record<string, unknown> = {};

          // Sync proxy: if Evolution has proxy config and our DB doesn't (or differs)
          if (evInst.proxy?.host) {
            const evProxyHost = evInst.proxy.host;
            const evProxyPort = evInst.proxy.port ? Number(evInst.proxy.port) : 80;
            const evProxyProtocol = (evInst.proxy.protocol ?? 'http') as 'http' | 'https' | 'socks4' | 'socks5';
            if (chip.proxyHost !== evProxyHost || chip.proxyPort !== evProxyPort) {
              updates.proxyHost = evProxyHost;
              updates.proxyPort = evProxyPort;
              updates.proxyProtocol = evProxyProtocol;
              updates.proxyUsername = evInst.proxy.username ?? null;
              updates.proxyPassword = evInst.proxy.password ?? null;
            }
          }

          // Sync profile name if Evolution has one and ours is empty
          if (evInst.profileName && !chip.profileName) {
            updates.profileName = evInst.profileName;
          }

          if (Object.keys(updates).length > 0) {
            await updateChip(chip.id, updates);
            console.log(`[sync] Updated chip ${instanceName} from Evolution:`, Object.keys(updates));
          }
        }

        results.push({
          id: chip.id,
          name: chip.name,
          healthStatus,
          changed: chip.healthStatus !== healthStatus,
        });
      } catch (err) {
        console.error(`[sync] Error for chip ${instanceName}:`, err);
        await updateChipHealth(chip.id, {
          healthStatus: 'disconnected',
          errorCount: (chip.errorCount ?? 0) + 1,
          lastHealthCheck: now,
        });
        disconnected++;
        results.push({ id: chip.id, name: chip.name, healthStatus: 'disconnected', changed: true });
      }
    }

    return NextResponse.json({
      success: true,
      synced: enabled.length,
      healthy,
      degraded,
      disconnected,
      notFound,
      chips: results,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Erro ao sincronizar com a Evolution API' }, { status: 500 });
  }
}
