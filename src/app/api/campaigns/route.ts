import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/db-config';
import { validateSession } from '@/lib/db-auth';
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

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth')?.value;
  if (!await validateSession(token)) {
    return null;
  }
  return await loadConfig();
}

export async function GET(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });
    }
    if (!body.template) body.template = '';
    if (body.chipId === 'auto' || body.chipId === '') {
      body.chipId = null;
    }
    const campaign = await addCampaign(body);
    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('POST campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao adicionar campanha' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const config = await verifyAuth(request);
  if (!config) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    const { id, ...updates } = body;
    if (updates.chipId === 'auto' || updates.chipId === '') {
      updates.chipId = null;
    }
    const campaign = await updateCampaign(id, updates);
    return NextResponse.json(campaign);
  } catch (error) {
    console.error('PUT campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar campanha' }, { status: 500 });
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
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }
    await deleteCampaign(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE campaigns error:', error);
    return NextResponse.json({ error: 'Erro ao deletar campanha' }, { status: 500 });
  }
}
