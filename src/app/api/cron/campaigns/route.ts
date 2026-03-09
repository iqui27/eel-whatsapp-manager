import { NextRequest, NextResponse } from 'next/server';
import {
  addCampaignDeliveryEvent,
  claimScheduledCampaign,
  getDueScheduledCampaigns,
  updateCampaign,
} from '@/lib/db-campaigns';
import { executeCampaignSend } from '@/lib/campaign-delivery';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const dueCampaigns = await getDueScheduledCampaigns();
  let claimed = 0;
  let completed = 0;
  let failed = 0;

  const results: Array<Record<string, unknown>> = [];

  for (const campaign of dueCampaigns) {
    const claimedCampaign = await claimScheduledCampaign(campaign.id);
    if (!claimedCampaign) {
      continue;
    }

    claimed += 1;

    await addCampaignDeliveryEvent({
      campaignId: claimedCampaign.id,
      chipId: claimedCampaign.chipId ?? null,
      eventType: 'scheduled_claimed',
      message: 'Agendamento reivindicado pelo dispatcher',
      metadata: {
        scheduledAt: claimedCampaign.scheduledAt?.toISOString() ?? null,
      },
    });

    try {
      const result = await executeCampaignSend({
        campaignId: claimedCampaign.id,
        skipScheduleGuard: true,
      });
      completed += 1;
      results.push(result);
    } catch (error) {
      failed += 1;
      await updateCampaign(claimedCampaign.id, {
        status: 'paused',
      });
      await addCampaignDeliveryEvent({
        campaignId: claimedCampaign.id,
        chipId: claimedCampaign.chipId ?? null,
        eventType: 'send_failed',
        message: 'Agendamento pausado por erro antes do envio',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      results.push({
        campaignId: claimedCampaign.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    scanned: dueCampaigns.length,
    claimed,
    completed,
    failed,
    results,
  });
}
