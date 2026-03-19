/**
 * GET/PUT /api/env
 * Read and write environment variables from/to .env.local.
 * Only exposes the specific keys defined in ALLOWED_KEYS.
 * Admin-only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import fs from 'fs';
import path from 'path';

// ─── Allowed env keys (whitelist) ─────────────────────────────────────────────

export const ALLOWED_KEYS = [
  // AI
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  // Email
  'RESEND_API_KEY',
  'RESEND_FROM',
  // App
  'NEXT_PUBLIC_APP_URL',
  // Evolution API (runtime override)
  'EVOLUTION_API_URL',
  'EVOLUTION_API_KEY',
  // Cron
  'CRON_SECRET',
] as const;

type EnvKey = (typeof ALLOWED_KEYS)[number];

const ENV_PATH = path.join(process.cwd(), '.env.local');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readEnvFile(): Record<string, string> {
  try {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function writeEnvFile(vars: Record<string, string>): void {
  const lines: string[] = [];
  // Read existing file to preserve unknown keys and comments
  try {
    const existing = fs.readFileSync(ENV_PATH, 'utf-8');
    const processedKeys = new Set<string>();

    for (const line of existing.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        lines.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) { lines.push(line); continue; }
      const key = trimmed.slice(0, eqIdx).trim();

      if (key in vars) {
        lines.push(`${key}=${vars[key]}`);
        processedKeys.add(key);
      } else {
        lines.push(line); // preserve unmanaged keys
      }
    }

    // Append new keys that weren't in the file yet
    for (const [key, value] of Object.entries(vars)) {
      if (!processedKeys.has(key)) {
        lines.push(`${key}=${value}`);
      }
    }
  } catch {
    // File doesn't exist — create fresh
    for (const [key, value] of Object.entries(vars)) {
      lines.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf-8');
}

// ─── GET — return current values (masked for secrets) ────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Acesso negado');
  if (auth.response) return auth.response;

  const file = readEnvFile();
  const result: Record<string, string> = {};

  for (const key of ALLOWED_KEYS) {
    // Prefer process.env (runtime) over file value
    result[key] = process.env[key] ?? file[key] ?? '';
  }

  return NextResponse.json(result);
}

// ─── PUT — update specific keys ──────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Acesso negado');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as Record<string, string>;

    // Only allow whitelisted keys
    const toWrite: Record<string, string> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body && typeof body[key] === 'string') {
        toWrite[key] = body[key];
      }
    }

    if (Object.keys(toWrite).length === 0) {
      return NextResponse.json({ error: 'Nenhuma chave válida fornecida' }, { status: 400 });
    }

    writeEnvFile(toWrite);

    // Update process.env in memory so the change takes effect immediately
    // (will be fully applied after next PM2 restart)
    for (const [key, value] of Object.entries(toWrite)) {
      if (value) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }

    return NextResponse.json({
      success: true,
      updated: Object.keys(toWrite),
      note: 'Variáveis salvas em .env.local. Reinicie o servidor para aplicar completamente.',
    });
  } catch (err) {
    console.error('[api/env] PUT error:', err);
    return NextResponse.json({ error: 'Erro ao salvar variáveis' }, { status: 500 });
  }
}

export type { EnvKey };
