import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { logConsent, getConsentHistory, getConsentStats } from '@/lib/db-compliance';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  return await validateSession(token);
}

export async function GET(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const voterId = searchParams.get('voterId');

  try {
    if (voterId) {
      const history = await getConsentHistory(voterId);
      return NextResponse.json(history);
    }
    const stats = await getConsentStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('GET compliance error:', err);
    return NextResponse.json({ error: 'Erro ao carregar compliance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.voterId || !body.action) {
      return NextResponse.json({ error: 'voterId e action são obrigatórios' }, { status: 400 });
    }
    await logConsent(body.voterId, body.action, body.channel, body.metadata);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST compliance error:', err);
    return NextResponse.json({ error: 'Erro ao registrar consentimento' }, { status: 500 });
  }
}
