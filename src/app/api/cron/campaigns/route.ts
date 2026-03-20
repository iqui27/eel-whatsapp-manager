import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import {
  addCampaignDeliveryEvent,
  claimScheduledCampaign,
  getDueScheduledCampaigns,
  hydrateCampaignToQueue,
  updateCampaign,
} from '@/lib/db-campaigns';
import { isLocalInternalRequest, readCronToken, resolveServerEnv } from '@/lib/server-env';
import { withCronLock } from '@/lib/cron-lock';
import { syslog } from '@/lib/system-logger';

export const maxDuration = 60;

/**
 * GET /api/cron/campaigns
 * 
 * Campaign scheduler cron.
 * 
 * OLD BEHAVIOR (Phase 09): Found scheduled campaigns and sent them directly.
 * NEW BEHAVIOR (Phase 15): Finds scheduled campaigns, hydrates to queue.
 * 
 * This separates concerns:
 * - Campaign cron: hydration + status management
 * - Send-queue cron: actual message delivery with rate limiting
 * 
 * Triggered every ~1-5 minutes.
 */
export async function GET(request: NextRequest) {
  const cronSecret = resolveServerEnv('CRON_SECRET');
  const requestToken = readCronToken(request);
  const authorizedBySecret = Boolean(cronSecret) && requestToken === cronSecret;
  const authorizedByLoopback = isLocalInternalRequest(request);

  if (!authorizedBySecret && !authorizedByLoopback) {
    const auth = await requirePermission(request, 'campaigns.manage', 'Unauthorized');
    if (auth.response) {
      return auth.response;
    }
  }

  const lockResult = await withCronLock('campaigns', 90000, async () => {
    syslog({ level: 'info', category: 'cron', message: 'campaigns started' });
    const now = new Date();
    const dueCampaigns = await getDueScheduledCampaigns(now);
    
    let claimed = 0;
    let hydrated = 0;
    let failed = 0;

    const results: Array<{
      campaignId: string;
      name: string;
      status: 'hydrated' | 'failed';
      enqueued?: number;
      error?: string;
    }> = [];

    for (const campaign of dueCampaigns) {
      // Claim the campaign (atomic status change)
      const claimedCampaign = await claimScheduledCampaign(campaign.id);
      if (!claimedCampaign) {
        continue; // Already claimed by another process
      }

      claimed += 1;

      // Log claim event
      await addCampaignDeliveryEvent({
        campaignId: claimedCampaign.id,
        chipId: claimedCampaign.chipId ?? null,
        eventType: 'scheduled_claimed',
        message: 'Agendamento reivindicado para hidratação',
        metadata: {
          scheduledAt: claimedCampaign.scheduledAt?.toISOString() ?? null,
        },
      });

      try {
        // Hydrate to queue (this resolves variables, applies variations, enqueues)
        const hydrationResult = await hydrateCampaignToQueue(claimedCampaign.id);

        if (hydrationResult.errors.length > 0) {
          throw new Error(hydrationResult.errors.join('; '));
        }

        // Update status to 'sending' (queue processor will handle delivery)
        await updateCampaign(claimedCampaign.id, { status: 'sending' });

        // Log hydration event
        await addCampaignDeliveryEvent({
          campaignId: claimedCampaign.id,
          chipId: null,
          eventType: 'hydrated',
          message: `Campanha hidratada: ${hydrationResult.enqueued} mensagens enfileiradas`,
          metadata: {
            totalVoters: hydrationResult.totalVoters,
            enqueued: hydrationResult.enqueued,
            skipped: hydrationResult.skipped,
          },
        });

        hydrated += 1;
        results.push({
          campaignId: claimedCampaign.id,
          name: claimedCampaign.name,
          status: 'hydrated',
          enqueued: hydrationResult.enqueued,
        });

      } catch (error) {
        failed += 1;
        
        // Pause the campaign on error
        await updateCampaign(claimedCampaign.id, { status: 'paused' });

        // Log failure event
        await addCampaignDeliveryEvent({
          campaignId: claimedCampaign.id,
          chipId: null,
          eventType: 'hydration_failed',
          message: 'Hidratação falhou, campanha pausada',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
          },
        });

        results.push({
          campaignId: claimedCampaign.id,
          name: claimedCampaign.name,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    syslog({ level: 'info', category: 'cron', message: 'campaigns completed', details: { scanned: dueCampaigns.length, claimed, hydrated, failed } });
    return NextResponse.json({
      timestamp: now.toISOString(),
      scanned: dueCampaigns.length,
      claimed,
      hydrated,
      failed,
      results,
    });
  });

  if (!lockResult.locked) {
    return NextResponse.json({
      message: 'Execução anterior ainda em andamento',
      skipped: true,
    });
  }

  return lockResult.result;
}