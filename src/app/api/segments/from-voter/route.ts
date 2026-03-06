import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { loadConfig } from '@/lib/db-config';
import { ensureSingleVoterSegment } from '@/lib/db-segments';

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
