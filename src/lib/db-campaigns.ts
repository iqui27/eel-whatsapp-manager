/**
 * Campaigns data access — Drizzle / Supabase
 * Electoral campaign management with A/B testing and delivery stats.
 */
import { db } from '@/db';
import {
  campaigns,
  campaignDeliveryEvents,
  voters,
  type Campaign, type NewCampaign,
  type CampaignDeliveryEvent,
  type NewCampaignDeliveryEvent,
} from '@/db/schema';
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm';
import { getSegmentVoterIds } from './db-segments';
import { enqueueMessages, type NewMessageQueue } from './db-message-queue';
import {
  buildCampaignRuntimeContext,
  resolveCampaignTemplate,
  type CandidateProfileContext,
} from './campaign-variables';
import { applyVariations, type VariationOptions } from './message-variation';
import { loadConfig } from './db-config';
import { resolveGroupInviteVariable } from './campaign-groups';

export type { Campaign, NewCampaign, CampaignDeliveryEvent, NewCampaignDeliveryEvent };

export async function loadCampaigns(): Promise<Campaign[]> {
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0];
}

export async function getCampaignWithDeliveryEvents(
  id: string,
  limit = 100,
): Promise<(Campaign & { deliveryEvents: CampaignDeliveryEvent[] }) | undefined> {
  const campaign = await getCampaign(id);
  if (!campaign) {
    return undefined;
  }

  const deliveryEvents = await listCampaignDeliveryEvents(id, limit);
  return {
    ...campaign,
    deliveryEvents,
  };
}

export async function addCampaign(
  data: Omit<NewCampaign, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Campaign> {
  const rows = await db.insert(campaigns).values(data).returning();
  return rows[0];
}

export async function updateCampaign(
  id: string,
  data: Partial<Omit<NewCampaign, 'id' | 'createdAt'>>,
): Promise<Campaign | undefined> {
  const rows = await db
    .update(campaigns)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();
  return rows[0];
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

type CampaignStatus = NonNullable<Campaign['status']>;

export async function getCampaignsByStatus(status: CampaignStatus): Promise<Campaign[]> {
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.status, status))
    .orderBy(desc(campaigns.createdAt));
}

export async function getDueScheduledCampaigns(now = new Date()): Promise<Campaign[]> {
  return db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, 'scheduled'),
        lte(campaigns.scheduledAt, now),
      ),
    )
    .orderBy(asc(campaigns.scheduledAt), asc(campaigns.createdAt));
}

export async function claimScheduledCampaign(id: string): Promise<Campaign | undefined> {
  const rows = await db
    .update(campaigns)
    .set({
      status: 'sending',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(campaigns.id, id),
        eq(campaigns.status, 'scheduled'),
        lte(campaigns.scheduledAt, sql`now()`),
      ),
    )
    .returning();
  return rows[0];
}

export async function addCampaignDeliveryEvent(
  data: Omit<NewCampaignDeliveryEvent, 'id' | 'createdAt'>,
): Promise<CampaignDeliveryEvent> {
  const rows = await db.insert(campaignDeliveryEvents).values(data).returning();
  return rows[0];
}

export async function listCampaignDeliveryEvents(
  campaignId: string,
  limit = 100,
): Promise<CampaignDeliveryEvent[]> {
  return db
    .select()
    .from(campaignDeliveryEvents)
    .where(eq(campaignDeliveryEvents.campaignId, campaignId))
    .orderBy(desc(campaignDeliveryEvents.createdAt))
    .limit(limit);
}

// ─── Campaign Hydration (Phase 15) ─────────────────────────────────────────────

export interface HydrationResult {
  campaignId: string;
  campaignName: string;
  totalVoters: number;
  enqueued: number;
  skipped: number;
  errors: string[];
}

/**
 * Hydrate a campaign to the message queue.
 * 
 * 1. Load campaign and its segment
 * 2. Resolve segment to get all voter IDs
 * 3. Load voter data for each ID
 * 4. For each voter:
 *    a. Resolve template variables with voter data
 *    b. Apply message variations
 *    c. Create queue entry with resolved message
 * 5. Batch insert into message_queue
 */
