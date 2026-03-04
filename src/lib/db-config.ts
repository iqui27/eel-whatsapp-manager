/**
 * App config data access — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based config.ts
 */
import { db, config, type Config, type NewConfig } from '@/db';

export type { Config, NewConfig };

export async function loadConfig(): Promise<Config | null> {
  const rows = await db.select().from(config).limit(1);
  return rows[0] ?? null;
}

export async function saveConfig(
  values: Omit<NewConfig, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Config> {
  const existing = await loadConfig();

  if (existing) {
    const rows = await db
      .update(config)
      .set({ ...values, updatedAt: new Date() })
      .returning();
    return rows[0];
  }

  const rows = await db.insert(config).values(values).returning();
  return rows[0];
}

export async function configExists(): Promise<boolean> {
  const cfg = await loadConfig();
  return cfg !== null;
}

export function validateConfig(cfg: Partial<NewConfig>): string[] {
  const errors: string[] = [];

  if (!cfg.evolutionApiUrl) {
    errors.push('URL da Evolution API é obrigatória');
  }
  if (!cfg.evolutionApiKey) {
    errors.push('API Key da Evolution API é obrigatória');
  }
  if (!cfg.authPassword || cfg.authPassword.length < 4) {
    errors.push('Senha deve ter pelo menos 4 caracteres');
  }
  if (!cfg.instanceName) {
    errors.push('Nome da instância é obrigatório');
  }

  return errors;
}
