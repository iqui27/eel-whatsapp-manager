import { NextRequest, NextResponse } from 'next/server';
import { getGroupById } from '@/lib/db-groups';
import { loadChips } from '@/lib/db-chips';
import { loadConfig } from '@/lib/db-config';
import { fetchGroupParticipants } from '@/lib/evolution';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { voters } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { normalizePhone } from '@/lib/phone';

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

    // Batch voter name lookup with dual-format phone support (Brazilian 9th-digit variation)
    // Filter to phone JIDs only (skip @lid — already stripped to raw digits without @s.whatsapp.net guard)
    const normalizedPhones = participants
      .filter(p => p.id.endsWith('@s.whatsapp.net'))
      .map(p => normalizePhone(p.phone))
      .filter((p): p is string => Boolean(p));

    // Build dual-format list: for each 12-digit number (55 + DDD + 8 digits),
    // also generate the 13-digit variant by inserting '9' after the DDD (position 4).
    // Example: '5511XXXXXXXX' (12) → '55119XXXXXXXX' (13)
    const normalizedPhonesWithNine = normalizedPhones
      .filter(p => p.length === 12)
      .map(p => p.slice(0, 4) + '9' + p.slice(4));

    // Union of both formats for the DB query
    const allPhoneVariants = [...new Set([...normalizedPhones, ...normalizedPhonesWithNine])];

    const voterRows = allPhoneVariants.length > 0
      ? await db
          .select({ phone: voters.phone, name: voters.name })
          .from(voters)
          .where(inArray(voters.phone, allPhoneVariants))
      : [];

    // Index by phone — include BOTH key variants pointing to the same voter name
    // so that lookup works regardless of which format the participant JID produced
    const nameByPhone: Record<string, string> = {};
    for (const v of voterRows) {
      nameByPhone[v.phone] = v.name;
      // If the DB record is 13-digit, also register the 12-digit key (drop the 9 at position 4)
      if (v.phone.length === 13) {
        const without9 = v.phone.slice(0, 4) + v.phone.slice(5);
        nameByPhone[without9] = v.name;
      }
      // If the DB record is 12-digit, also register the 13-digit key
      if (v.phone.length === 12) {
        const with9 = v.phone.slice(0, 4) + '9' + v.phone.slice(4);
        nameByPhone[with9] = v.name;
      }
    }

    // Enrich each participant with voter name (null if no match)
    const enriched = participants.map(p => {
      const norm = normalizePhone(p.phone);
      return {
        ...p,
        voterName: nameByPhone[norm] ?? null,
      };
    });

    return NextResponse.json({ participants: enriched });
  } catch (error) {
    console.error('[api/groups/[id]/members] GET error:', error);
    return NextResponse.json({ error: 'Erro ao buscar membros' }, { status: 500 });
  }
}
