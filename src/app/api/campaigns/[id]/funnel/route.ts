import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { campaigns, conversionEvents, messageQueue } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export interface FunnelData {
  campaignId: string;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  clicked: number;
  joinedGroup: number;
  failed: number;
  percentages: {
    sent: number;
    delivered: number;
    read: number;
    replied: number;
    clicked: number;
    joinedGroup: number;
  };
}

/**
 * GET /api/campaigns/[id]/funnel
 * Get conversion funnel data for a campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Get campaign stats
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get queue stats for more accurate totals
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

    // Get conversion counts from campaign
    const replied = campaign.totalReplied || 0;
    const clicked = campaign.totalClicked || 0;
    const joinedGroup = campaign.totalJoinedGroup || 0;

    // Calculate percentages
    const funnelData: FunnelData = {
      campaignId: id,
      total,
      sent,
      delivered,
      read,
      replied,
      clicked,
      joinedGroup,
      failed,
      percentages: {
        sent: total > 0 ? Math.round((sent / total) * 100) : 0,
        delivered: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
        read: delivered > 0 ? Math.round((read / delivered) * 100) : 0,
        replied: sent > 0 ? Math.round((replied / sent) * 100) : 0,
        clicked: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
        joinedGroup: sent > 0 ? Math.round((joinedGroup / sent) * 100) : 0,
      },
    };

    return NextResponse.json(funnelData);
  } catch (error) {
    console.error('[api/campaigns/[id]/funnel] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get funnel data' },
      { status: 500 }
    );
  }
}