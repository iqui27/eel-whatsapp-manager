/**
 * GET/PUT /api/config
 * Read and update the app config record in the database.
 * Exposes safe fields only (no auth password).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { loadConfig, saveConfig } from '@/lib/db-config';

const SAFE_FIELDS = [
  'evolutionApiUrl', 'instanceName',
  'candidateDisplayName', 'candidateOffice', 'candidateParty', 'candidateRegion',
  'warmingEnabled', 'warmingIntervalMinutes', 'warmingMessage',
  'lastCronRun',
] as const;

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Acesso negado');
  if (auth.response) return auth.response;

  const cfg = await loadConfig();
  if (!cfg) return NextResponse.json({});

  // Strip sensitive fields
  const safe: Record<string, unknown> = {};
  for (const field of SAFE_FIELDS) {
    safe[field] = cfg[field as keyof typeof cfg] ?? null;
  }
  return NextResponse.json(safe);
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'admin.manage', 'Acesso negado');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;

    // Only allow safe fields
    const updates: Record<string, unknown> = {};
    for (const field of SAFE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo válido' }, { status: 400 });
    }

    const existing = await loadConfig();
    if (!existing) {
      return NextResponse.json({ error: 'Configuração não inicializada' }, { status: 404 });
    }

    const updated = await saveConfig({ ...existing, ...updates } as Parameters<typeof saveConfig>[0]);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[api/config] PUT error:', err);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
