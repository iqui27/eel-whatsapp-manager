import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { requirePermission } from '@/lib/api-auth';
import {
  loadCampaigns,
  getCampaign,
  getCampaignWithDeliveryEvents,
  addCampaign,
  updateCampaign,
  updateCampaignStatus,
  deleteCampaign,
  getCampaignsByStatus,
} from '@/lib/db-campaigns';
import type { Campaign } from '@/db/schema';
import { getTemplateValidationMessage, validateCampaignTemplates } from '@/lib/campaign-variables';
import { db, chips, messageQueue } from '@/db';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { syslogInfo, syslogError } from '@/lib/system-logger';

// ─── Warm-up stage helper ─────────────────────────────────────────────────────

function getWarmupStage(createdAt: Date | null | undefined): {
  stage: string;
  recommendedDailyMax: number;
} {
  if (!createdAt) return { stage: 'Fase 4 — Maduro', recommendedDailyMax: 350 };
  const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysSince <= 3)  return { stage: 'Fase 1 — Aquecimento Inicial', recommendedDailyMax: 20 };
  if (daysSince <= 7)  return { stage: 'Fase 2 — Acelerando', recommendedDailyMax: 50 };
  if (daysSince <= 30) return { stage: 'Fase 3 — Ativo', recommendedDailyMax: 200 };
  if (daysSince <= 90) return { stage: 'Fase 4 — Maduro', recommendedDailyMax: 350 };
  return { stage: 'Fase 5 — Veterano', recommendedDailyMax: 500 };
}

// ─── Chip stats enrichment ────────────────────────────────────────────────────

interface ChipStat {
  chipId: string;
  chipName: string;
  healthStatus: string;
  warmupStage: string;
  recommendedDailyMax: number;
  messagesSentToday: number;
  messagesSentThisHour: number;
  dailyLimit: number;
  hourlyLimit: number;
  errorRate: number;       // 0-100 percentage
  hasProxy: boolean;
  sentForCampaign: number; // Total sent for THIS campaign via this chip
}

async function buildChipStats(campaign: Campaign): Promise<{
  chipStats: ChipStat[];
  circuitBreakerStatus: 'active' | 'tripped' | 'disabled';
}> {
  // Determine which chips to show
  const selectedIds = Array.isArray(campaign.selectedChipIds) && campaign.selectedChipIds.length > 0
    ? campaign.selectedChipIds
    : null;

  const chipRows = selectedIds
    ? await db.select().from(chips).where(inArray(chips.id, selectedIds))
    : await db.select().from(chips).where(eq(chips.enabled, true));

  if (chipRows.length === 0) {
    const cbStatus = !campaign.circuitBreakerThreshold
      ? 'disabled'
      : campaign.status === 'paused'
        ? 'tripped'
        : 'active';
    return { chipStats: [], circuitBreakerStatus: cbStatus };
  }

  const chipIds = chipRows.map((c) => c.id);

  // Query per-chip error rates and sent count for this campaign
  type QueueCountRow = { chipId: string | null; total: number; failed: number; sentForCampaign: number };
  const queueCounts: QueueCountRow[] = await db.execute(sql`
    SELECT
      chip_id as "chipId",
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status IN ('sent', 'delivered', 'read')) as "sentForCampaign"
    FROM message_queue
    WHERE campaign_id = ${campaign.id}
      AND chip_id = ANY(${sql`ARRAY[${sql.join(chipIds.map((id) => sql`${id}::uuid`), sql`, `)}]`})
    GROUP BY chip_id
  `) as unknown as QueueCountRow[];

  const queueMap = new Map<string, QueueCountRow>();
  for (const row of queueCounts) {
    if (row.chipId) queueMap.set(row.chipId, row);
  }

  const chipStats: ChipStat[] = chipRows.map((chip) => {
    const q = queueMap.get(chip.id);
    const total = q ? Number(q.total) : 0;
    const failed = q ? Number(q.failed) : 0;
    const sentForCampaign = q ? Number(q.sentForCampaign) : 0;
    const errorRate = total > 0 ? Math.round((failed / total) * 100) : 0;
    const { stage, recommendedDailyMax } = getWarmupStage(chip.createdAt);
    return {
      chipId: chip.id,
      chipName: chip.name,
      healthStatus: chip.healthStatus ?? 'disconnected',
      warmupStage: stage,
      recommendedDailyMax,
      messagesSentToday: chip.messagesSentToday ?? 0,
      messagesSentThisHour: chip.messagesSentThisHour ?? 0,
      dailyLimit: chip.dailyLimit ?? 200,
      hourlyLimit: chip.hourlyLimit ?? 25,
      errorRate,
      hasProxy: !!chip.proxyHost,
      sentForCampaign,
    };
  });

  const circuitBreakerStatus: 'active' | 'tripped' | 'disabled' = !campaign.circuitBreakerThreshold
    ? 'disabled'
    : campaign.status === 'paused'
      ? 'tripped'
      : 'active';

  return { chipStats, circuitBreakerStatus };
}

