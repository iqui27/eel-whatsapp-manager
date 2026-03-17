import { NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, messageQueue, conversionEvents } from '@/db/schema';
import { sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/kpis
 * Get conversion KPIs for dashboard
 */
export async function GET() {
  try {
    // Get aggregate campaign stats
    const [campaignStats] = await db
      .select({
        totalSent: sql<number>`coalesce(sum(${campaigns.totalSent}), 0)`,
        totalDelivered: sql<number>`coalesce(sum(${campaigns.totalDelivered}), 0)`,
        totalRead: sql<number>`coalesce(sum(${campaigns.totalRead}), 0)`,
        totalReplied: sql<number>`coalesce(sum(${campaigns.totalReplied}), 0)`,
        totalJoinedGroup: sql<number>`coalesce(sum(${campaigns.totalJoinedGroup}), 0)`,
      })
      .from(campaigns);

    const totalSent = campaignStats?.totalSent || 0;
    const totalDelivered = campaignStats?.totalDelivered || 0;
    const totalRead = campaignStats?.totalRead || 0;
    const totalReplied = campaignStats?.totalReplied || 0;
    const totalJoinedGroup = campaignStats?.totalJoinedGroup || 0;

    // Calculate rates
    const deliveredRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
    const groupJoinRate = totalSent > 0 ? Math.round((totalJoinedGroup / totalSent) * 100) : 0;

    // Get trends (compare last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [recentWeek] = await db
      .select({
        sent: sql<number>`coalesce(sum(${campaigns.totalSent}), 0)`,
        delivered: sql<number>`coalesce(sum(${campaigns.totalDelivered}), 0)`,
      })
      .from(campaigns)
      .where(sql`${campaigns.updatedAt} >= ${sevenDaysAgo.toISOString()}`);

    const [previousWeek] = await db
      .select({
        sent: sql<number>`coalesce(sum(${campaigns.totalSent}), 0)`,
        delivered: sql<number>`coalesce(sum(${campaigns.totalDelivered}), 0)`,
      })
      .from(campaigns)
      .where(sql`${campaigns.updatedAt} >= ${fourteenDaysAgo.toISOString()} AND ${campaigns.updatedAt} < ${sevenDaysAgo.toISOString()}`);

    // Calculate trend percentages
    const calcTrend = (recent: number, previous: number): number => {
      if (previous === 0) return recent > 0 ? 100 : 0;
      return Math.round(((recent - previous) / previous) * 100);
    };

    const trends = {
      delivered: calcTrend(recentWeek?.delivered || 0, previousWeek?.delivered || 0),
      read: 0, // Would need more granular data
      reply: 0,
      groupJoin: 0,
    };

    return NextResponse.json({
      totalSent,
      deliveredRate,
      readRate,
      replyRate,
      groupJoinRate,
      trends,
    });
  } catch (error) {
    console.error('[api/dashboard/kpis] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load KPIs' },
      { status: 500 }
    );
  }
}