import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { validateSession } from '@/lib/db-auth';
import {
  loadSegments, addSegment, updateSegment, deleteSegment,
} from '@/lib/db-segments';

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

  try {
    const data = await loadSegments();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET segments error:', error);
    return NextResponse.json({ error: 'Erro ao carregar segmentos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name || !body.filters) {
      return NextResponse.json({ error: 'name e filters são obrigatórios' }, { status: 400 });
    }
    // Ensure filters is stored as a JSON string
    const filters = typeof body.filters === 'string' ? body.filters : JSON.stringify(body.filters);
    const segment = await addSegment({ ...body, filters });
    return NextResponse.json(segment, { status: 201 });
  } catch (error) {
    console.error('POST segments error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar segmento' }, { status: 500 });
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
    // Serialize filters if it's an object
    if (updates.filters && typeof updates.filters !== 'string') {
      updates.filters = JSON.stringify(updates.filters);
    }
    const segment = await updateSegment(id, updates);
    return NextResponse.json(segment);
  } catch (error) {
    console.error('PUT segments error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar segmento' }, { status: 500 });
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
    await deleteSegment(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE segments error:', error);
    return NextResponse.json({ error: 'Erro ao deletar segmento' }, { status: 500 });
  }
}
