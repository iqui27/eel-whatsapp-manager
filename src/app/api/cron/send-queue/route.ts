import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { getNextQueuedMessages, assignMessageToChip, markMessageSending, markMessageSent, markMessageFailed } from '@/lib/db-message-queue';
import { selectBestChip } from '@/lib/chip-router';
import { incrementChipCounter } from '@/lib/db-chips';
import { sendText } from '@/lib/evolution';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';

// ─── Configuration ────────────────────────────────────────────────────────────

const BATCH_SIZE = 10; // Messages per cron run
const MIN_DELAY_MS = 15000; // 15 seconds between messages (anti-ban)
const MAX_DELAY_MS = 60000; // 60 seconds max delay
const TIME_WINDOW_START = 8; // 8 AM
const TIME_WINDOW_END = 20; // 8 PM
const TYPING_DELAY_MIN = 2000; // 2s typing simulation
const TYPING_DELAY_MAX = 5000; // 5s typing simulation

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isInTimeWindow(): { inWindow: boolean; message?: string } {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < TIME_WINDOW_START || hour >= TIME_WINDOW_END) {
    return {
      inWindow: false,
      message: `Fora da janela de envio (${TIME_WINDOW_START}:00-${TIME_WINDOW_END}:00). Hora atual: ${hour}:00`,
    };
  }
  
  return { inWindow: true };
}

// ─── Queue Processor ──────────────────────────────────────────────────────────

/**
 * GET /api/cron/send-queue
 * 
 * Queue processor for mass messaging.
 * 
 * Flow:
 * 1. Auth check (CRON_SECRET or loopback)
 * 2. Check time window (only send during configured hours)
 * 3. Get next batch of queued messages
 * 4. For each message:
 *    a. Select best chip
 *    b. Assign and mark as sending
 *    c. Random delay (anti-ban)
 *    d. Send via Evolution API
 *    e. Mark as sent or failed
 * 5. Return summary
 * 
 * Triggered by cron every ~1-5 minutes.
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

  // ─── Time Window Check ──────────────────────────────────────────────────────
  const timeCheck = isInTimeWindow();
  if (!timeCheck.inWindow) {
    return NextResponse.json({
      message: timeCheck.message,
      window: `${TIME_WINDOW_START}:00-${TIME_WINDOW_END}:00`,
      processed: 0,
    });
  }

  // ─── Load Config ────────────────────────────────────────────────────────────
  const config = await loadConfig();
  if (!config) {
    return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
  }

  const { evolutionApiUrl, evolutionApiKey } = config;
  if (!evolutionApiUrl || !evolutionApiKey) {
    return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 });
  }

  // ─── Get Queued Messages ────────────────────────────────────────────────────
  const messages = await getNextQueuedMessages(BATCH_SIZE);
  if (messages.length === 0) {
    return NextResponse.json({
      message: 'Fila vazia',
      window: `${TIME_WINDOW_START}:00-${TIME_WINDOW_END}:00`,
      processed: 0,
    });
  }

  // ─── Process Messages ───────────────────────────────────────────────────────
  let sent = 0;
  let failed = 0;
  const errors: Array<{ messageId: string; error: string }> = [];

  for (const msg of messages) {
    try {
      // 1. Select best chip
      const { chip, reason } = await selectBestChip(msg.segmentId ?? undefined);

      if (!chip || !chip.instanceName) {
        await markMessageFailed(msg.id, `Nenhum chip disponível: ${reason}`);
        failed++;
        errors.push({ messageId: msg.id, error: `No chip: ${reason}` });
        continue;
      }

      // 2. Assign message to chip
      await assignMessageToChip(msg.id, chip.id);

      // 3. Mark as sending
      await markMessageSending(msg.id);

      // 4. Random delay before sending (anti-ban)
      const delay = randomInt(MIN_DELAY_MS, MAX_DELAY_MS);
      await sleep(delay);

      // 5. Send via Evolution API
      const typingDelay = randomInt(TYPING_DELAY_MIN, TYPING_DELAY_MAX);
      const result = await sendText(
        evolutionApiUrl,
        evolutionApiKey,
        chip.instanceName,
        msg.voterPhone,
        msg.resolvedMessage,
        { delay: typingDelay }
      );

      // 6. Mark as sent
      await markMessageSent(msg.id, result.key.id);

      // 7. Increment chip counters
      await incrementChipCounter(chip.id, 'messagesSentToday');
      await incrementChipCounter(chip.id, 'messagesSentThisHour');

      sent++;
      console.log(`[send-queue] Sent ${msg.id} via ${chip.instanceName} to ${msg.voterPhone}`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await markMessageFailed(msg.id, errorMsg);
      failed++;
      errors.push({ messageId: msg.id, error: errorMsg });
      console.error(`[send-queue] Failed ${msg.id}:`, errorMsg);
    }
  }

  // ─── Return Summary ─────────────────────────────────────────────────────────
  const summary = {
    timestamp: new Date().toISOString(),
    window: `${TIME_WINDOW_START}:00-${TIME_WINDOW_END}:00`,
    batch: BATCH_SIZE,
    queued: messages.length,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  };

  console.log('[send-queue] Batch complete:', summary);
  return NextResponse.json(summary);
}