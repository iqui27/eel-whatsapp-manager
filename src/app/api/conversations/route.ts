import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/db-auth';
import { loadConversations, getConversation, addConversation } from '@/lib/db-conversations';
import { db } from '@/db';
import { conversationMessages, conversations } from '@/db/schema';
import { eq } from 'drizzle-orm';
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
  const voterId = searchParams.get('voterId');

  try {
    if (id) {
      const conv = await getConversation(id);
      return conv
        ? NextResponse.json(conv)
        : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (voterId) {
      const all = await loadConversations();
      return NextResponse.json(all.filter(c => c.voterId === voterId));
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
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const updates: Partial<Conversation> & { updatedAt: Date } = { updatedAt: new Date() };
    if (body.status !== undefined) updates.status = body.status as NonNullable<Conversation['status']>;
    if (body.handoffReason !== undefined) updates.handoffReason = body.handoffReason;
    if (body.assignedAgent !== undefined) updates.assignedAgent = body.assignedAgent;
    if (body.priority !== undefined) updates.priority = body.priority;
    await db.update(conversations).set(updates).where(eq(conversations.id, body.id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('PUT conversations error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar conversa' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!await verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE conversations error:', err);
    return NextResponse.json({ error: 'Erro ao deletar conversa' }, { status: 500 });
  }
}
