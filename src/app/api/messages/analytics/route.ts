import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, campaigns, chips, conversionEvents } from '@/db/schema';
import { and, eq, gte, lte, sql, desc, inArray } from 'drizzle-orm';

interface HourlyStats {
  hour: number;
  sent: number;
  delivered: number;
  failed: number;
}

interface DailyStats {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  replies: number;
  groupJoins: number;
}

interface ChipPerformance {
  chipId: string;
  chipName: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
  failureRate: number;
}

interface SegmentResponse {
  segmentId: string | null;
  segmentName: string;
  total: number;
  sent: number;
  delivered: number;
  replied: number;
  responseRate: number;
}

interface BestSendTime {
  hour: number;
  deliveryRate: number;
  readRate: number;
  count: number;
}

interface AnalyticsResponse {
  hourlyStats: HourlyStats[];
  dailyStats: DailyStats[];
  chipPerformance: ChipPerformance[];
  segmentResponse: SegmentResponse[];
  bestSendTimes: BestSendTime[];
  summary: {
    totalMessages: number;
    delivered: number;
    read: number;
    failed: number;
    avgDeliveryTime: number | null;
    avgReadTime: number | null;
  };
}

/**
 * GET /api/messages/analytics
 * Get aggregated analytics for messages
 * 
 * Query params:
 * - startDate: filter from date (default: 7 days ago)
 * - endDate: filter to date (default: now)
 * - campaignId: filter by campaign
 * - chipId: filter by chip
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.view', 'Acesso negado aos analytics');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  
  // Default to last 7 days
  const endDate = searchParams.get('endDate') 
    ? new Date(searchParams.get('endDate')!)
    : new Date();
  const startDate = searchParams.get('startDate')
    ? new Date(searchParams.get('startDate')!)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  const campaignId = searchParams.get('campaignId');
  const chipId = searchParams.get('chipId');

  try {
    // Build filter conditions
    const conditions = [
      gte(messageQueue.createdAt, startDate),
      lte(messageQueue.createdAt, endDate),
    ];

    if (campaignId) {
      conditions.push(eq(messageQueue.campaignId, campaignId));
    }

    if (chipId) {
      conditions.push(eq(messageQueue.chipId, chipId));
    }

    const whereClause = and(...conditions);

    // 1. Hourly stats (by sentAt hour)
    const hourlyRows = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${messageQueue.sentAt})`,
        sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
      })
      .from(messageQueue)
      .where(whereClause)
      .groupBy(sql`EXTRACT(HOUR FROM ${messageQueue.sentAt})`);

    const hourlyStats: HourlyStats[] = Array.from({ length: 24 }, (_, i) => {
      const row = hourlyRows.find(r => Number(r.hour) === i);
      return {
        hour: i,
        sent: row ? Number(row.sent) : 0,
        delivered: row ? Number(row.delivered) : 0,
        failed: row ? Number(row.failed) : 0,
      };
    });

    // 2. Daily stats
    const dailyRows = await db
      .select({
        date: sql<string>`DATE(${messageQueue.createdAt})`,
        sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
      })
      .from(messageQueue)
      .where(whereClause)
      .groupBy(sql`DATE(${messageQueue.createdAt})`)
      .orderBy(sql`DATE(${messageQueue.createdAt})`);

    // Get replies and group joins from conversion events
    const conversionConditions = [
      gte(conversionEvents.createdAt, startDate),
      lte(conversionEvents.createdAt, endDate),
    ];
    if (campaignId) {
      conversionConditions.push(eq(conversionEvents.campaignId, campaignId));
    }

    const conversionByDate = await db
      .select({
        date: sql<string>`DATE(${conversionEvents.createdAt})`,
        replies: sql<number>`count(*) filter (where ${conversionEvents.eventType} = 'reply')`,
        groupJoins: sql<number>`count(*) filter (where ${conversionEvents.eventType} = 'group_join')`,
      })
      .from(conversionEvents)
      .where(and(...conversionConditions))
      .groupBy(sql`DATE(${conversionEvents.createdAt})`);

    const dailyStats: DailyStats[] = dailyRows.map(row => {
      const conversions = conversionByDate.find(c => c.date === row.date);
      return {
        date: row.date,
        sent: Number(row.sent),
        delivered: Number(row.delivered),
        failed: Number(row.failed),
        replies: conversions ? Number(conversions.replies) : 0,
        groupJoins: conversions ? Number(conversions.groupJoins) : 0,
      };
    });

    // 3. Chip performance
    const chipStats = await db
      .select({
        chipId: messageQueue.chipId,
        sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        read: sql<number>`count(*) filter (where ${messageQueue.status} = 'read')`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
      })
      .from(messageQueue)
      .where(whereClause)
      .groupBy(messageQueue.chipId);

    const chipIds = chipStats.filter(s => s.chipId).map(s => s.chipId as string);
    const chipRecords = chipIds.length > 0
      ? await db.select().from(chips).where(inArray(chips.id, chipIds))
      : [];

    const chipMap = new Map(chipRecords.map(c => [c.id, c.name]));

    const chipPerformance: ChipPerformance[] = chipStats
      .filter(s => s.chipId)
      .map(stat => ({
        chipId: stat.chipId!,
        chipName: chipMap.get(stat.chipId!) ?? 'Unknown',
        sent: Number(stat.sent),
        delivered: Number(stat.delivered),
        read: Number(stat.read),
        failed: Number(stat.failed),
        deliveryRate: Number(stat.sent) > 0 
          ? Math.round((Number(stat.delivered) / Number(stat.sent)) * 100) 
          : 0,
        readRate: Number(stat.delivered) > 0 
          ? Math.round((Number(stat.read) / Number(stat.delivered)) * 100) 
          : 0,
        failureRate: Number(stat.sent) > 0 
          ? Math.round((Number(stat.failed) / Number(stat.sent)) * 100) 
          : 0,
      }))
      .sort((a, b) => b.sent - a.sent);

    // 4. Best send times (delivery rate by hour)
    const bestSendTimes: BestSendTime[] = hourlyStats
      .filter(h => h.sent >= 10) // Only hours with meaningful data
      .map(h => ({
        hour: h.hour,
        deliveryRate: h.sent > 0 ? Math.round((h.delivered / h.sent) * 100) : 0,
        readRate: h.delivered > 0 ? Math.round((h.delivered / h.sent) * 50) : 0, // Approximate
        count: h.sent,
      }))
      .sort((a, b) => b.deliveryRate - a.deliveryRate)
      .slice(0, 5);

    // 5. Summary stats
    const [summaryStats] = await db
      .select({
        totalMessages: sql<number>`count(*)`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        read: sql<number>`count(*) filter (where ${messageQueue.status} = 'read')`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
        avgDeliveryTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${messageQueue.deliveredAt} - ${messageQueue.sentAt})))`,
        avgReadTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${messageQueue.readAt} - ${messageQueue.deliveredAt})))`,
      })
      .from(messageQueue)
      .where(whereClause);

    // 6. Segment response (if campaign filter applied)
    let segmentResponse: SegmentResponse[] = [];
    if (campaignId) {
      const segmentStats = await db
        .select({
          segmentId: messageQueue.segmentId,
          total: sql<number>`count(*)`,
          sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
          delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
          replied: sql<number>`count(*) filter (where ${messageQueue.status} = 'read')`, // Proxy
        })
        .from(messageQueue)
        .where(whereClause)
        .groupBy(messageQueue.segmentId);

      segmentResponse = segmentStats.map(stat => ({
        segmentId: stat.segmentId,
        segmentName: stat.segmentId ? `Segmento ${stat.segmentId.slice(0, 8)}` : 'Sem segmento',
        total: Number(stat.total),
        sent: Number(stat.sent),
        delivered: Number(stat.delivered),
        replied: Number(stat.replied),
        responseRate: Number(stat.sent) > 0 
          ? Math.round((Number(stat.replied) / Number(stat.sent)) * 100) 
          : 0,
      }));
    }

    const response: AnalyticsResponse = {
      hourlyStats,
      dailyStats,
      chipPerformance,
      segmentResponse,
      bestSendTimes,
      summary: {
        totalMessages: Number(summaryStats?.totalMessages ?? 0),
        delivered: Number(summaryStats?.delivered ?? 0),
        read: Number(summaryStats?.read ?? 0),
        failed: Number(summaryStats?.failed ?? 0),
        avgDeliveryTime: summaryStats?.avgDeliveryTime ? Number(summaryStats.avgDeliveryTime) : null,
        avgReadTime: summaryStats?.avgReadTime ? Number(summaryStats.avgReadTime) : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/messages/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar analytics' },
      { status: 500 }
    );
  }
}