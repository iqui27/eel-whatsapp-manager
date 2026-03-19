import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/lib/db-groups';
import { loadChips } from '@/lib/db-chips';
import { loadConfig } from '@/lib/db-config';
import { sendText } from '@/lib/evolution';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { groupMessages } from '@/db/schema';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/groups/[id]/message
 * Send a text message to the WhatsApp group.
 * Body: { text: string }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Sem permissão para enviar mensagens');
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json() as { text?: string };

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'Texto da mensagem é obrigatório' }, { status: 400 });
    }

    const group = await getGroupById(id);
    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }
    if (!group.groupJid) {
      return NextResponse.json({ error: 'Grupo sem JID configurado' }, { status: 400 });
    }

    const config = await loadConfig();
    if (!config?.evolutionApiUrl || !config.evolutionApiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 500 });
    }

    const chips = await loadChips();
    const chip = chips.find((c) => c.id === group.chipId);
    const instanceName = chip?.instanceName ?? chip?.name ?? group.chipInstanceName;
    if (!instanceName) {
      return NextResponse.json({ error: 'Chip do grupo não encontrado' }, { status: 400 });
    }

    // Send via Evolution API
    const sent = await sendText(
      config.evolutionApiUrl,
      config.evolutionApiKey,
      instanceName,
      group.groupJid,
      body.text.trim(),
      { delay: 1000 },
    );

    // Persist to group_messages
    try {
      await db.insert(groupMessages).values({
        groupId: group.id,
        groupJid: group.groupJid,
        senderJid: null,
        senderName: 'Operador',
        text: body.text.trim(),
        fromMe: true,
        evolutionMessageId: (sent as { key?: { id?: string } })?.key?.id ?? null,
      });
    } catch (dbErr) {
      console.error('[api/groups/[id]/message] Failed to persist message:', dbErr);
      // Don't fail the response — message was sent
    }

    return NextResponse.json({ success: true, messageId: (sent as { key?: { id?: string } })?.key?.id });
  } catch (error) {
    console.error('[api/groups/[id]/message] POST error:', error);
    return NextResponse.json({ error: 'Erro ao enviar mensagem' }, { status: 500 });
  }
}
