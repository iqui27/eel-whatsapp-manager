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

export function readCronToken(request: {
  headers: Headers;
  nextUrl?: URL;
  url?: string;
}): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null;
  }

  const headerToken = request.headers.get('x-cron-secret');
  if (headerToken?.trim()) {
    return headerToken.trim();
  }

  const searchParams = request.nextUrl
    ? request.nextUrl.searchParams
    : request.url
      ? new URL(request.url).searchParams
      : null;

  const queryToken = searchParams?.get('secret');
  return queryToken?.trim() || null;
}

export function isLocalInternalRequest(request: {
  headers: Headers;
  nextUrl?: URL;
  url?: string;
}): boolean {
  const hostname = request.nextUrl?.hostname
    ?? request.headers.get('x-forwarded-host')
    ?? request.headers.get('host')
    ?? (request.url ? new URL(request.url).hostname : '');

  const normalizedHost = hostname.replace(/:\d+$/, '').trim().toLowerCase();
  if (['127.0.0.1', '::1', 'localhost'].includes(normalizedHost)) {
    return true;
  }

  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim().toLowerCase() ?? '';
  return ['127.0.0.1', '::1'].includes(forwardedFor);
}
