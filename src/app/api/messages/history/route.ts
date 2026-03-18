import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, campaigns, chips, voters } from '@/db/schema';
import { and, desc, eq, inArray, gte, lte, or, sql, count } from 'drizzle-orm';

interface MessageHistoryRow {
  id: string;
  campaignId: string | null;
  campaignName: string | null;
  chipId: string | null;
  chipName: string | null;
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
}

interface HistoryResponse {
  data: MessageHistoryRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * GET /api/messages/history
 * Get paginated message history with filters
 * 
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 50, max 100)
 * - campaignId: filter by campaign
 * - chipId: filter by chip
 * - status: filter by status (queued, assigned, sending, sent, delivered, read, failed, retry)
 * - startDate: filter from date (ISO string)
 * - endDate: filter to date (ISO string)
 * - sortBy: sort field (createdAt, sentAt, status) default createdAt
 * - sortOrder: asc or desc (default desc)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Acesso negado ao histórico');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);
  const offset = (page - 1) * limit;

  const campaignId = searchParams.get('campaignId');
  const chipId = searchParams.get('chipId');
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const sortOrder = searchParams.get('sortOrder') ?? 'desc';

  try {
    // Build filter conditions
    const conditions = [];

    if (campaignId) {
      conditions.push(eq(messageQueue.campaignId, campaignId));
    }

    if (chipId) {
      conditions.push(eq(messageQueue.chipId, chipId));
    }

    if (status && ['queued', 'assigned', 'sending', 'sent', 'delivered', 'read', 'failed', 'retry'].includes(status)) {
      conditions.push(eq(messageQueue.status, status as typeof messageQueue.$inferSelect.status));
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!isNaN(start.getTime())) {
        conditions.push(gte(messageQueue.createdAt, start));
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        // Add 1 day to include the end date
        end.setDate(end.getDate() + 1);
        conditions.push(lte(messageQueue.createdAt, end));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(messageQueue)
      .where(whereClause);

    const total = countResult?.count ?? 0;
    const totalPages = Math.ceil(total / limit);

    // Determine sort column
    const sortColumn = sortBy === 'sentAt' 
      ? messageQueue.sentAt 
      : sortBy === 'status'
        ? messageQueue.status
        : messageQueue.createdAt;

    const orderByClause = sortOrder === 'asc' 
      ? sql`${sortColumn} ASC NULLS LAST`
      : sql`${sortColumn} DESC NULLS LAST`;

    // Get messages with joins
    const messages = await db
      .select()
      .from(messageQueue)
      .where(whereClause)
      .orderBy(sql`${sortOrder === 'asc' ? sortColumn : sql`${sortColumn} DESC NULLS LAST`}`)
      .limit(limit)
      .offset(offset);

    if (messages.length === 0) {
      return NextResponse.json({
        data: [],
        total,
        page,
        limit,
        totalPages,
      } as HistoryResponse);
    }

    // Get related entities
    const campaignIds = [...new Set(messages.map(m => m.campaignId).filter(Boolean))] as string[];
    const chipIds = [...new Set(messages.map(m => m.chipId).filter(Boolean))] as string[];
    const voterIds = [...new Set(messages.map(m => m.voterId).filter(Boolean))] as string[];

    const [campaignRecords, chipRecords, voterRecords] = await Promise.all([
      campaignIds.length > 0
        ? db.select().from(campaigns).where(inArray(campaigns.id, campaignIds))
        : [],
      chipIds.length > 0
        ? db.select().from(chips).where(inArray(chips.id, chipIds))
        : [],
      voterIds.length > 0
        ? db.select().from(voters).where(inArray(voters.id, voterIds))
        : [],
    ]);

    const campaignMap = new Map(campaignRecords.map(c => [c.id, c.name]));
    const chipMap = new Map(chipRecords.map(c => [c.id, c.name]));
    const voterMap = new Map(voterRecords.map(v => [v.id, v.name]));

    // Build response
    const data: MessageHistoryRow[] = messages.map(msg => ({
      id: msg.id,
      campaignId: msg.campaignId,
      campaignName: msg.campaignId ? (campaignMap.get(msg.campaignId) ?? null) : null,
      chipId: msg.chipId,
      chipName: msg.chipId ? (chipMap.get(msg.chipId) ?? null) : null,
      voterId: msg.voterId,
      voterName: msg.voterId ? (voterMap.get(msg.voterId) ?? null) : null,
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

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages,
    } as HistoryResponse);
  } catch (error) {
    console.error('[api/messages/history] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar histórico de mensagens' },
      { status: 500 }
    );
  }
}