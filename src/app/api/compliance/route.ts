import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { logConsent, getConsentHistory, getConsentStats, getAllConsentLogs } from '@/lib/db-compliance';

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
  const action = searchParams.get('action') ?? undefined;
  const all = searchParams.get('all');
  const stats = searchParams.get('stats');

  try {
    if (stats === '1') {
      const data = await getConsentStats();
      return NextResponse.json(data);
    }
    if (voterId) {
      const history = await getConsentHistory(voterId);
      return NextResponse.json(history);
    }
    if (all === '1') {
      const logs = await getAllConsentLogs(action);
      return NextResponse.json(logs);
    }
    // Default: return stats
    const data = await getConsentStats();
    return NextResponse.json(data);
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
