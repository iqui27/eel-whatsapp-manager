import { NextRequest, NextResponse } from 'next/server';
import { resetDailyCounters, resetHourlyCounters } from '@/lib/db-chips';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';
import { withCronLock } from '@/lib/cron-lock';

export const maxDuration = 30;

/**
 * GET /api/cron/reset-counters
 * 
 * Reset chip message counters.
 * Query param 'type' determines which counters:
 * - type=daily: Reset messagesSentToday + messagesSentThisHour (call at midnight)
 * - type=hourly: Reset messagesSentThisHour only (call at :00 each hour)
 * 
 * Typically called via cron:
 * - Daily at 00:00: /api/cron/reset-counters?type=daily
 * - Hourly at :00: /api/cron/reset-counters?type=hourly
 * 
 * Note: Daily reset also resets hourly, so hourly can be skipped when daily runs.
 */
export async function GET(request: NextRequest) {
  // Auth check
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'daily';

  const lockResult = await withCronLock('reset-counters', 60000, async () => {
    if (type === 'hourly') {
      await resetHourlyCounters();
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        reset: 'hourly',
        message: 'Hourly counters reset',
      });
    } else {
      await resetDailyCounters();
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        reset: 'daily',
        message: 'Daily + hourly counters reset',
      });
    }
  });

  if (!lockResult.locked) {
    return NextResponse.json({
      message: 'Execução anterior ainda em andamento',
      skipped: true,
    });
  }

  return lockResult.result;
}