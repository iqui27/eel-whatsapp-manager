import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { getNextQueuedMessages, assignMessageToChip, markMessageSending, markMessageSent, markMessageFailed } from '@/lib/db-message-queue';
import { selectBestChip, resetRoundRobinIndex, type CampaignChipConstraints } from '@/lib/chip-router';
import { incrementChipCounter } from '@/lib/db-chips';
import { sendText } from '@/lib/evolution';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';
import { withCronLock } from '@/lib/cron-lock';
import { syslog } from '@/lib/system-logger';
import { getCampaign, updateCampaign, type Campaign } from '@/lib/db-campaigns';

export const maxDuration = 300;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Check if current time falls within a campaign's send window.
 * Parses "HH:MM" or "HH:MM:SS" strings (Postgres time type).
 * Defaults to 08:00–20:00 if windowStart/windowEnd are null.
 */
function isInCampaignTimeWindow(
  windowStart: string | null,
  windowEnd: string | null,
): boolean {
  const start = windowStart ?? '08:00';
  const end = windowEnd ?? '20:00';

  // Handle both "HH:MM" and "HH:MM:SS" formats
  const [startH = 8, startM = 0] = start.split(':').map(Number);
  const [endH = 20, endM = 0] = end.split(':').map(Number);

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  return nowMins >= startMins && nowMins < endMins;
}

/**
 * Build CampaignChipConstraints from a campaign record.
 * Restricts chip selection to the campaign's chosen chips and strategy.
 */
function buildChipConstraints(campaign: Campaign): CampaignChipConstraints {
  return {
    selectedChipIds:
      campaign.selectedChipIds && campaign.selectedChipIds.length > 0
        ? campaign.selectedChipIds
        : undefined,
    chipStrategy:
      (campaign.chipStrategy as CampaignChipConstraints['chipStrategy']) ??
      'affinity',
    maxDailyPerChip: campaign.maxDailyPerChip ?? undefined,
    maxHourlyPerChip: campaign.maxHourlyPerChip ?? undefined,
    pauseOnChipDegraded: campaign.pauseOnChipDegraded ?? false,
  };
}

// ─── Queue Processor ──────────────────────────────────────────────────────────

/**
 * GET /api/cron/send-queue
 *
 * Intelligent queue processor — reads per-campaign send configuration.
 *
 * Flow:
 * 1. Auth check (CRON_SECRET or loopback)
 * 2. Fetch up to 100 queued messages
 * 3. Group messages by campaignId
 * 4. For each campaign group:
 *    a. Load campaign config (batchSize, delays, time window, chip selection)
 *    b. Skip if outside campaign's time window
 *    c. Limit to campaign.batchSize messages
 *    d. For each message:
 *       - Typing presence delay (sleep before send)
 *       - Select best chip (respecting campaign constraints + strategy)
 *       - Anti-ban delay, then sendText
 *       - Rest pauses every N messages (restPauseEvery / longBreakEvery)
 *    e. Circuit breaker: pause campaign if error rate > threshold
 * 5. Return per-campaign summary
 */
