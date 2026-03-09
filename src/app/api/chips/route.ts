import { NextRequest, NextResponse } from 'next/server';
import { loadChips, addChip, updateChip, deleteChip } from '@/lib/db-chips';
import { requirePermission } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Seu operador não pode ver chips');
  if (auth.response) return auth.response;

  const chips = await loadChips();
  return NextResponse.json(chips);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode cadastrar chips');
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const chip = await addChip({
      name: body.name,
      phone: body.phone,
      instanceName: body.instanceName || null,
      groupId: body.groupId || null,
      enabled: body.enabled ?? true,
      status: 'disconnected',
      warmCount: 0,
    });
    return NextResponse.json(chip, { status: 201 });
  } catch (error) {
    console.error('Add chip error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar chip' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode editar chips');
  if (auth.response) return auth.response;

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
  const auth = await requirePermission(request, 'operations.manage', 'Seu operador não pode remover chips');
  if (auth.response) return auth.response;

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
