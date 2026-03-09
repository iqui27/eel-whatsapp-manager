import { NextRequest, NextResponse } from 'next/server';
import { addCluster, deleteCluster, loadClusters, updateCluster } from '@/lib/db-contacts';
import { requirePermission } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Seu operador não pode ver clusters');
  if (auth.response) return auth.response;

  const clusters = await loadClusters();
  return NextResponse.json(clusters);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode cadastrar clusters');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as {
      name?: string;
      messages?: string[];
      maxMessagesPerDay?: number;
      priority?: number;
      windowStart?: string;
      windowEnd?: string;
      enabled?: boolean;
    };

    const name = body.name?.trim();
    const messagePool = (body.messages ?? []).map((msg) => msg.trim()).filter(Boolean);

    if (!name) {
      return NextResponse.json({ error: 'Nome do cluster é obrigatório' }, { status: 400 });
    }

    if (messagePool.length === 0) {
      return NextResponse.json({ error: 'Adicione pelo menos uma mensagem para o cluster' }, { status: 400 });
    }

    const cluster = await addCluster({
      name,
      messages: messagePool,
      maxMessagesPerDay: Math.max(1, body.maxMessagesPerDay ?? 10),
      priority: Math.max(1, body.priority ?? 1),
      windowStart: body.windowStart?.trim() || '08:00',
      windowEnd: body.windowEnd?.trim() || '22:00',
      enabled: body.enabled ?? true,
    });
    return NextResponse.json(cluster, { status: 201 });
  } catch (error) {
    console.error('Add cluster error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar cluster' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode editar clusters');
  if (auth.response) return auth.response;

  try {
    const body = await request.json() as {
      id?: string;
      updates?: {
        name?: string;
        messages?: string[];
        maxMessagesPerDay?: number;
        priority?: number;
        windowStart?: string;
        windowEnd?: string;
        enabled?: boolean;
      };
    };

    if (!body.id || !body.updates) {
      return NextResponse.json({ error: 'ID e updates são obrigatórios' }, { status: 400 });
    }

    const updates = { ...body.updates };
    if (updates.messages) {
      updates.messages = updates.messages.map((msg) => msg.trim()).filter(Boolean);
    }

    await updateCluster(body.id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update cluster error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cluster' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode remover clusters');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    await deleteCluster(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete cluster error:', error);
    return NextResponse.json({ error: 'Erro ao deletar cluster' }, { status: 500 });
  }
}
