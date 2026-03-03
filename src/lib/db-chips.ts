/**
 * Chips data access — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based chips.ts
 */
import { db, chips, type Chip, type NewChip } from '@/db';
import { eq } from 'drizzle-orm';

export type { Chip, NewChip };

export async function loadChips(): Promise<Chip[]> {
  return db.select().from(chips).orderBy(chips.createdAt);
}

export async function getChip(id: string): Promise<Chip | undefined> {
  const rows = await db.select().from(chips).where(eq(chips.id, id)).limit(1);
  return rows[0];
}

export async function addChip(chip: Omit<NewChip, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chip> {
  const rows = await db.insert(chips).values(chip).returning();
  return rows[0];
}

export async function updateChip(
  id: string,
  updates: Partial<Omit<NewChip, 'id' | 'createdAt'>>,
): Promise<Chip | undefined> {
  const rows = await db
    .update(chips)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(chips.id, id))
    .returning();
  return rows[0];
}

export async function deleteChip(id: string): Promise<void> {
  await db.delete(chips).where(eq(chips.id, id));
}
