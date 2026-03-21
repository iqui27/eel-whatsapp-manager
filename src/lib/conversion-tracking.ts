/**
 * Conversion Tracking Helper
 * Phase 17 - Delivery Tracking
 */

import { db } from '@/db';
import { campaigns, conversionEvents, messageQueue, type ConversionEvent, type NewConversionEvent } from '@/db/schema';
import { eq, and, desc, lte, gte, inArray } from 'drizzle-orm';

// ─── Record Conversion Events ──────────────────────────────────────────────────

/** Record a conversion event */
export async function recordConversion(
  campaignId: string,
  voterPhone: string,
  eventType: 'reply' | 'click' | 'group_join' | 'conversion',
  metadata?: Record<string, unknown>,
  voterId?: string,
  groupJid?: string
): Promise<ConversionEvent> {
  const [event] = await db.insert(conversionEvents).values({
    campaignId,
    voterPhone,
    eventType,
    voterId,
    groupJid,
    metadata,
  }).returning();

  return event;
}

/** Record a reply to a campaign */
export async function recordReply(
  campaignId: string,
  voterPhone: string,
  voterId?: string
): Promise<{ event: ConversionEvent; updated: boolean }> {
  // Check if we already recorded a reply from this voter for this campaign
  const existing = await db.select().from(conversionEvents).where(
    and(
      eq(conversionEvents.campaignId, campaignId),
      eq(conversionEvents.voterPhone, voterPhone),
      eq(conversionEvents.eventType, 'reply')
    )
  ).limit(1);

  if (existing.length > 0) {
    return { event: existing[0], updated: false };
  }

  // Create conversion event
  const event = await recordConversion(campaignId, voterPhone, 'reply', undefined, voterId);

  // Increment campaign reply counter
  await db
    .update(campaigns)
    .set({
      totalReplied: sql`${campaigns.totalReplied} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return { event, updated: true };
}

/** Record a group join conversion */
export async function recordGroupJoin(
  campaignId: string,
  voterPhone: string,
  groupJid: string,
  voterId?: string
): Promise<{ event: ConversionEvent; updated: boolean }> {
  // Check if we already recorded this join
  const existing = await db.select().from(conversionEvents).where(
    and(
      eq(conversionEvents.campaignId, campaignId),
      eq(conversionEvents.voterPhone, voterPhone),
      eq(conversionEvents.eventType, 'group_join'),
      eq(conversionEvents.groupJid, groupJid)
    )
  ).limit(1);

  if (existing.length > 0) {
    return { event: existing[0], updated: false };
  }

  // Create conversion event
  const event = await recordConversion(campaignId, voterPhone, 'group_join', { groupJid }, voterId, groupJid);

  // Increment campaign join counter
  await db
    .update(campaigns)
    .set({
      totalJoinedGroup: sql`${campaigns.totalJoinedGroup} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return { event, updated: true };
}

/** Record a click (placeholder for link tracking) */
export async function recordClick(
  campaignId: string,
  voterPhone: string,
  linkUrl?: string,
  voterId?: string
): Promise<ConversionEvent> {
  const event = await recordConversion(campaignId, voterPhone, 'click', { linkUrl }, voterId);

  // Increment campaign click counter
  await db
    .update(campaigns)
    .set({
      totalClicked: sql`${campaigns.totalClicked} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, campaignId));

  return event;
}

// ─── Query Conversion Events ───────────────────────────────────────────────────

/** Get all conversion events for a campaign */
export async function getCampaignConversions(
  campaignId: string,
  limit = 100
): Promise<ConversionEvent[]> {
  return db.select().from(conversionEvents)
    .where(eq(conversionEvents.campaignId, campaignId))
    .orderBy(desc(conversionEvents.createdAt))
    .limit(limit);
}

/** Get conversion events by type */
export async function getConversionsByType(
  campaignId: string,
  eventType: 'reply' | 'click' | 'group_join' | 'conversion'
): Promise<ConversionEvent[]> {
  return db.select().from(conversionEvents).where(
    and(
      eq(conversionEvents.campaignId, campaignId),
      eq(conversionEvents.eventType, eventType)
    )
  ).orderBy(desc(conversionEvents.createdAt));
}

// ─── Conversion Stats ──────────────────────────────────────────────────────────

export interface ConversionStats {
  totalReplies: number;
  totalClicks: number;
  totalGroupJoins: number;
  totalConversions: number;
  replyRate: number;
  clickRate: number;
  joinRate: number;
}

/** Get conversion statistics for a campaign */
export async function getConversionStats(campaignId: string): Promise<ConversionStats> {
  const campaign = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  
  if (!campaign[0]) {
    return {
      totalReplies: 0,
      totalClicks: 0,
      totalGroupJoins: 0,
      totalConversions: 0,
      replyRate: 0,
      clickRate: 0,
      joinRate: 0,
    };
  }

  const c = campaign[0];
  const totalSent = c.totalSent || 0;

  return {
    totalReplies: c.totalReplied || 0,
    totalClicks: c.totalClicked || 0,
    totalGroupJoins: c.totalJoinedGroup || 0,
    totalConversions: c.totalJoinedGroup || 0, // Primary conversion = group join
    replyRate: totalSent > 0 ? ((c.totalReplied || 0) / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? ((c.totalClicked || 0) / totalSent) * 100 : 0,
    joinRate: totalSent > 0 ? ((c.totalJoinedGroup || 0) / totalSent) * 100 : 0,
  };
}

// ─── Message Queue Status Updates ──────────────────────────────────────────────

/** Update message delivery status */
export async function updateMessageDeliveryStatus(
  evolutionMessageId: string,
  status: 'delivered' | 'read' | 'failed',
  failReason?: string
): Promise<{ updated: boolean; campaignId?: string }> {
  // Find the message in the queue
  const [message] = await db.select().from(messageQueue)
    .where(eq(messageQueue.evolutionMessageId, evolutionMessageId))
    .limit(1);

  if (!message) {
    console.warn('[updateMessageDeliveryStatus] Message not found:', evolutionMessageId);
    return { updated: false };
  }

  // Don't update if already at this status or later
  if (status === 'delivered' && message.deliveredAt) {
    return { updated: false, campaignId: message.campaignId ?? undefined };
  }
  if (status === 'read' && message.readAt) {
    return { updated: false, campaignId: message.campaignId ?? undefined };
  }

  // Update message status
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'delivered') {
    updateData.deliveredAt = new Date();
  } else if (status === 'read') {
    updateData.readAt = new Date();
    updateData.deliveredAt = message.deliveredAt || new Date(); // Ensure delivered is set
  } else if (status === 'failed') {
    updateData.failedAt = new Date();
    updateData.failReason = failReason;
  }

  await db.update(messageQueue).set(updateData).where(eq(messageQueue.id, message.id));

  // Update campaign counters
  if (message.campaignId) {
    if (status === 'delivered') {
      await db.update(campaigns)
        .set({ totalDelivered: sql`${campaigns.totalDelivered} + 1`, updatedAt: new Date() })
        .where(eq(campaigns.id, message.campaignId));
    } else if (status === 'read') {
      await db.update(campaigns)
        .set({ totalRead: sql`${campaigns.totalRead} + 1`, updatedAt: new Date() })
        .where(eq(campaigns.id, message.campaignId));
    } else if (status === 'failed') {
      await db.update(campaigns)
        .set({ totalFailed: sql`${campaigns.totalFailed} + 1`, updatedAt: new Date() })
        .where(eq(campaigns.id, message.campaignId));
    }
  }

  return { updated: true, campaignId: message.campaignId ?? undefined };
}

/** Find recent message sent to a phone number (for reply correlation) */
export async function findRecentMessageToPhone(
  phone: string,
  withinDays = 7
): Promise<{ campaignId: string; voterId?: string } | null> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - withinDays);

  const [message] = await db.select().from(messageQueue)
    .where(
      and(
        eq(messageQueue.voterPhone, phone),
        lte(messageQueue.createdAt, new Date()),
        gte(messageQueue.createdAt, cutoff),
        inArray(messageQueue.status, ['sent', 'delivered', 'read'])
      )
    )
    .orderBy(desc(messageQueue.createdAt))
    .limit(1);

  if (!message || !message.campaignId) {
    return null;
  }

  return {
    campaignId: message.campaignId,
    voterId: message.voterId ?? undefined,
  };
}