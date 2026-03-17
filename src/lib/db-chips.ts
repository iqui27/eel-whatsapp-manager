/**
 * Chips data access — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based chips.ts
 */
import { db, chips, chipClusters, type Chip, type NewChip } from '@/db';
import { eq, inArray, sql as drizzleSql } from 'drizzle-orm';

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

// ─── Chip ↔ Cluster relationships ────────────────────────────────────────────

export async function getChipClusterIds(chipId: string): Promise<string[]> {
  const rows = await db
    .select({ clusterId: chipClusters.clusterId })
    .from(chipClusters)
    .where(eq(chipClusters.chipId, chipId));
  return rows.map((r) => r.clusterId);
}

export async function setChipClusters(chipId: string, clusterIds: string[]): Promise<void> {
  await db.delete(chipClusters).where(eq(chipClusters.chipId, chipId));
  if (clusterIds.length > 0) {
    await db.insert(chipClusters).values(
      clusterIds.map((clusterId) => ({ chipId, clusterId })),
    );
  }
}

// ─── Health monitoring helpers (Phase 14) ─────────────────────────────────

export type ChipHealthStatus =
  | 'healthy'
  | 'degraded'
  | 'cooldown'
  | 'quarantined'
  | 'banned'
  | 'warming_up'
  | 'disconnected';

type HealthFields = Partial<Pick<
  Chip,
  | 'healthStatus'
  | 'messagesSentToday'
  | 'messagesSentThisHour'
  | 'dailyLimit'
  | 'hourlyLimit'
  | 'lastHealthCheck'
  | 'lastWebhookEvent'
  | 'cooldownUntil'
  | 'bannedAt'
  | 'errorCount'
  | 'blockRate'
  | 'assignedSegments'
>>;

/** Partial update of health-related fields on a chip */
export async function updateChipHealth(
  chipId: string,
  healthFields: HealthFields,
): Promise<Chip | undefined> {
  const rows = await db
    .update(chips)
    .set({ ...healthFields, updatedAt: new Date() })
    .where(eq(chips.id, chipId))
    .returning();
  return rows[0];
}

/** Returns chips that are healthy or degraded AND have daily capacity remaining */
export async function getHealthyChips(): Promise<Chip[]> {
  return db
    .select()
    .from(chips)
    .where(
      inArray(chips.healthStatus, ['healthy', 'degraded']),
    )
    .then((rows) =>
      rows.filter(
        (c) =>
          c.enabled &&
          (c.messagesSentToday ?? 0) < (c.dailyLimit ?? 200),
      ),
    );
}

/** Atomically increment a counter field using SQL */
export async function incrementChipCounter(
  chipId: string,
  field: 'messagesSentToday' | 'messagesSentThisHour',
): Promise<void> {
  const col = field === 'messagesSentToday' ? chips.messagesSentToday : chips.messagesSentThisHour;
  await db
    .update(chips)
    .set({
      [field]: drizzleSql`${col} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(chips.id, chipId));
}

/** Reset daily + hourly counters for all chips (called by daily cron) */
export async function resetDailyCounters(): Promise<void> {
  await db.update(chips).set({
    messagesSentToday: 0,
    messagesSentThisHour: 0,
    updatedAt: new Date(),
  });
}

/** Load all chips with their clusterIds already populated */
export async function loadChipsWithClusters(): Promise<(Chip & { clusterIds: string[] })[]> {
  const allChips = await loadChips();
  const allRelations = await db.select().from(chipClusters);

  const clusterMap = new Map<string, string[]>();
  for (const rel of allRelations) {
    const list = clusterMap.get(rel.chipId) ?? [];
    list.push(rel.clusterId);
    clusterMap.set(rel.chipId, list);
  }

  return allChips.map((chip) => ({
    ...chip,
    clusterIds: clusterMap.get(chip.id) ?? [],
  }));
}
