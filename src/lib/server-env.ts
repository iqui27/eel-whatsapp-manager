import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const cache = new Map<string, string | null>();

function parseEnvValue(raw: string) {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function resolveServerEnv(key: string): string | null {
  const runtimeValue = process.env[key];
  if (runtimeValue) {
    return runtimeValue;
  }

  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  for (const candidate of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    const filePath = join(process.cwd(), candidate);
    if (!existsSync(filePath)) {
      continue;
    }

    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmed.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }

      const name = trimmed.slice(0, separatorIndex).trim();
      if (name !== key) {
        continue;
      }

      const value = parseEnvValue(trimmed.slice(separatorIndex + 1));
      cache.set(key, value || null);
      return value || null;
    }
  }

  cache.set(key, null);
  return null;
}
