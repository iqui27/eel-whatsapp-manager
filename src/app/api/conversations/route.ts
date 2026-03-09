import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { isVoterInScope } from '@/lib/authorization';
import {
  addConversation,
  getConversation,
  getConversationsByVoter,
  loadConversations,
} from '@/lib/db-conversations';
import { db } from '@/db';
import { conversationMessages, conversations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Conversation } from '@/db/schema';
import { getVoter, loadVoters } from '@/lib/db-voters';

async function getVisibleConversationIds(actor: Awaited<ReturnType<typeof requirePermission>>['actor']) {
  const voters = await loadVoters();
  return new Set(voters.filter((voter) => isVoterInScope(actor, voter)).map((voter) => voter.id));
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'conversations.view', 'Seu operador não pode acessar conversas');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const id = searchParams.get('id');
  const voterId = searchParams.get('voterId');

  try {
    if (id) {
      const conv = await getConversation(id);
      if (conv?.voterId) {
        const voter = await getVoter(conv.voterId);
        if (voter && !isVoterInScope(auth.actor, voter)) {
          return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
        }
      }
      return conv
        ? NextResponse.json(conv)
        : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (voterId) {
      const voter = await getVoter(voterId);
      if (voter && !isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
      return NextResponse.json(await getConversationsByVoter(voterId));
    }
    const data = await loadConversations(status ?? undefined);
    if (auth.actor?.role === 'admin' || !auth.actor?.regionScope) {
      return NextResponse.json(data);
    }

    const visibleIds = await getVisibleConversationIds(auth.actor);
    return NextResponse.json(
      data.filter((conversation) => conversation.voterId && visibleIds.has(conversation.voterId)),
    );
  } catch (err) {
    console.error('GET conversations error:', err);
    return NextResponse.json({ error: 'Erro ao carregar conversas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'conversations.reply', 'Seu operador não pode criar conversas');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (body.voterId) {
      const voter = await getVoter(body.voterId);
      if (voter && !isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
    }
    if (body.chipId === 'auto' || body.chipId === '') {
      body.chipId = null;
    }
    const conv = await addConversation(body);
    return NextResponse.json(conv, { status: 201 });
  } catch (err) {
    console.error('POST conversations error:', err);
    return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'conversations.reply', 'Seu operador não pode atualizar conversas');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const current = await getConversation(body.id);
    if (!current) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }
    if (current.voterId) {
      const voter = await getVoter(current.voterId);
      if (voter && !isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
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
  const auth = await requirePermission(request, 'conversations.reply', 'Seu operador não pode remover conversas');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const current = await getConversation(id);
    if (!current) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }
    if (current.voterId) {
      const voter = await getVoter(current.voterId);
      if (voter && !isVoterInScope(auth.actor, voter)) {
        return NextResponse.json({ error: 'Fora do seu escopo regional' }, { status: 403 });
      }
    }

    await db.delete(conversationMessages).where(eq(conversationMessages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE conversations error:', err);
    return NextResponse.json({ error: 'Erro ao deletar conversa' }, { status: 500 });
  }
}
