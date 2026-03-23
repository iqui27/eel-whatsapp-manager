import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { syncVotersToConcuso } from '@/lib/db-segments';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode sincronizar segmentos');
  if (auth.response) return auth.response;

  try {
    const result = await syncVotersToConcuso();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('POST segments/sync-concuso error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao sincronizar segmento Concuso';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
