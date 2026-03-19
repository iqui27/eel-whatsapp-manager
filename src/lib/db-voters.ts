/**
 * Voters data access — Drizzle / Supabase
 * Electoral contacts with engagement tracking and opt-in management.
 */
import { db } from '@/db';
import {
  voters, segmentVoters, segments,
  type Voter, type NewVoter,
} from '@/db/schema';
import { eq, desc, ilike, inArray } from 'drizzle-orm';
import { normalizePhone } from '@/lib/phone';

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
  // Normalize phone number to E.164 format
  const normalizedData = {
    ...data,
    phone: normalizePhone(data.phone),
  };
  const rows = await db.insert(voters).values(normalizedData).returning();
  return rows[0];
}

export async function updateVoter(
  id: string,
  data: Partial<Omit<NewVoter, 'id' | 'createdAt'>>,
): Promise<Voter | undefined> {
  // Normalize phone number if provided
  const normalizedData = {
    ...data,
    ...(data.phone && { phone: normalizePhone(data.phone) }),
    updatedAt: new Date(),
  };
  const rows = await db
    .update(voters)
    .set(normalizedData)
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
  // Normalize all phone numbers
  const normalizedData = data.map(v => ({
    ...v,
    phone: normalizePhone(v.phone),
  }));
  return db.insert(voters).values(normalizedData).returning();
}

export async function searchVoters(query: string): Promise<Voter[]> {
  // If query looks like a phone number, normalize it for search
  const isPhoneQuery = /^\d/.test(query);
  
  if (isPhoneQuery) {
    // Normalize and search by phone
    const normalizedPhone = normalizePhone(query);
    const pattern = `%${normalizedPhone}%`;
    return db
      .select()
      .from(voters)
      .where(ilike(voters.phone, pattern))
      .limit(500)
      .orderBy(desc(voters.engagementScore));
  }
  
  // Otherwise search by name
  const pattern = `%${query}%`;
  return db
    .select()
    .from(voters)
    .where(ilike(voters.name, pattern))
    .limit(500)
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

/**
 * Bulk-fetch segment associations for a list of voter IDs.
 * Returns a Map<voterId, Array<{id, name}>> — O(1) lookups per voter.
 */
export async function getSegmentsForVoterIds(
  voterIds: string[],
): Promise<Map<string, Array<{ id: string; name: string }>>> {
  if (voterIds.length === 0) return new Map();

  const rows = await db
    .select({
      voterId: segmentVoters.voterId,
      segmentId: segments.id,
      segmentName: segments.name,
    })
    .from(segmentVoters)
    .innerJoin(segments, eq(segmentVoters.segmentId, segments.id))
    .where(inArray(segmentVoters.voterId, voterIds));

  const map = new Map<string, Array<{ id: string; name: string }>>();
  for (const row of rows) {
    const arr = map.get(row.voterId) ?? [];
    arr.push({ id: row.segmentId, name: row.segmentName });
    map.set(row.voterId, arr);
  }
  return map;
}
