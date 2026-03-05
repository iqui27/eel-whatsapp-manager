import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { validateSession } from '@/lib/db-auth';
import {
  loadVoters, addVoter, updateVoter, deleteVoter, searchVoters,
} from '@/lib/db-voters';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return await loadConfig();
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('search');

  try {
    const data = query ? await searchVoters(query) : await loadVoters();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET voters error:', error);
    return NextResponse.json({ error: 'Erro ao carregar eleitores' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.phone) {
      return NextResponse.json({ error: 'name e phone são obrigatórios' }, { status: 400 });
    }
    const voter = await addVoter(body);
    return NextResponse.json(voter, { status: 201 });
  } catch (error) {
    console.error('POST voters error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar eleitor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
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
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    await deleteVoter(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE voters error:', error);
    return NextResponse.json({ error: 'Erro ao deletar eleitor' }, { status: 500 });
  }
}
