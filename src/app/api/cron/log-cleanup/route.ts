import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { systemLogs } from '@/db/schema';
import { lt, sql } from 'drizzle-orm';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';

export const maxDuration = 30;

const RETENTION_DAYS = 30;

/**
 * GET /api/cron/log-cleanup
 *
 * Deletes system_logs older than 30 days.
 * Runs daily at 3 AM UTC (low-traffic hours — midnight BRT).
 * Registered in vercel.json: "0 3 * * *"
 */
export async function GET(request: NextRequest) {
  // Auth: CRON_SECRET or loopback
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cutoff = sql`NOW() - INTERVAL '${sql.raw(String(RETENTION_DAYS))} days'`;

    const deleted = await db
      .delete(systemLogs)
      .where(lt(systemLogs.createdAt, cutoff))
      .returning({ id: systemLogs.id });

    const deletedCount = deleted.length;

    console.log(`[log-cleanup] Deleted ${deletedCount} logs older than ${RETENTION_DAYS} days`);

    return NextResponse.json({
      message: 'Limpeza concluída',
      deleted: deletedCount,
      retentionDays: RETENTION_DAYS,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[log-cleanup] Error:', error);
    return NextResponse.json(
      { error: 'Falha na limpeza de logs' },
      { status: 500 },
    );
  }
}
