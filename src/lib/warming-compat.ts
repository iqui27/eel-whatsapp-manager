/**
 * Compatibility adapter between Drizzle DB types and the legacy warming lib.
 * The warming.ts file uses AppConfig (from lib/config) and Chip (old shape).
 * This adapter converts Drizzle types to those legacy shapes.
 */
import type { Config, Chip as DbChip } from '@/db';
import type { AppConfig, Chip as LegacyChip } from './config';

export function toAppConfig(cfg: Config): AppConfig {
  return {
    evolutionApiUrl: cfg.evolutionApiUrl,
    evolutionApiKey: cfg.evolutionApiKey,
    authPassword: cfg.authPassword,
    warmingEnabled: cfg.warmingEnabled ?? true,
    warmingIntervalMinutes: cfg.warmingIntervalMinutes ?? 60,
    warmingMessage: cfg.warmingMessage ?? '',
    instanceName: cfg.instanceName,
    lastCronRun: cfg.lastCronRun?.toISOString(),
  };
}

export function toWarmingChips(chips: (DbChip & { clusterIds?: string[] })[]): LegacyChip[] {
  return chips.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    instanceName: c.instanceName ?? undefined,
    groupId: c.groupId ?? undefined,
    clusterIds: c.clusterIds ?? [],
    enabled: c.enabled ?? true,
    lastWarmed: c.lastWarmed?.toISOString(),
    status: c.status as LegacyChip['status'],
    warmCount: c.warmCount ?? 0,
  }));
}
