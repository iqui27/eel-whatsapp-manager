import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { loadChipsWithClusters } from '@/lib/db-chips';
import { validateSession } from '@/lib/db-auth';
import { runWarming } from '@/lib/warming';
import { toAppConfig, toWarmingChips } from '@/lib/warming-compat';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return await loadConfig();
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let id: string | undefined;
    try {
      const body = await request.json() as { id?: string };
      id = body.id;
    } catch {
      id = undefined;
    }

    const chips = await loadChipsWithClusters();
    const chip = id ? chips.find((c) => c.id === id) : undefined;

    if (id && !chip) {
      return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });
    }

    const results = await runWarming(
      toAppConfig(config),
      toWarmingChips(chips),
      id ? { singleChipId: id } : undefined,
    );
    return NextResponse.json({ success: true, scope: id ? 'single' : 'all', results });
  } catch (error) {
    console.error('Warming error:', error);
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chips = await loadChipsWithClusters();
  return NextResponse.json({
    warmingEnabled: config.warmingEnabled ?? true,
    warmingIntervalMinutes: config.warmingIntervalMinutes ?? 60,
    warmingMessage: config.warmingMessage ?? '',
    lastCronRun: config.lastCronRun ?? null,
    totalChips: chips.length,
    connectedChips: chips.filter((chip) => chip.status === 'connected').length,
  });
}
