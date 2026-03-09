import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { isVoterInScope } from '@/lib/authorization';
import { logConsent, getConsentHistory, getConsentStats, getAllConsentLogs } from '@/lib/db-compliance';
import { getVoter, loadVoters } from '@/lib/db-voters';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'compliance.view', 'Seu operador não pode acessar compliance');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const voterId = searchParams.get('voterId');
  const action = searchParams.get('action') ?? undefined;
  const all = searchParams.get('all');
  const stats = searchParams.get('stats');

  try {
    if (stats === '1') {
      if (auth.actor?.role === 'admin' || !auth.actor?.regionScope) {
        const data = await getConsentStats();
        return NextResponse.json(data);
      }

      const voters = await loadVoters();
      const scopedVoters = voters.filter((voter) => isVoterInScope(auth.actor, voter));
      const data = scopedVoters.reduce<Record<string, number>>((acc, voter) => {
        const key = voter.optInStatus ?? 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
      return NextResponse.json(data);
    }
    if (voterId) {
      const voter = await getVoter(voterId);
      if (!voter) {
        return NextResponse.json({ error: 'Eleitor não encontrado' }, { status: 404 });
      }
      if (!isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
      const history = await getConsentHistory(voterId);
      return NextResponse.json(history);
    }
    if (all === '1') {
      const logs = await getAllConsentLogs(action);
      if (auth.actor?.role === 'admin' || !auth.actor?.regionScope) {
        return NextResponse.json(logs);
      }

      const voters = await loadVoters();
      const visibleIds = new Set(
        voters.filter((voter) => isVoterInScope(auth.actor, voter)).map((voter) => voter.id),
      );
      return NextResponse.json(logs.filter((log) => log.voterId && visibleIds.has(log.voterId)));
    }
    // Default: return stats
    if (auth.actor?.role === 'admin' || !auth.actor?.regionScope) {
      const data = await getConsentStats();
      return NextResponse.json(data);
    }

    const voters = await loadVoters();
    const scopedVoters = voters.filter((voter) => isVoterInScope(auth.actor, voter));
    const data = scopedVoters.reduce<Record<string, number>>((acc, voter) => {
      const key = voter.optInStatus ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET compliance error:', err);
    return NextResponse.json({ error: 'Erro ao carregar compliance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'compliance.manage', 'Seu operador não pode registrar eventos de compliance');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.voterId || !body.action) {
      return NextResponse.json({ error: 'voterId e action são obrigatórios' }, { status: 400 });
    }
    const voter = await getVoter(body.voterId);
    if (!voter) {
      return NextResponse.json({ error: 'Eleitor não encontrado' }, { status: 404 });
    }
    if (!isVoterInScope(auth.actor, voter)) {
      return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
    }
    await logConsent(body.voterId, body.action, body.channel, body.metadata);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST compliance error:', err);
    return NextResponse.json({ error: 'Erro ao registrar consentimento' }, { status: 500 });
  }
}
