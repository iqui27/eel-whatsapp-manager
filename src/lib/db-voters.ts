/**
 * Voters data access — Drizzle / Supabase
 * Electoral contacts with engagement tracking and opt-in management.
 */
import { db } from '@/db';
import {
  voters, segmentVoters,
  type Voter, type NewVoter,
} from '@/db/schema';
import { eq, desc, ilike, or } from 'drizzle-orm';

export type { Voter, NewVoter };

export async function loadVoters(): Promise<Voter[]> {
  return db.select().from(voters).orderBy(desc(voters.createdAt));
}

export async function getVoter(id: string): Promise<Voter | undefined> {
  const rows = await db.select().from(voters).where(eq(voters.id, id)).limit(1);
  return rows[0];
}

export async function addVoter(
  data: Omit<NewVoter, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Voter> {
  const rows = await db.insert(voters).values(data).returning();
  return rows[0];
}

export async function updateVoter(
  id: string,
  data: Partial<Omit<NewVoter, 'id' | 'createdAt'>>,
): Promise<Voter | undefined> {
  const rows = await db
    .update(voters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(voters.id, id))
    .returning();
  return rows[0];
}

export async function deleteVoter(id: string): Promise<void> {
  await db.delete(voters).where(eq(voters.id, id));
}

export async function bulkInsertVoters(
  data: Omit<NewVoter, 'id' | 'createdAt' | 'updatedAt'>[],
): Promise<Voter[]> {
  if (data.length === 0) return [];
  return db.insert(voters).values(data).returning();
}

export async function searchVoters(query: string): Promise<Voter[]> {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(voters)
    .where(or(ilike(voters.name, pattern), ilike(voters.phone, pattern)))
    .limit(50)
    .orderBy(desc(voters.engagementScore));
}

export async function getVotersBySegment(segmentId: string): Promise<Voter[]> {
  const rows = await db
    .select({ voter: voters })
    .from(segmentVoters)
    .innerJoin(voters, eq(segmentVoters.voterId, voters.id))
    .where(eq(segmentVoters.segmentId, segmentId));
  return rows.map((r) => r.voter);
}
