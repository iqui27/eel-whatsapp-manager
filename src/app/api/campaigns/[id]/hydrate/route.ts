import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { getCampaign, hydrateCampaignToQueue, updateCampaign } from '@/lib/db-campaigns';
import { type VariationOptions } from '@/lib/message-variation';

/**
 * POST /api/campaigns/[id]/hydrate
 * 
 * Manually hydrate a campaign to the message queue.
 * Used for:
 * - Starting a draft campaign
 * - Re-hydrating a paused campaign
 * 
 * Body: { variationOptions?: VariationOptions }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'campaigns.manage', 'Seu operador não pode gerenciar campanhas');
  if (auth.response) return auth.response;

  const { id } = await params;

  // Load campaign
  const campaign = await getCampaign(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }

  // Check status (only draft, scheduled, or paused can be hydrated)
  if (!['draft', 'scheduled', 'paused'].includes(campaign.status ?? '')) {
    return NextResponse.json({
      error: 'Campanha não pode ser hidratada',
      details: `Status atual: ${campaign.status}. Apenas campanhas em rascunho, agendadas ou pausadas podem ser hidratadas.`,
    }, { status: 400 });
  }

  // Parse body for variation options
  let variationOptions: VariationOptions | undefined;
  try {
    const body = await request.json();
    variationOptions = body.variationOptions;
  } catch {
    // No body, use defaults
  }

  // Hydrate to queue
  const result = await hydrateCampaignToQueue(id, { variationOptions });

  if (result.errors.length > 0) {
    return NextResponse.json({
      error: 'Erro ao hidratar campanha',
      details: result.errors,
    }, { status: 400 });
  }

  // Update campaign status to 'sending' if it was draft or scheduled
  if (campaign.status !== 'paused') {
    await updateCampaign(id, { status: 'sending' });
  }

  return NextResponse.json({
    success: true,
    campaignId: result.campaignId,
    campaignName: result.campaignName,
    totalVoters: result.totalVoters,
    enqueued: result.enqueued,
    skipped: result.skipped,
  });
}