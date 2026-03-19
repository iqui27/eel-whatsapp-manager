import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/lib/db-groups';
import { loadChips } from '@/lib/db-chips';
import { loadConfig } from '@/lib/db-config';
import { fetchGroupParticipants } from '@/lib/evolution';
import { requirePermission } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/groups/[id]/members
 * Fetch live participant list from Evolution API for this group.
 * Returns: { participants: Array<{ id: string; admin: string | null; phone: string }> }
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'campaigns.view', 'Sem permissão');
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
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

    const result = await fetchGroupParticipants(
      config.evolutionApiUrl,
      config.evolutionApiKey,
      instanceName,
      group.groupJid,
    );

    // Enrich with clean phone number
    const participants = (result.participants ?? []).map((p) => ({
      id: p.id,
      admin: p.admin,
      phone: p.id.replace('@s.whatsapp.net', '').replace(/\D/g, ''),
    }));

    return NextResponse.json({ participants });
  } catch (error) {
    console.error('[api/groups/[id]/members] GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar membros' }, { status: 500 });
  }
}
