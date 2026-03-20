/**
 * Campaigns data access — Drizzle / Supabase
 * Electoral campaign management with A/B testing and delivery stats.
 * 
 * Phase 21-02: Enhanced with segment-based group resolution
 */
import { db } from '@/db';
import {
  campaigns,
  campaignDeliveryEvents,
  voters,
  segments,
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
import { 
  resolveCampaignVariables, 
  resolveGroupLinkForSegment,
  clearCampaignGroupCache,
  type ResolvedTemplate 
} from './campaign-groups';

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

// ─── Valid status transitions ──────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft:     ['scheduled', 'cancelled'],
  scheduled: ['sending', 'paused', 'cancelled'],
  sending:   ['paused', 'sent'],
  paused:    ['scheduled', 'sending', 'cancelled'],
  // Terminal states — no outbound transitions
  sent:      [],
  cancelled: [],
};

/**
 * Validate and apply a campaign status transition.
 * Saves previousStatus before pause so resume can go back.
 * Returns the updated campaign or throws with an error message.
 */
export async function updateCampaignStatus(
  id: string,
  newStatus: string,
): Promise<Campaign> {
  const campaign = await getCampaign(id);
  if (!campaign) {
    throw new Error('Campanha não encontrada');
  }

  const fromStatus = campaign.status ?? 'draft';
  const allowed = VALID_TRANSITIONS[fromStatus] ?? [];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Transição inválida: ${fromStatus} → ${newStatus}. Permitidas: ${allowed.join(', ') || 'nenhuma'}`,
    );
  }

  const updates: Partial<Omit<NewCampaign, 'id' | 'createdAt'>> = {
    status: newStatus as Campaign['status'],
  };

  const updated = await updateCampaign(id, updates);
  if (!updated) {
    throw new Error('Falha ao atualizar campanha');
  }
  return updated;
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
  warnings: string[];
  groupResolved: boolean;
  groupId: string | null;
  chipId: string | null;
}

/**
 * Hydrate a campaign to the message queue.
 * 
 * Phase 21-02: Enhanced with segment-based group resolution
 * 
 * 1. Load campaign and its segment (including segmentTag)
 * 2. Resolve segment to get all voter IDs
 * 3. Resolve group link for segment (with caching)
 * 4. Load voter data for each ID
 * 5. For each voter:
 *    a. Resolve template variables with voter data
 *    b. Apply message variations
 *    c. Create queue entry with resolved message
 * 6. Batch insert into message_queue
 * 7. Track group assignment in delivery events
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
    warnings: [],
    groupResolved: false,
    groupId: null,
    chipId: null,
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

  // 2.5. Load segment to get segmentTag
  const [segment] = await db
    .select()
    .from(segments)
    .where(eq(segments.id, campaign.segmentId))
    .limit(1);
  
  const segmentTag = segment?.segmentTag ?? null;

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

  // 4.5. Resolve group invite link for segment (with caching)
  // This uses the segmentTag to find/create the appropriate group
  let resolvedGroup: {
    inviteUrl: string;
    groupId: string;
    chipId: string | null;
  } | null = null;
  
  if (campaign.template.includes('{link_grupo}') && segmentTag) {
    resolvedGroup = await resolveGroupLinkForSegment(segmentTag, campaignId);
    
    if (!resolvedGroup) {
      const warning = `Nenhum grupo encontrado para o segmento ${segmentTag} - verifique se há chips disponíveis`;
      result.warnings.push(warning);
      console.warn('[hydrateCampaignToQueue]', warning);
      
      // Log warning event
      await addCampaignDeliveryEvent({
        campaignId,
        chipId: null,
        eventType: 'group_resolution_warning',
        message: warning,
        metadata: { segmentTag },
      });
    } else {
      result.groupResolved = true;
      result.groupId = resolvedGroup.groupId;
      result.chipId = resolvedGroup.chipId;
      
      // Log successful group resolution
      await addCampaignDeliveryEvent({
        campaignId,
        chipId: resolvedGroup.chipId,
        eventType: 'group_resolved',
        message: `Grupo resolvido para segmento ${segmentTag}`,
        metadata: {
          segmentTag,
          groupId: resolvedGroup.groupId,
          inviteUrl: resolvedGroup.inviteUrl,
        },
      });
    }
  } else if (campaign.template.includes('{link_grupo}') && !segmentTag) {
    const warning = 'Template contém {link_grupo} mas o segmento não possui tag definida';
    result.warnings.push(warning);
    console.warn('[hydrateCampaignToQueue]', warning);
    
    await addCampaignDeliveryEvent({
      campaignId,
      chipId: null,
      eventType: 'segment_tag_missing',
      message: warning,
      metadata: { segmentId: campaign.segmentId },
    });
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
        groupInviteLink: resolvedGroup?.inviteUrl ?? '',
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
