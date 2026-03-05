import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { loadConversations, getConversation, addConversation, updateConversationStatus } from '@/lib/db-conversations';
import type { Conversation } from '@/db/schema';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  return await validateSession(token);
}

export async function GET(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const id = searchParams.get('id');

  try {
    if (id) {
      const conv = await getConversation(id);
      return conv
        ? NextResponse.json(conv)
        : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = await loadConversations(status ?? undefined);
    return NextResponse.json(data);
  } catch (err) {
    console.error('GET conversations error:', err);
    return NextResponse.json({ error: 'Erro ao carregar conversas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const conv = await addConversation(body);
    return NextResponse.json(conv, { status: 201 });
  } catch (err) {
    console.error('POST conversations error:', err);
    return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return NextResponse.json({ error: 'id e status são obrigatórios' }, { status: 400 });
    }
    await updateConversationStatus(body.id, body.status as NonNullable<Conversation['status']>);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT conversations error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar conversa' }, { status: 500 });
  }
}
