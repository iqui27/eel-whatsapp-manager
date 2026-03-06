/**
 * Campaigns data access — Drizzle / Supabase
 * Electoral campaign management with A/B testing and delivery stats.
 */
import { db } from '@/db';
import {
  campaigns,
  campaignDeliveryEvents,
  type Campaign, type NewCampaign,
  type CampaignDeliveryEvent,
  type NewCampaignDeliveryEvent,
} from '@/db/schema';
import { and, asc, desc, eq, lte, sql } from 'drizzle-orm';

export type { Campaign, NewCampaign, CampaignDeliveryEvent, NewCampaignDeliveryEvent };

export async function loadCampaigns(): Promise<Campaign[]> {
  return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
}

export async function getCampaign(id: string): Promise<Campaign | undefined> {
  const rows = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0];
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
