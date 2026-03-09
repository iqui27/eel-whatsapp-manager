import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { executeCampaignSend, getDeliveryErrorStatus } from '@/lib/campaign-delivery';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requirePermission(req, 'campaigns.manage', 'Seu operador não pode disparar campanhas');
  if (auth.response) return auth.response;

  let body: { chipId?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing campaign id' }, { status: 400 });
  }

  try {
    const requestedChipId = body.chipId && body.chipId !== 'auto' ? body.chipId : null;
    const result = await executeCampaignSend({
      campaignId: id,
      requestedChipId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[send campaign]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: getDeliveryErrorStatus(error) },
    );
  }
}
