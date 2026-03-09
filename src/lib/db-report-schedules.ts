import { and, asc, desc, eq, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  reportDispatches,
  reportSchedules,
  type NewReportDispatch,
  type NewReportSchedule,
  type ReportDispatch,
  type ReportSchedule,
} from '@/db/schema';

export type { ReportSchedule, ReportDispatch, NewReportSchedule };

export async function loadReportSchedules(): Promise<ReportSchedule[]> {
  return db.select().from(reportSchedules).orderBy(asc(reportSchedules.nextRunAt));
}

export async function loadRecentReportDispatches(limit = 20): Promise<ReportDispatch[]> {
  return db.select().from(reportDispatches).orderBy(desc(reportDispatches.createdAt)).limit(limit);
}

export async function addReportSchedule(
  data: Omit<NewReportSchedule, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'lastStatus' | 'lastError'>,
): Promise<ReportSchedule> {
  const [schedule] = await db.insert(reportSchedules).values(data).returning();
  return schedule;
}

export async function updateReportSchedule(
  id: string,
  updates: Partial<Omit<NewReportSchedule, 'id' | 'createdAt'>>,
): Promise<ReportSchedule | undefined> {
  const [schedule] = await db
    .update(reportSchedules)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(reportSchedules.id, id))
    .returning();

  return schedule;
}

export async function deleteReportSchedule(id: string) {
  await db.delete(reportSchedules).where(eq(reportSchedules.id, id));
}

export async function getDueReportSchedules(now = new Date()): Promise<ReportSchedule[]> {
  return db
    .select()
    .from(reportSchedules)
    .where(and(eq(reportSchedules.active, true), lte(reportSchedules.nextRunAt, now)))
    .orderBy(asc(reportSchedules.nextRunAt));
}

export async function addReportDispatch(
  data: Omit<NewReportDispatch, 'id' | 'createdAt'>,
): Promise<ReportDispatch> {
  const [dispatch] = await db.insert(reportDispatches).values(data).returning();
  return dispatch;
}
