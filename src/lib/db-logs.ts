/**
 * Logs data access — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based logs.ts
 */
import { db, logs, type Log, type NewLog } from '@/db';
import { desc, gte, sql } from 'drizzle-orm';

export type { Log, NewLog };

export interface AddLogEntry {
  chipId?: string | null;
  chipName: string;
  phone: string;
  status: 'success' | 'error';
  message?: string | null;
}

export async function loadLogs(limit = 200): Promise<Log[]> {
  return db
    .select()
    .from(logs)
    .orderBy(desc(logs.createdAt))
    .limit(limit);
}

export async function addLog(entry: AddLogEntry): Promise<Log> {
  const rows = await db.insert(logs).values(entry).returning();
  return rows[0];
}

// ─── Dashboard stats ─────────────────────────────────────────────────────────

export interface DailyStats {
  date: string;
  total: number;
  success: number;
  error: number;
}

export async function getDailyStats(days = 7): Promise<DailyStats[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await db
    .select({
      date: sql<string>`DATE(${logs.createdAt})`,
      total: sql<number>`COUNT(*)::int`,
      success: sql<number>`COUNT(*) FILTER (WHERE ${logs.status} = 'success')::int`,
      error: sql<number>`COUNT(*) FILTER (WHERE ${logs.status} = 'error')::int`,
    })
    .from(logs)
    .where(gte(logs.createdAt, since))
    .groupBy(sql`DATE(${logs.createdAt})`)
    .orderBy(sql`DATE(${logs.createdAt})`);

  return rows.map((r) => ({
    date: r.date,
    total: Number(r.total),
    success: Number(r.success),
    error: Number(r.error),
  }));
}

export interface OverallStats {
  totalMessages: number;
  successCount: number;
  errorCount: number;
  successRate: number;
}

export async function getOverallStats(): Promise<OverallStats> {
  const rows = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      success: sql<number>`COUNT(*) FILTER (WHERE ${logs.status} = 'success')::int`,
      error: sql<number>`COUNT(*) FILTER (WHERE ${logs.status} = 'error')::int`,
    })
    .from(logs);

  const row = rows[0] ?? { total: 0, success: 0, error: 0 };
  const total = Number(row.total);
  const success = Number(row.success);
  const error = Number(row.error);

  return {
    totalMessages: total,
    successCount: success,
    errorCount: error,
    successRate: total > 0 ? Math.round((success / total) * 100) : 0,
  };
}