export async function GET(request: NextRequest) {
  // ─── Auth ───────────────────────────────────────────────────────────────────
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lockResult = await withCronLock('send-queue', 360000, async () => {
    syslog({ level: 'info', category: 'cron', message: 'send-queue started' });

    // Reset round-robin index at start of each cron run
    resetRoundRobinIndex();

    // ─── Load Config ──────────────────────────────────────────────────────────
    const config = await loadConfig();
    if (!config) {
      return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
    }

    const { evolutionApiUrl, evolutionApiKey } = config;
    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 });
    }

    // ─── Fetch Global Message Batch ───────────────────────────────────────────
    // Fetch enough to serve multiple campaigns in one run
    const allMessages = await getNextQueuedMessages(100);
    if (allMessages.length === 0) {
      syslog({
        level: 'info',
        category: 'cron',
        message: 'send-queue completed (fila vazia)',
        details: { queued: 0 },
      });
      return NextResponse.json({ message: 'Fila vazia', processed: 0 });
    }

    // ─── Group Messages by Campaign ───────────────────────────────────────────
    const messagesByCampaign = new Map<string, typeof allMessages>();
    for (const msg of allMessages) {
      const key = msg.campaignId ?? '__no_campaign__';
      if (!messagesByCampaign.has(key)) {
        messagesByCampaign.set(key, []);
      }
      messagesByCampaign.get(key)!.push(msg);
    }

    // ─── Process Each Campaign ────────────────────────────────────────────────
    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    const allErrors: Array<{ messageId: string; error: string }> = [];
    const campaignSummaries: Array<{
      campaignId: string;
      sent: number;
      failed: number;
      skipped?: string;
    }> = [];

    for (const [campaignId, campaignMessages] of messagesByCampaign) {
      // Load campaign config
      let campaign: Campaign | undefined;
      if (campaignId !== '__no_campaign__') {
        campaign = await getCampaign(campaignId);
      }

      // Per-campaign config with safe defaults matching legacy hardcoded values
      const batchSize = campaign?.batchSize ?? 10;
      const minDelayMs = campaign?.minDelayMs ?? 15000;
      const maxDelayMs = campaign?.maxDelayMs ?? 60000;
      const typingDelayMin = campaign?.typingDelayMin ?? 2000;
      const typingDelayMax = campaign?.typingDelayMax ?? 5000;
      const restPauseEvery = campaign?.restPauseEvery ?? 20;
      const restPauseDurationMs = campaign?.restPauseDurationMs ?? 30000;
      const longBreakEvery = campaign?.longBreakEvery ?? 100;
      const longBreakDurationMs = campaign?.longBreakDurationMs ?? 60000;
      const circuitBreakerThreshold = campaign?.circuitBreakerThreshold ?? 5;

      // ── Time window check ───────────────────────────────────────────────────
      if (
        campaign &&
        !isInCampaignTimeWindow(campaign.windowStart, campaign.windowEnd)
      ) {
        const skippedMsg = `Fora da janela de envio (${campaign.windowStart ?? '08:00'}–${campaign.windowEnd ?? '20:00'})`;
        totalSkipped += campaignMessages.length;
        campaignSummaries.push({ campaignId, sent: 0, failed: 0, skipped: skippedMsg });
        syslog({
          level: 'info',
          category: 'cron',
          message: `send-queue: campanha ${campaignId} fora da janela`,
          details: { windowStart: campaign.windowStart, windowEnd: campaign.windowEnd },
        });
        continue;
      }

      // Limit to this campaign's configured batch size
      const messagesToProcess = campaignMessages.slice(0, batchSize);

      // Build chip constraints from campaign config
      const chipConstraints = campaign ? buildChipConstraints(campaign) : undefined;

      // Per-campaign run counters
      let campaignSent = 0;
      let campaignFailed = 0;
      let campaignAttempted = 0;
      let circuitBroken = false;

      for (const msg of messagesToProcess) {
        // ── Circuit breaker check (before each attempt) ─────────────────────
        if (
          campaignAttempted >= 5 &&
          (campaignFailed / campaignAttempted) * 100 >= circuitBreakerThreshold
        ) {
          circuitBroken = true;
          if (campaign) {
            await updateCampaign(campaignId, { status: 'paused' });
            syslog({
              level: 'warn',
              category: 'campaign',
              message: `Campanha ${campaignId} pausada pelo circuit breaker`,
              details: {
                campaignFailed,
                campaignAttempted,
                threshold: circuitBreakerThreshold,
                errorRate: `${((campaignFailed / campaignAttempted) * 100).toFixed(1)}%`,
              },
            });
          }
          break;
        }

        try {
          campaignAttempted++;

          // 1. Typing presence simulation — sleep before select/send
          const typingDelay = randomInt(typingDelayMin, typingDelayMax);
          await sleep(typingDelay);

          // 2. Select best chip (respecting campaign constraints + strategy)
          const { chip, reason } = await selectBestChip(
            msg.segmentId ?? undefined,
            chipConstraints,
          );

          if (!chip || !chip.instanceName) {
            await markMessageFailed(msg.id, `Nenhum chip disponível: ${reason}`);
            campaignFailed++;
            totalFailed++;
            allErrors.push({ messageId: msg.id, error: `No chip: ${reason}` });
            continue;
          }

          // 3. Assign message to chip
          await assignMessageToChip(msg.id, chip.id);

          // 4. Mark as sending
          await markMessageSending(msg.id);

          // 5. Anti-ban inter-message delay
          const delay = randomInt(minDelayMs, maxDelayMs);
          await sleep(delay);

          // 6. Send via Evolution API (also passes typing delay for WhatsApp indicator)
          const result = await sendText(
            evolutionApiUrl,
            evolutionApiKey,
            chip.instanceName,
            msg.voterPhone,
            msg.resolvedMessage,
            { delay: typingDelay },
          );

          // 7. Mark as sent
          await markMessageSent(msg.id, result.key.id);

          // 8. Increment chip counters
          await incrementChipCounter(chip.id, 'messagesSentToday');
          await incrementChipCounter(chip.id, 'messagesSentThisHour');

          campaignSent++;
          totalSent++;

          // 9. Rest pauses (intra-batch, per campaign message counter)
          if (campaignSent > 0 && campaignSent % longBreakEvery === 0) {
            syslog({
              level: 'info',
              category: 'cron',
              message: `send-queue: pausa longa (campanha ${campaignId})`,
              details: { after: campaignSent, durationMs: longBreakDurationMs },
            });
            await sleep(longBreakDurationMs);
          } else if (campaignSent > 0 && campaignSent % restPauseEvery === 0) {
            syslog({
              level: 'info',
              category: 'cron',
              message: `send-queue: pausa de descanso (campanha ${campaignId})`,
              details: { after: campaignSent, durationMs: restPauseDurationMs },
            });
            await sleep(restPauseDurationMs);
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          await markMessageFailed(msg.id, errorMsg);
          campaignFailed++;
          totalFailed++;
          allErrors.push({ messageId: msg.id, error: errorMsg });
          console.error(`[send-queue] Failed ${msg.id} (campaign ${campaignId}):`, errorMsg);
        }
      }

      campaignSummaries.push({
        campaignId,
        sent: campaignSent,
        failed: campaignFailed,
        ...(circuitBroken ? { skipped: 'circuit-breaker tripped' } : {}),
      });
    }

    // ─── Return Summary ───────────────────────────────────────────────────────
    const summary = {
      timestamp: new Date().toISOString(),
      queued: allMessages.length,
      sent: totalSent,
      failed: totalFailed,
      skipped: totalSkipped,
      campaigns: campaignSummaries,
      errors: allErrors.length > 0 ? allErrors : undefined,
    };

    syslog({
      level: 'info',
      category: 'cron',
      message: 'send-queue completed',
      details: { queued: allMessages.length, sent: totalSent, failed: totalFailed },
    });

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
