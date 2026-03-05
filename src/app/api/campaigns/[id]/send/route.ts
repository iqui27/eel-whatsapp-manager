import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, voters, chips, type Voter } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { validateSession } from '@/lib/db-auth';
import { loadConfig } from '@/lib/db-config';
import { getSegmentVoterIds } from '@/lib/db-segments';
import { sendText } from '@/lib/evolution';

function templateMessage(template: string, voter: Voter): string {
  const interesse = voter.tags?.[0] ?? '';
  return template
    .replaceAll('{nome}', voter.name ?? '')
    .replaceAll('{bairro}', voter.neighborhood ?? '')
    .replaceAll('{zona}', voter.zone ?? '')
    .replaceAll('{secao}', voter.section ?? '')
    .replaceAll('{interesse}', interesse);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { chipId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });

  try {
    // Fetch campaign to confirm it exists
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!campaign.segmentId) {
      return NextResponse.json({ error: 'Campanha sem segmento definido' }, { status: 400 });
    }

    if (campaign.scheduledAt && new Date(campaign.scheduledAt) > new Date()) {
      return NextResponse.json(
        { error: `Campanha agendada para ${new Date(campaign.scheduledAt).toISOString()}` },
        { status: 400 },
      );
    }

    const config = await loadConfig();
    if (!config) {
      return NextResponse.json({ error: 'Sistema não configurado' }, { status: 400 });
    }

    const voterIds = await getSegmentVoterIds(campaign.segmentId);
    if (voterIds.length === 0) {
      return NextResponse.json({ error: 'Segmento sem eleitores para envio' }, { status: 400 });
    }

    const segmentVoters = await db.select().from(voters).where(inArray(voters.id, voterIds));

    let selectedChip = null;

    if (body.chipId) {
      const chipCandidates = await db
        .select()
        .from(chips)
        .where(
          and(
            eq(chips.status, 'connected'),
            inArray(chips.id, [body.chipId]),
          ),
        )
        .limit(1);

      if (chipCandidates[0]) {
        selectedChip = chipCandidates[0];
      } else {
        const byName = await db
          .select()
          .from(chips)
          .where(eq(chips.status, 'connected'));
        selectedChip = byName.find((c) => c.instanceName === body.chipId || c.name === body.chipId) ?? null;
      }
    }

    if (!selectedChip) {
      const [firstConnected] = await db
        .select()
        .from(chips)
        .where(eq(chips.status, 'connected'))
        .limit(1);
      selectedChip = firstConnected ?? null;
    }

    if (!selectedChip) {
      return NextResponse.json({ error: 'Nenhum chip conectado disponível' }, { status: 400 });
    }

    const chipInstanceName = selectedChip.instanceName || selectedChip.name;

    // Set status to sending + initialize stats
    await db
      .update(campaigns)
      .set({
        status: 'sending',
        totalSent: voterIds.length,
        totalDelivered: 0,
        totalFailed: 0,
        totalReplied: 0,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));

    // Run send asynchronously after returning HTTP response
    setTimeout(async () => {
      try {
        let sent = 0;
        let delivered = 0;
        let failed = 0;

        for (const voter of segmentVoters) {
          try {
            const phone = voter.phone?.replace(/\D/g, '');
            if (!phone) {
              failed += 1;
              continue;
            }

            const text = templateMessage(campaign.template, voter);
            if (!text.trim()) {
              failed += 1;
              continue;
            }

            sent += 1;
            await sendText(
              config.evolutionApiUrl,
              config.evolutionApiKey,
              chipInstanceName,
              phone,
              text,
            );
            delivered += 1;
          } catch {
            failed += 1;
          }

          await sleep(200);
        }

        await db
          .update(campaigns)
          .set({
            status: 'sent',
            totalSent: sent,
            totalDelivered: delivered,
            totalFailed: failed,
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, id));
      } catch {
        // background task — swallow error
      }
    }, 0);

    return NextResponse.json({ campaignId: id, status: 'sending', audience: voterIds.length });
  } catch (err) {
    console.error('[send campaign]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
