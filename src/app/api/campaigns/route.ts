import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { requirePermission } from '@/lib/api-auth';
import {
  loadCampaigns,
  getCampaign,
  getCampaignWithDeliveryEvents,
  addCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignsByStatus,
} from '@/lib/db-campaigns';
import type { Campaign } from '@/db/schema';
import { getTemplateValidationMessage, validateCampaignTemplates } from '@/lib/campaign-variables';

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
      return campaign
        ? NextResponse.json([campaign])
        : NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
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
    console.error('PUT campaigns error:', error);
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