function normalizeCampaignChipId(chipId: unknown) {
  return chipId === 'auto' || chipId === '' ? null : chipId;
}

function buildTemplateValidationError(
  templates: Array<string | null | undefined>,
  config: NonNullable<Awaited<ReturnType<typeof loadConfig>>>,
) {
  const validation = validateCampaignTemplates(templates, {
    candidateProfile: config,
    hasVoterData: true,
  });
  const message = getTemplateValidationMessage(validation);

  if (message) {
    return {
      error: message,
      validation,
    };
  }

  return {
    validation,
    error: null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.view', 'Seu operador não pode visualizar campanhas');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const id = searchParams.get('id');
  const include = searchParams.get('include');

  try {
    if (id) {
      const campaign = include === 'deliveryEvents'
        ? await getCampaignWithDeliveryEvents(id)
        : await getCampaign(id);
      if (!campaign) {
        return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
      }
      // Enrich single-campaign response with chip anti-ban stats
      const { chipStats, circuitBreakerStatus } = await buildChipStats(campaign);
      return NextResponse.json([{ ...campaign, chipStats, circuitBreakerStatus }]);
    }
    const data = status
      ? await getCampaignsByStatus(status as NonNullable<Campaign['status']>)
      : await loadCampaigns();
    return NextResponse.json(data);
  } catch (error) {
    console.error('GET campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao carregar campanhas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode criar campanhas');
  if (auth.response) return auth.response;
  const config = await loadConfig();
  if (!config) {
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });
    }
    if (!body.template) body.template = '';
    body.chipId = normalizeCampaignChipId(body.chipId);

    const { validation, error } = buildTemplateValidationError(
      [body.template, body.abEnabled ? body.abVariantB ?? '' : ''],
      config,
    );
    if (error) {
      return NextResponse.json({ error, validation }, { status: 400 });
    }

    body.variables = validation.supportedVariables;

    const campaign = await addCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('POST campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar campanha' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode editar campanhas');
  if (auth.response) return auth.response;
  const config = await loadConfig();
  if (!config) {
    return NextResponse.json({ error: 'Configuração ausente' }, { status: 400 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const { id, ...updates } = body;
    const existingCampaign = await getCampaign(id);
    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // ─── Status-only transitions (activate / pause / resume) ──────────────
    // If only status is being updated, validate transition and skip template checks
    const updateKeys = Object.keys(updates);
    if (updateKeys.length === 1 && updateKeys[0] === 'status') {
      const newStatus = updates.status as string;
      const oldStatus = existingCampaign.status ?? 'draft';
      try {
        const updated = await updateCampaignStatus(id, newStatus);
        syslogInfo('campaign', 'Campaign status changed', {
          campaignId: id,
          campaignName: existingCampaign.name,
          from: oldStatus,
          to: newStatus,
        });
        return NextResponse.json(updated);
      } catch (transitionErr) {
        const msg = transitionErr instanceof Error ? transitionErr.message : 'Transição inválida';
        syslogError('campaign', 'Invalid campaign status transition', {
          campaignId: id,
          from: oldStatus,
          to: newStatus,
          error: msg,
        });
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    // ─── Full campaign update (template, config, etc.) ─────────────────────
    updates.chipId = normalizeCampaignChipId(updates.chipId);

    const nextAbEnabled = typeof updates.abEnabled === 'boolean'
      ? updates.abEnabled
      : Boolean(existingCampaign.abEnabled);
    const template = typeof updates.template === 'string'
      ? updates.template
      : existingCampaign.template ?? '';
    const variantB = nextAbEnabled
      ? (typeof updates.abVariantB === 'string' ? updates.abVariantB : existingCampaign.abVariantB ?? '')
      : '';
    const { validation, error } = buildTemplateValidationError([template, variantB], config);

    if (error) {
      return NextResponse.json({ error, validation }, { status: 400 });
    }

    updates.variables = validation.supportedVariables;

    const campaign = await updateCampaign(id, updates);
    return NextResponse.json(campaign);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('PUT campaigns error:', error);
    syslogError('campaign', `Erro ao atualizar campanha: ${msg}`, { error: msg });
    return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode remover campanhas');
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao deletar campanha' }, { status: 500 });
  }
}
