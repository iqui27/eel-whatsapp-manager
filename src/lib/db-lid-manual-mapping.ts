/**
 * Manual @lid mapping CRUD library
 * Phase 43 fallback: operator-curated table for persistent @lid participants
 */
import { db } from '@/db';
import { lidManualMapping } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Upsert a manual mapping for @lid participant.
 * Called by operators when they identify a persistent @lid entry.
 */
export async function upsertLidManualMapping(
  groupJid: string,
  lidJid: string,
  voterName: string,
  voterId?: string,
  notes?: string,
  createdBy?: string,
): Promise<void> {
  await db
    .insert(lidManualMapping)
    .values({ groupJid, lidJid, voterName, voterId, notes, createdBy })
    .onConflictDoUpdate({
      target: [lidManualMapping.groupJid, lidManualMapping.lidJid],
      set: {
        voterName,
        voterId,
        notes,
        updatedAt: sql`now()`,
      },
    });
}

/**
 * Get manual mapping for a specific @lid in a group.
 * Returns voter name if mapped, null otherwise.
 */
export async function getLidMapping(
  groupJid: string,
  lidJid: string,
): Promise<{ voterName: string; voterId: string | null } | null> {
  const row = await db
    .select({ voterName: lidManualMapping.voterName, voterId: lidManualMapping.voterId })
    .from(lidManualMapping)
    .where(and(
      eq(lidManualMapping.groupJid, groupJid),
      eq(lidManualMapping.lidJid, lidJid),
    ))
    .limit(1);
  
  return row[0] ?? null;
}