export async function hydrateCampaignToQueue(
  campaignId: string,
  options?: {
    variationOptions?: VariationOptions;
    batchSize?: number;
  }
): Promise<HydrationResult> {
  const result: HydrationResult = {
    campaignId,
    campaignName: '',
    totalVoters: 0,
    enqueued: 0,
    skipped: 0,
    errors: [],
  };

  // 1. Load campaign
  const campaign = await getCampaign(campaignId);
  if (!campaign) {
    result.errors.push('Campaign not found');
    return result;
  }
  result.campaignName = campaign.name;

  // 2. Check segment
  if (!campaign.segmentId) {
    result.errors.push('Campaign has no segment assigned');
    return result;
  }

  // 3. Get voter IDs from segment
  const voterIds = await getSegmentVoterIds(campaign.segmentId);
  result.totalVoters = voterIds.length;

  if (voterIds.length === 0) {
    result.errors.push('Segment has no voters');
    return result;
  }

  // 4. Load config for candidate profile
  const config = await loadConfig();
  const candidateProfile: CandidateProfileContext | null = config ? {
    candidateDisplayName: config.candidateDisplayName,
    candidateOffice: config.candidateOffice,
    candidateParty: config.candidateParty,
    candidateRegion: config.candidateRegion,
  } : null;

  // 4.5. Resolve group invite link if template contains {link_grupo}
  let groupInviteLink = '';
  if (campaign.template.includes('{link_grupo}')) {
    groupInviteLink = await resolveGroupInviteVariable(campaignId);
    if (!groupInviteLink) {
      console.warn('[hydrateCampaignToQueue] Template contains {link_grupo} but no group found for campaign', campaignId);
    }
  }

  // 5. Load voter data in batches
  const batchSize = options?.batchSize ?? 100;
  const variationOptions = options?.variationOptions ?? {
    resolveSpintax: true,
    addGreeting: true,
    addEmoji: true,
  };

  const queueMessages: Omit<NewMessageQueue, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  for (let i = 0; i < voterIds.length; i += batchSize) {
    const batchIds = voterIds.slice(i, i + batchSize);

    // Fetch voter data
    const voterRows = await db
      .select()
      .from(voters)
      .where(inArray(voters.id, batchIds));

    for (const voter of voterRows) {
      if (!voter.phone) {
        result.skipped++;
        continue;
      }

      // Build context and resolve template
      const context = buildCampaignRuntimeContext({
        candidateProfile,
        voter,
        scheduledAt: campaign.scheduledAt,
        groupInviteLink,
      });

      // Resolve template variables
      let resolvedMessage = resolveCampaignTemplate(campaign.template, context);

      // Apply variations (spintax, greeting, emoji)
      resolvedMessage = applyVariations(resolvedMessage, variationOptions);

      queueMessages.push({
        campaignId,
        voterId: voter.id,
        voterPhone: voter.phone,
        voterName: voter.name,
        message: campaign.template,
        resolvedMessage,
        status: 'queued',
        priority: 0,
        segmentId: campaign.segmentId,
        retryCount: 0,
      });
    }
  }

  // 6. Batch insert into queue
  if (queueMessages.length > 0) {
    try {
      await enqueueMessages(queueMessages);
      result.enqueued = queueMessages.length;
    } catch (err) {
      result.errors.push(`Failed to enqueue: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return result;
}

/**
 * Get hydration status for a campaign.
 * Returns queue counts by status.
 */
export async function getCampaignHydrationStatus(
  campaignId: string
): Promise<{
  totalQueued: number;
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}> {
  const { getQueueStats } = await import('./db-message-queue');
  const stats = await getQueueStats(campaignId);

  return {
    totalQueued: stats.queued + stats.assigned + stats.sending,
    sent: stats.sent,
    delivered: stats.delivered + stats.read,
    failed: stats.failed,
    pending: stats.queued + stats.assigned + stats.sending + stats.retry,
  };
}
