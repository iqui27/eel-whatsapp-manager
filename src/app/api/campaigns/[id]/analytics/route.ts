import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, campaignDeliveryEvents, chips, messageQueue } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import type { FunnelData } from '../funnel/route';
import { analyzeCampaignPerformance, type CampaignPerformanceAnalysis } from '@/lib/gemini';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ChipBreakdownItem {
  chipId: string | null;
  chipName: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  failureRate: number;
}

interface Alert {
  type: 'warning' | 'error';
  message: string;
  chipId?: string;
}

interface AnalyticsData {
  campaign: typeof campaigns.$inferSelect;
  funnel: FunnelData;
  timeline: typeof campaignDeliveryEvents.$inferSelect[];
  chipBreakdown: ChipBreakdownItem[];
  alerts: Alert[];
  ai?: CampaignPerformanceAnalysis;
}

// ─── AI analysis cache ─────────────────────────────────────────────────────────
// Key: `${campaignId}:${totalSent}` — invalidates when stats change
// TTL: 5 minutes

interface AiCacheEntry {
  analysis: CampaignPerformanceAnalysis;
  expiresAt: number;
}

const aiCache = new Map<string, AiCacheEntry>();
const AI_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/campaigns/[id]/analytics
 * Get comprehensive analytics for a campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const wantAi = request.nextUrl.searchParams.get('ai') === 'true';

    // Get campaign
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get funnel data
    const [queueStats] = await db
      .select({
        total: sql<number>`count(*)`,
        sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        read: sql<number>`count(*) filter (where ${messageQueue.status} = 'read')`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
      })
      .from(messageQueue)
      .where(eq(messageQueue.campaignId, id));

    const total = queueStats?.total || 0;
    const sent = queueStats?.sent || 0;
    const delivered = queueStats?.delivered || 0;
    const read = queueStats?.read || 0;
    const failed = queueStats?.failed || 0;

    const funnel: FunnelData = {
      campaignId: id,
      total,
      sent,
      delivered,
      read,
      replied: campaign.totalReplied || 0,
      clicked: campaign.totalClicked || 0,
      joinedGroup: campaign.totalJoinedGroup || 0,
      failed,
      percentages: {
        sent: total > 0 ? Math.round((sent / total) * 100) : 0,
        delivered: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        read: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
        replied: sent > 0 ? Math.round(((campaign.totalReplied || 0) / sent) * 100) : 0,
        clicked: sent > 0 ? Math.round(((campaign.totalClicked || 0) / sent) * 100) : 0,
        joinedGroup: sent > 0 ? Math.round(((campaign.totalJoinedGroup || 0) / sent) * 100) : 0,
      },
    };

    // Get timeline events
    const timeline = await db
      .select()
      .from(campaignDeliveryEvents)
      .where(eq(campaignDeliveryEvents.campaignId, id))
      .orderBy(desc(campaignDeliveryEvents.createdAt))
      .limit(100);

    // Get chip breakdown
    const chipStats = await db
      .select({
        chipId: messageQueue.chipId,
        sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
      })
      .from(messageQueue)
      .where(eq(messageQueue.campaignId, id))
      .groupBy(messageQueue.chipId);

    // Get chip names
    const chipIds = chipStats.filter(s => s.chipId).map(s => s.chipId as string);
    const chipRecords = chipIds.length > 0 
      ? await db.select().from(chips).where(sql`${chips.id} in ${chipIds}`)
      : [];

    const chipMap = new Map(chipRecords.map(c => [c.id, c.name]));

    const chipBreakdown: ChipBreakdownItem[] = chipStats.map(stat => ({
      chipId: stat.chipId,
      chipName: stat.chipId ? (chipMap.get(stat.chipId) || 'Unknown') : 'Unassigned',
      sent: stat.sent || 0,
      delivered: stat.delivered || 0,
      failed: stat.failed || 0,
      deliveryRate: stat.sent > 0 ? Math.round(((stat.delivered || 0) / stat.sent) * 100) : 0,
      failureRate: stat.sent > 0 ? Math.round(((stat.failed || 0) / stat.sent) * 100) : 0,
    }));

    // Generate alerts
    const alerts: Alert[] = [];

    // Check for high failure rates
    for (const chip of chipBreakdown) {
      if (chip.failureRate > 10) {
        alerts.push({
          type: 'error',
          message: `Chip "${chip.chipName}" tem alta taxa de falha: ${chip.failureRate}%`,
          chipId: chip.chipId ?? undefined,
        });
      } else if (chip.failureRate > 5) {
        alerts.push({
          type: 'warning',
          message: `Chip "${chip.chipName}" tem taxa de falha elevada: ${chip.failureRate}%`,
          chipId: chip.chipId ?? undefined,
        });
      }
    }

    // Check for low delivery rate
    const deliveryRate = funnel.percentages.delivered;
    if (deliveryRate < 80 && sent > 10) {
      alerts.push({
        type: 'warning',
        message: `Taxa de entrega baixa: ${deliveryRate}%`,
      });
    }

    // Check for stalled campaign
    if (campaign.status === 'sending') {
      const lastEvent = timeline[0];
      if (lastEvent && lastEvent.createdAt) {
        const hoursSinceLastEvent = 
          (Date.now() - new Date(lastEvent.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastEvent > 1) {
          alerts.push({
            type: 'warning',
            message: `Campanha parada há mais de 1 hora. Último evento: ${new Date(lastEvent.createdAt).toLocaleString('pt-BR')}`,
          });
        }
      }
    }

    // ─── AI analysis (opt-in via ?ai=true) ────────────────────────────────────
    let aiAnalysis: CampaignPerformanceAnalysis | undefined;

    if (wantAi) {
      const cacheKey = `${id}:${sent}`;
      const cached = aiCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        aiAnalysis = cached.analysis;
      } else {
        // Derive totalBlocked from failed (campaigns table doesn't have a separate blocked counter)
        // Use totalFailed as proxy — circuit breaker trips on block-related failures
        const result = await analyzeCampaignPerformance({
          campaignName: campaign.name,
          totalSent: sent,
          totalDelivered: delivered,
          totalRead: read,
          totalReplied: campaign.totalReplied || 0,
          totalFailed: failed,
          totalBlocked: 0, // no separate blocked counter in schema
          messageTemplate: campaign.template || '',
        });

        if (result) {
          aiCache.set(cacheKey, { analysis: result, expiresAt: Date.now() + AI_CACHE_TTL_MS });
          aiAnalysis = result;
        }
      }
    }

    const analyticsData: AnalyticsData = {
      campaign,
      funnel,
      timeline,
      chipBreakdown,
      alerts,
      ...(aiAnalysis !== undefined ? { ai: aiAnalysis } : {}),
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('[api/campaigns/[id]/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}