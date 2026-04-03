import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { upsertLidManualMapping, deleteLidMapping } from '@/lib/db-lid-manual-mapping';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/groups/[id]/members/lid-mapping
 * Upsert a manual @lid → voterName mapping for this group.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Sem permissão para editar mappings');
  if (auth.response) return auth.response;

  try {
    const { id: groupJid } = await params;
    const body = await request.json() as {
      lidJid: string;
      voterName: string;
      voterId?: string;
      notes?: string;
    };

    if (!body.lidJid || !body.voterName?.trim()) {
      return NextResponse.json({ error: 'lidJid e voterName são obrigatórios' }, { status: 400 });
    }

    await upsertLidManualMapping(
      groupJid,
      body.lidJid,
      body.voterName.trim(),
      body.voterId,
      body.notes?.trim(),
      auth.actor.name,
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/groups/[id]/members/lid-mapping] POST error:', error);
    return NextResponse.json({ error: 'Erro ao salvar mapping' }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[id]/members/lid-mapping
 * Remove manual @lid → voterName mapping for this group.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Sem permissão para editar mappings');
  if (auth.response) return auth.response;

  try {
    const { id: groupJid } = await params;
    const body = await request.json() as { lidJid: string };

    if (!body.lidJid) {
      return NextResponse.json({ error: 'lidJid é obrigatório' }, { status: 400 });
    }

    await deleteLidMapping(groupJid, body.lidJid);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/groups/[id]/members/lid-mapping] DELETE error:', error);
    return NextResponse.json({ error: 'Erro ao remover mapping' }, { status: 500 });
  }
}
