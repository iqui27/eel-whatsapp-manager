/**
 * Segments data access — Drizzle / Supabase
 * Audience segmentation with voter association management.
 */
import { db } from '@/db';
import {
  segments, segmentVoters,
  type Segment, type NewSegment,
} from '@/db/schema';
import { eq, desc, sql, count } from 'drizzle-orm';

export type { Segment, NewSegment };

export async function loadSegments(): Promise<Segment[]> {
  return db.select().from(segments).orderBy(desc(segments.createdAt));
}

export async function getSegment(id: string): Promise<Segment | undefined> {
  const rows = await db.select().from(segments).where(eq(segments.id, id)).limit(1);
  return rows[0];
}

export async function addSegment(
  data: Omit<NewSegment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Segment> {
  const rows = await db.insert(segments).values(data).returning();
  return rows[0];
}

export async function updateSegment(
  id: string,
  data: Partial<Omit<NewSegment, 'id' | 'createdAt'>>,
): Promise<Segment | undefined> {
  const rows = await db
    .update(segments)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(segments.id, id))
    .returning();
  return rows[0];
}

export async function deleteSegment(id: string): Promise<void> {
  // segmentVoters cascade-deletes automatically via FK
  await db.delete(segments).where(eq(segments.id, id));
}

export async function getSegmentVoterIds(segmentId: string): Promise<string[]> {
  const rows = await db
    .select({ voterId: segmentVoters.voterId })
    .from(segmentVoters)
    .where(eq(segmentVoters.segmentId, segmentId));
  return rows.map((r) => r.voterId);
}

export async function setSegmentVoters(
  segmentId: string,
  voterIds: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    // Remove all existing associations for this segment
    await tx.delete(segmentVoters).where(eq(segmentVoters.segmentId, segmentId));
    // Insert new ones
    if (voterIds.length > 0) {
      await tx.insert(segmentVoters).values(
        voterIds.map((voterId) => ({ segmentId, voterId })),
      );
    }
  });
}

export async function updateSegmentCount(segmentId: string): Promise<void> {
  const [result] = await db
    .select({ total: count() })
    .from(segmentVoters)
    .where(eq(segmentVoters.segmentId, segmentId));

  await db
    .update(segments)
    .set({ audienceCount: result?.total ?? 0, updatedAt: new Date() })
    .where(eq(segments.id, segmentId));
}
