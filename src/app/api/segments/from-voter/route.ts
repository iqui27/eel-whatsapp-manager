import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { ensureSingleVoterSegment } from '@/lib/db-segments';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode preparar segmentos individuais');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.voterId) {
      return NextResponse.json({ error: 'voterId é obrigatório' }, { status: 400 });
    }

    const segment = await ensureSingleVoterSegment(body.voterId, body.voterName);
    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error('POST segments/from-voter error:', error);
    return NextResponse.json({ error: 'Erro ao preparar segmento do eleitor' }, { status: 500 });
  }
}
