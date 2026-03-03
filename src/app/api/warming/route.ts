import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { loadChips } from '@/lib/db-chips';
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
    const { id } = await request.json();
    const chips = await loadChips();
    const chip = chips.find((c) => c.id === id);

    if (!chip) {
      return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });
    }

    const results = await runWarming(toAppConfig(config), toWarmingChips(chips), { singleChipId: id });
    return NextResponse.json({ success: true, results });
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

  const chips = await loadChips();
  const results = await runWarming(toAppConfig(config), toWarmingChips(chips));

  return NextResponse.json({ results });
}
