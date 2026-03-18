import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, chips, campaigns, voters } from '@/db/schema';
import { and, eq, gte, lte, inArray, desc, count, sql } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ChipInfo {
  id: string;
  name: string;
  phone: string;
  healthStatus: string;
  messagesSentToday: number;
  dailyLimit: number;
  messagesSentThisHour: number;
  hourlyLimit: number;
}

interface HourlyUsage {
  hour: number;
  count: number;
}

interface ChipMessagesResponse {
  chip: ChipInfo;
  messages: Array<{
    id: string;
    campaignId: string | null;
    campaignName: string | null;
    voterId: string | null;
    voterName: string | null;
    voterPhone: string;
    message: string;
    resolvedMessage: string;
    status: string;
    sentAt: string | null;
    deliveredAt: string | null;
    readAt: string | null;
    failedAt: string | null;
    failReason: string | null;
    createdAt: string;
  }>;
  total: number;
  page: number;
  totalPages: number;
  hourlyUsage: HourlyUsage[];
  stats: {
    todaySent: number;
    todayDelivered: number;
    todayFailed: number;
    avgDeliveryRate: number;
  };
}

/**
 * GET /api/chips/[id]/messages
 * Get paginated messages for a specific chip
 * 
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 50, max 100)
 * - startDate: filter from date
 * - endDate: filter to date
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'operations.view', 'Acesso negado');
  if (auth.response) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);
  const offset = (page - 1) * limit;
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  try {
    // Get chip
    const [chip] = await db
      .select()
      .from(chips)
      .where(eq(chips.id, id))
      .limit(1);

    if (!chip) {
      return NextResponse.json({ error: 'Chip não encontrado' }, { status: 404 });
    }

    // Build filter conditions
    const conditions = [eq(messageQueue.chipId, id)];

    // Date filters
    if (startDateParam) {
      const start = new Date(startDateParam);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(messageQueue.createdAt, start));
      }
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      if (!isNaN(end.getTime())) {
        end.setDate(end.getDate() + 1);
        conditions.push(lte(messageQueue.createdAt, end));
      }
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(messageQueue)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Get messages
    const messages = await db
      .select()
      .from(messageQueue)
      .where(whereClause)
      .orderBy(desc(messageQueue.createdAt))
      .limit(limit)
      .offset(offset);

    // Get related entities
    const campaignIds = [...new Set(messages.map(m => m.campaignId).filter(Boolean))] as string[];
    const voterIds = [...new Set(messages.map(m => m.voterId).filter(Boolean))] as string[];

    const [campaignRecords, voterRecords] = await Promise.all([
      campaignIds.length > 0
        ? db.select().from(campaigns).where(inArray(campaigns.id, campaignIds))
        : [],
      voterIds.length > 0
        ? db.select().from(voters).where(inArray(voters.id, voterIds))
        : [],
    ]);

    const campaignMap = new Map(campaignRecords.map(c => [c.id, c.name]));
    const voterMap = new Map(voterRecords.map(v => [v.id, v.name]));

    // Build message rows
    const messageRows = messages.map(msg => ({
      id: msg.id,
      campaignId: msg.campaignId,
      campaignName: msg.campaignId ? (campaignMap.get(msg.campaignId) ?? null) : null,
      voterId: msg.voterId,
      voterName: msg.voterId ? (voterMap.get(msg.voterId) ?? msg.voterName ?? null) : msg.voterName,
      voterPhone: msg.voterPhone,
      message: msg.message,
      resolvedMessage: msg.resolvedMessage,
      status: msg.status,
      sentAt: msg.sentAt?.toISOString() ?? null,
      deliveredAt: msg.deliveredAt?.toISOString() ?? null,
      readAt: msg.readAt?.toISOString() ?? null,
      failedAt: msg.failedAt?.toISOString() ?? null,
      failReason: msg.failReason,
      createdAt: msg.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    // Get hourly usage for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const hourlyUsageRows = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${messageQueue.sentAt})`,
        count: sql<number>`count(*)`,
      })
      .from(messageQueue)
      .where(and(
        eq(messageQueue.chipId, id),
        gte(messageQueue.sentAt, today),
        inArray(messageQueue.status, ['sent', 'delivered', 'read', 'failed'])
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${messageQueue.sentAt})`);

    const hourlyUsage: HourlyUsage[] = Array.from({ length: 24 }, (_, i) => {
      const row = hourlyUsageRows.find(r => Number(r.hour) === i);
      return {
        hour: i,
        count: row ? Number(row.count) : 0,
      };
    });

    // Get today's stats
    const [todayStats] = await db
      .select({
        sent: sql<number>`count(*) filter (where ${messageQueue.status} in ('sent', 'delivered', 'read', 'failed'))`,
        delivered: sql<number>`count(*) filter (where ${messageQueue.status} in ('delivered', 'read'))`,
        failed: sql<number>`count(*) filter (where ${messageQueue.status} = 'failed')`,
      })
      .from(messageQueue)
      .where(and(
        eq(messageQueue.chipId, id),
        gte(messageQueue.createdAt, today)
      ));

    const todaySent = Number(todayStats?.sent ?? 0);
    const todayDelivered = Number(todayStats?.delivered ?? 0);
    const avgDeliveryRate = todaySent > 0 ? Math.round((todayDelivered / todaySent) * 100) : 0;

    const response: ChipMessagesResponse = {
      chip: {
        id: chip.id,
        name: chip.name,
        phone: chip.phone,
        healthStatus: chip.healthStatus ?? 'disconnected',
        messagesSentToday: chip.messagesSentToday ?? 0,
        dailyLimit: chip.dailyLimit ?? 200,
        messagesSentThisHour: chip.messagesSentThisHour ?? 0,
        hourlyLimit: chip.hourlyLimit ?? 25,
      },
      messages: messageRows,
      total,
      page,
      totalPages,
      hourlyUsage,
      stats: {
        todaySent,
        todayDelivered,
        todayFailed: Number(todayStats?.failed ?? 0),
        avgDeliveryRate,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/chips/[id]/messages] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar mensagens do chip' },
      { status: 500 }
    );
  }
}