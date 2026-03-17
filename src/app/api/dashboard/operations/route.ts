import { NextResponse } from 'next/server';
import { db } from '@/db';
import { chips, campaigns, messageQueue, whatsappGroups } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/operations
 * Get operations dashboard data: chips, campaigns, alerts
 */
export async function GET() {
  try {
    // Get chips with health data
    const allChips = await db.select().from(chips).where(eq(chips.enabled, true));

    // Get active/sending campaigns
    const activeCampaigns = await db.select().from(campaigns).where(
      sql`${campaigns.status} IN ('sending', 'scheduled')`
    );

    // Get queue stats for each campaign
    const campaignIds = activeCampaigns.map(c => c.id);
    
    type QueueStats = {
      campaignId: string | null;
      queued: string;
      sending: string;
      sent: string;
      delivered: string;
      failed: string;
    };
    
    let queueStats: QueueStats[] = [];
    if (campaignIds.length > 0) {
      queueStats = await db
        .select({
          campaignId: messageQueue.campaignId,
          queued: sql<string>`count(*) filter (where ${messageQueue.status} = 'queued')`,
          sending: sql<string>`count(*) filter (where ${messageQueue.status} = 'sending')`,
          sent: sql<string>`count(*) filter (where ${messageQueue.status} = 'sent')`,
          delivered: sql<string>`count(*) filter (where ${messageQueue.status} = 'delivered')`,
          failed: sql<string>`count(*) filter (where ${messageQueue.status} = 'failed')`,
        })
        .from(messageQueue)
        .where(sql`${messageQueue.campaignId} IN ${campaignIds}`)
        .groupBy(messageQueue.campaignId);
    }

    // Map queue stats to campaigns (filter out null campaignIds)
    const statsMap = new Map(
      queueStats.filter(s => s.campaignId).map(s => [s.campaignId as string, s])
    );
    
    const campaignsProgress = activeCampaigns.map(c => {
      const stats = statsMap.get(c.id);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        totalSent: c.totalSent || 0,
        totalDelivered: c.totalDelivered || 0,
        totalRead: c.totalRead || 0,
        totalFailed: c.totalFailed || 0,
        queued: stats ? parseInt(stats.queued) : 0,
      };
    });

    // Generate alerts
    const alerts = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const chip of allChips) {
      // Disconnected chips
      if (chip.healthStatus === 'disconnected' || chip.healthStatus === 'quarantined') {
        alerts.push({
          id: `chip-disconnected-${chip.id}`,
          type: 'error',
          message: `Chip desconectado ou em quarentena`,
          chipId: chip.id,
          chipName: chip.name,
          createdAt: chip.lastHealthCheck || now,
        });
      }

      // Chips near daily limit
      const usage = chip.dailyLimit > 0 ? (chip.messagesSentToday / chip.dailyLimit) * 100 : 0;
      if (usage >= 80) {
        alerts.push({
          id: `chip-limit-${chip.id}`,
          type: 'warning',
          message: `Chip próximo do limite diário (${Math.round(usage)}%)`,
          chipId: chip.id,
          chipName: chip.name,
          createdAt: now,
        });
      }
    }

    // Check for stalled campaigns
    for (const campaign of activeCampaigns) {
      if (campaign.status === 'sending') {
        // Check if there are pending messages but no recent activity
        const stats = statsMap.get(campaign.id);
        if (stats && parseInt(stats.queued) > 0) {
          alerts.push({
            id: `campaign-stalled-${campaign.id}`,
            type: 'warning',
            message: `Campanha "${campaign.name}" pode estar parada`,
            createdAt: now,
          });
        }
      }
    }

    // Check groups near capacity
    const groupsNearCapacity = await db.select().from(whatsappGroups).where(
      and(
        eq(whatsappGroups.status, 'active'),
        sql`${whatsappGroups.currentSize} >= ${whatsappGroups.maxSize} * 0.9`
      )
    );

    for (const group of groupsNearCapacity) {
      const pct = Math.round((group.currentSize / group.maxSize) * 100);
      alerts.push({
        id: `group-capacity-${group.id}`,
        type: 'warning',
        message: `Grupo "${group.name}" próximo da capacidade (${pct}%)`,
        createdAt: now,
      });
    }

    // Sort alerts by type (errors first) then by createdAt
    alerts.sort((a, b) => {
      if (a.type === 'error' && b.type !== 'error') return -1;
      if (a.type !== 'error' && b.type === 'error') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      chips: allChips.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        healthStatus: c.healthStatus,
        messagesSentToday: c.messagesSentToday,
        dailyLimit: c.dailyLimit,
        lastWebhookEvent: c.lastWebhookEvent,
        lastHealthCheck: c.lastHealthCheck,
      })),
      campaigns: campaignsProgress,
      alerts: alerts.slice(0, 10), // Limit to 10 alerts
    });
  } catch (error) {
    console.error('[api/dashboard/operations] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load operations data' },
      { status: 500 }
    );
  }
}