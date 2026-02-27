import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { loadChips, addChip, updateChip, deleteChip } from '@/lib/chips';

async function verifyAuth(request: NextRequest) {
  const authCookie = request.cookies.get('auth');
  const config = await loadConfig();
  
  if (!config || authCookie?.value !== config.authPassword) {
    return null;
  }
  return config;
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const chips = await loadChips();
  return NextResponse.json(chips);
}

export async function POST(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const chip = {
      id: crypto.randomUUID(),
      name: body.name,
      phone: body.phone,
      groupId: body.groupId,
      enabled: body.enabled ?? true,
      status: 'disconnected' as const,
    };

    await addChip(chip);
    return NextResponse.json(chip, { status: 201 });
  } catch (error) {
    console.error('Add chip error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar chip' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    await updateChip(body.id, body.updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update chip error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar chip' }, { status: 500 });
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

    await deleteChip(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chip error:', error);
    return NextResponse.json({ error: 'Erro ao deletar chip' }, { status: 500 });
  }
}
