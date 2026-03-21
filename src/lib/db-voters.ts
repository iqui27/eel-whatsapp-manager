/**
 * Voters data access — Drizzle / Supabase
 * Electoral contacts with engagement tracking and opt-in management.
 */
import { db } from '@/db';
import {
  voters, segmentVoters, segments,
  type Voter, type NewVoter,
} from '@/db/schema';
import { eq, desc, ilike, inArray, and, or, sql } from 'drizzle-orm';
import { normalizePhone } from '@/lib/phone';

export type { Voter, NewVoter };

export async function loadVoters(limit?: number): Promise<Voter[]> {
  const query = db.select().from(voters).orderBy(desc(voters.createdAt));
  if (limit) return query.limit(limit);
  return query;
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

  // PostgreSQL hard limit: 65534 bind parameters per query.
  // The voters table has up to 31 columns → max safe batch = floor(65534/31) = 2114.
  // Use 2000 as a conservative chunk size.
  const BATCH_SIZE = 2000;
  if (normalizedData.length <= BATCH_SIZE) {
    return db.insert(voters).values(normalizedData).returning();
  }

  const results: Voter[] = [];
  for (let i = 0; i < normalizedData.length; i += BATCH_SIZE) {
    const batch = normalizedData.slice(i, i + BATCH_SIZE);
    const inserted = await db.insert(voters).values(batch).returning();
    results.push(...inserted);
  }
  return results;
}

export interface VoterFilters {
  search?: string;
  tag?: string;
  segmentId?: string;
  optInStatus?: string;
  aiTier?: string;
  zone?: string;
  projectName?: string;
  subsecretaria?: string;
}

/**
 * Filter voters with server-side conditions.
 * Returns all matching voters (caller handles pagination/scope).
 */
export async function filterVoters(filters: VoterFilters): Promise<Voter[]> {
  const conditions = [];

  if (filters.search) {
    const q = `%${filters.search}%`;
    conditions.push(
      or(ilike(voters.name, q), ilike(voters.phone, q)),
    );
  }
  if (filters.optInStatus && filters.optInStatus !== 'all') {
    conditions.push(sql`${voters.optInStatus} = ${filters.optInStatus}`);
  }
  if (filters.aiTier && filters.aiTier !== 'all') {
    conditions.push(sql`${voters.aiTier} = ${filters.aiTier}`);
  }
  if (filters.zone && filters.zone !== 'all') {
    conditions.push(eq(voters.zone, filters.zone));
  }
  if (filters.projectName) {
    conditions.push(ilike(voters.projectName, `%${filters.projectName}%`));
  }
  if (filters.subsecretaria) {
    conditions.push(ilike(voters.subsecretaria, `%${filters.subsecretaria}%`));
  }
  // Tag filter — Postgres array contains
  if (filters.tag) {
    conditions.push(sql`${voters.tags} @> ARRAY[${filters.tag}]::text[]`);
  }

  // Segment filter — join via segmentVoters
  if (filters.segmentId) {
    const voterIdsInSegment = await db
      .select({ voterId: segmentVoters.voterId })
      .from(segmentVoters)
      .where(eq(segmentVoters.segmentId, filters.segmentId));
    const ids = voterIdsInSegment.map((r) => r.voterId);
    if (ids.length === 0) return []; // segment exists but empty
    conditions.push(inArray(voters.id, ids));
  }

  const query = db.select().from(voters).orderBy(desc(voters.createdAt));
  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

/**
 * Find a single voter by exact phone number, handling the Brazilian 9th-digit variation.
 * Queries both the 12-digit form (55 + DDD + 8 digits) and the 13-digit form
 * (55 + DDD + 9 + 8 digits) in a single inArray query so that JIDs arriving
 * without the 9th digit still resolve to the correct voter record.
 */
export async function findVoterByPhone(normalizedPhone: string): Promise<Voter | undefined> {
  const variants: string[] = [normalizedPhone];
  if (normalizedPhone.length === 12) {
    // Add 13-digit variant: insert '9' after DDD (position 4)
    variants.push(normalizedPhone.slice(0, 4) + '9' + normalizedPhone.slice(4));
  } else if (normalizedPhone.length === 13) {
    // Add 12-digit variant: remove the '9' at position 4
    variants.push(normalizedPhone.slice(0, 4) + normalizedPhone.slice(5));
  }
  const rows = await db
    .select()
    .from(voters)
    .where(inArray(voters.phone, variants))
    .limit(1);
  return rows[0];
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

// ─── SQL-level paginated voter query ─────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

/**
 * Paginated voter query with SQL LIMIT/OFFSET.
 * Replaces the pattern of loading all voters then slicing in JS.
 * Returns { data: Voter[], total: number } with O(page_size) DB cost.
 *
 * Keep existing filterVoters() unchanged for callers that need all results
 * (compliance, conversations, export).
 */
export async function filterVotersPaginated(
  filters: VoterFilters,
  pagination: { limit: number; offset: number },
): Promise<PaginatedResult<Voter>> {
  const conditions = [];

  if (filters.search) {
    const q = `%${filters.search}%`;
    conditions.push(
      or(ilike(voters.name, q), ilike(voters.phone, q)),
    );
  }
  if (filters.optInStatus && filters.optInStatus !== 'all') {
    conditions.push(sql`${voters.optInStatus} = ${filters.optInStatus}`);
  }
  if (filters.aiTier && filters.aiTier !== 'all') {
    conditions.push(sql`${voters.aiTier} = ${filters.aiTier}`);
  }
  if (filters.zone && filters.zone !== 'all') {
    conditions.push(eq(voters.zone, filters.zone));
  }
  if (filters.projectName) {
    conditions.push(ilike(voters.projectName, `%${filters.projectName}%`));
  }
  if (filters.subsecretaria) {
    conditions.push(ilike(voters.subsecretaria, `%${filters.subsecretaria}%`));
  }
  if (filters.tag) {
    conditions.push(sql`${voters.tags} @> ARRAY[${filters.tag}]::text[]`);
  }

  // Segment filter — resolve voter IDs first (subquery)
  if (filters.segmentId) {
    const voterIdsInSegment = await db
      .select({ voterId: segmentVoters.voterId })
      .from(segmentVoters)
      .where(eq(segmentVoters.segmentId, filters.segmentId));
    const ids = voterIdsInSegment.map((r) => r.voterId);
    if (ids.length === 0) return { data: [], total: 0 };
    conditions.push(inArray(voters.id, ids));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count (single integer, minimal data transfer)
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(voters)
    .where(where);
  const total = countResult[0]?.count ?? 0;

  if (total === 0) return { data: [], total: 0 };

  // Get paginated data with SQL LIMIT/OFFSET
  const data = await db
    .select()
    .from(voters)
    .where(where)
    .orderBy(desc(voters.createdAt))
    .limit(pagination.limit)
    .offset(pagination.offset);

  return { data, total };
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
