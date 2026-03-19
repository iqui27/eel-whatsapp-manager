import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { isVoterInScope } from '@/lib/authorization';
import {
  filterVoters, getVoter, addVoter, updateVoter, deleteVoter,
  getSegmentsForVoterIds,
} from '@/lib/db-voters';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.view', 'Seu operador não pode acessar o CRM');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const query = searchParams.get('search');
  const page = Math.max(Number.parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1),
    100,
  );
  const offset = (page - 1) * limit;

  try {
    if (id) {
      const voter = await getVoter(id);
      if (!voter) {
        return NextResponse.json({ error: 'Eleitor não encontrado' }, { status: 404 });
      }
      if (!isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
      // Enrich single voter with segment data
      const segmentMap = await getSegmentsForVoterIds([voter.id]);
      return NextResponse.json({ ...voter, segments: segmentMap.get(voter.id) ?? [] });
    }

    const allData = await filterVoters({
      search: query ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      segmentId: searchParams.get('segmentId') ?? undefined,
      optInStatus: searchParams.get('optIn') ?? undefined,
      aiTier: searchParams.get('tier') ?? undefined,
      zone: searchParams.get('zone') ?? undefined,
      projectName: searchParams.get('projectName') ?? undefined,
      subsecretaria: searchParams.get('subsecretaria') ?? undefined,
    });
    const scopedData = allData.filter((voter) => isVoterInScope(auth.actor, voter));
    const data = scopedData.slice(offset, offset + limit);

    // Enrich paginated voters with segment data (single bulk query)
    const voterIds = data.map((v) => v.id);
    const segmentMap = await getSegmentsForVoterIds(voterIds);
    const enriched = data.map((v) => ({ ...v, segments: segmentMap.get(v.id) ?? [] }));

    return NextResponse.json({
      data: enriched,
      total: scopedData.length,
      page,
      limit,
    });
  } catch (error) {
    console.error('GET voters error:', error);
    return NextResponse.json({ error: 'Erro ao carregar eleitores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.edit', 'Seu operador não pode cadastrar eleitores');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: 'name e phone são obrigatórios' }, { status: 400 });
    }
    if (!isVoterInScope(auth.actor, body)) {
      return NextResponse.json({ error: 'Eleitor fora do seu escopo regional' }, { status: 403 });
    }
    const voter = await addVoter(body);
    return NextResponse.json(voter, { status: 201 });
  } catch (error) {
    console.error('POST voters error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar eleitor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.edit', 'Seu operador não pode editar eleitores');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const current = await getVoter(body.id);
    if (!current) {
      return NextResponse.json({ error: 'Eleitor não encontrado' }, { status: 404 });
    }
    if (!isVoterInScope(auth.actor, current)) {
      return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
    }
    const nextVoter = { ...current, ...body };
    if (!isVoterInScope(auth.actor, nextVoter)) {
      return NextResponse.json({ error: 'Eleitor fora do seu escopo regional' }, { status: 403 });
    }
    const { id, ...updates } = body;
    const voter = await updateVoter(id, updates);
    return NextResponse.json(voter);
  } catch (error) {
    console.error('PUT voters error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar eleitor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'crm.edit', 'Seu operador não pode remover eleitores');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const voter = await getVoter(id);
    if (!voter) {
      return NextResponse.json({ error: 'Eleitor não encontrado' }, { status: 404 });
    }
    if (!isVoterInScope(auth.actor, voter)) {
      return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
    }
    await deleteVoter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE voters error:', error);
    return NextResponse.json({ error: 'Erro ao deletar eleitor' }, { status: 500 });
  }
}
