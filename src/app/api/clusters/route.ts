import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { addCluster, deleteCluster, loadClusters, updateCluster } from '@/lib/contacts';
import { validateSession } from '@/lib/auth';

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return loadConfig();
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clusters = await loadClusters();
  return NextResponse.json(clusters);
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

    const cluster = {
      id: crypto.randomUUID(),
      name,
      messages: messagePool,
      maxMessagesPerDay: Math.max(1, body.maxMessagesPerDay ?? 10),
      priority: Math.max(1, body.priority ?? 1),
      windowStart: body.windowStart?.trim() || undefined,
      windowEnd: body.windowEnd?.trim() || undefined,
      enabled: body.enabled ?? true,
    };

    await addCluster(cluster);
    return NextResponse.json(cluster, { status: 201 });
  } catch (error) {
    console.error('Add cluster error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar cluster' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
