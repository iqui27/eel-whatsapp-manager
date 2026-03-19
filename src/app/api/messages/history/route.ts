import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, campaigns, chips, voters, conversationMessages, conversations } from '@/db/schema';
import { and, desc, eq, inArray, gte, lte, or, sql, count, ilike, asc } from 'drizzle-orm';

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
  direction: 'outbound' | 'inbound';
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
 * - campaignId: filter by campaign (outbound only)
 * - chipId: filter by chip (outbound only)
 * - status: filter by status (outbound: queued/assigned/sending/sent/delivered/read/failed/retry; inbound: received)
 * - startDate: filter from date (ISO string)
 * - endDate: filter to date (ISO string)
 * - search: search by phone, name, or message content
 * - sortBy: sort field (createdAt, sentAt, status) default createdAt
 * - sortOrder: asc or desc (default desc)
 * - direction: all | outbound | inbound (default all)
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
  const searchQuery = searchParams.get('search');
  const sortOrder = searchParams.get('sortOrder') ?? 'desc';
  const direction = searchParams.get('direction') ?? 'all';

  try {
    // ─── Parse date range ───────────────────────────────────────────────────────
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;

    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) startDateObj = d;
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 1); // include end date
        endDateObj = d;
      }
    }

    const searchTerm = searchQuery && searchQuery.trim().length >= 2 ? searchQuery.trim() : null;
    const searchPattern = searchTerm ? `%${searchTerm}%` : null;

    // ─── Outbound (messageQueue) ────────────────────────────────────────────────
    type OutboundRow = {
      id: string;
      campaignId: string | null;
      chipId: string | null;
      voterId: string | null;
      voterName: string | null;
      voterPhone: string;
      message: string;
      resolvedMessage: string;
      status: string;
      sentAt: Date | null;
      deliveredAt: Date | null;
      readAt: Date | null;
      failedAt: Date | null;
      failReason: string | null;
      createdAt: Date | null;
    };

    let outboundRows: OutboundRow[] = [];

    if (direction === 'all' || direction === 'outbound') {
      const outboundConditions = [];

      if (campaignId) outboundConditions.push(eq(messageQueue.campaignId, campaignId));
      if (chipId) outboundConditions.push(eq(messageQueue.chipId, chipId));
      if (status && ['queued', 'assigned', 'sending', 'sent', 'delivered', 'read', 'failed', 'retry'].includes(status)) {
        outboundConditions.push(eq(messageQueue.status, status as typeof messageQueue.$inferSelect.status));
      }
      if (startDateObj) outboundConditions.push(gte(messageQueue.createdAt, startDateObj));
      if (endDateObj) outboundConditions.push(lte(messageQueue.createdAt, endDateObj));
      if (searchPattern) {
        outboundConditions.push(or(
          ilike(messageQueue.voterPhone, searchPattern),
          ilike(messageQueue.voterName, searchPattern),
          ilike(messageQueue.message, searchPattern),
          ilike(messageQueue.resolvedMessage, searchPattern),
          sql`EXISTS (
            SELECT 1 FROM ${voters}
            WHERE ${voters.id} = ${messageQueue.voterId}
            AND ${ilike(voters.name, searchPattern)}
          )`,
        ));
      }

      const outboundWhere = outboundConditions.length > 0 ? and(...outboundConditions) : undefined;
      outboundRows = await db.select().from(messageQueue).where(outboundWhere) as OutboundRow[];
    }

    // ─── Inbound (conversationMessages) ────────────────────────────────────────
    type InboundRow = {
      id: string;
      voterPhone: string;
      voterName: string;
      content: string;
      createdAt: Date | null;
    };

    let inboundRows: InboundRow[] = [];

    if (direction === 'all' || direction === 'inbound') {
      // Only fetch inbound if no campaignId/chipId filter (those only apply to outbound)
      if (!campaignId && !chipId) {
        const inboundConditions = [eq(conversationMessages.sender, 'voter')];

        if (status && status !== 'received') {
          // If a specific outbound status is selected, show no inbound
          inboundRows = [];
        } else {
          if (startDateObj) inboundConditions.push(gte(conversationMessages.createdAt, startDateObj));
          if (endDateObj) inboundConditions.push(lte(conversationMessages.createdAt, endDateObj));

          let inboundQuery = db
            .select({
              id: conversationMessages.id,
              voterPhone: conversations.voterPhone,
              voterName: conversations.voterName,
              content: conversationMessages.content,
              createdAt: conversationMessages.createdAt,
            })
            .from(conversationMessages)
            .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
            .where(and(...inboundConditions))
            .$dynamic();

          if (searchPattern) {
            inboundQuery = inboundQuery.where(
              and(
                and(...inboundConditions),
                or(
                  ilike(conversations.voterPhone, searchPattern),
                  ilike(conversations.voterName, searchPattern),
                  ilike(conversationMessages.content, searchPattern),
                ),
              ),
            );
          }

          inboundRows = await inboundQuery as InboundRow[];
        }
      }
    }

    // ─── Merge and build unified rows ───────────────────────────────────────────

    // Map outbound → MessageHistoryRow
    const outboundMapped: (MessageHistoryRow & { _date: Date })[] = outboundRows.map(msg => ({
      _date: msg.createdAt ?? new Date(0),
      id: msg.id,
      campaignId: msg.campaignId,
      campaignName: null, // filled after lookup
      chipId: msg.chipId,
      chipName: null, // filled after lookup
      voterId: msg.voterId,
      voterName: msg.voterName,
      voterPhone: msg.voterPhone,
      message: msg.message,
      resolvedMessage: msg.resolvedMessage,
      status: msg.status,
      direction: 'outbound' as const,
      sentAt: msg.sentAt?.toISOString() ?? null,
      deliveredAt: msg.deliveredAt?.toISOString() ?? null,
      readAt: msg.readAt?.toISOString() ?? null,
      failedAt: msg.failedAt?.toISOString() ?? null,
      failReason: msg.failReason,
      createdAt: msg.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    // Map inbound → MessageHistoryRow
    const inboundMapped: (MessageHistoryRow & { _date: Date })[] = inboundRows.map(msg => ({
      _date: msg.createdAt ?? new Date(0),
      id: msg.id,
      campaignId: null,
      campaignName: null,
      chipId: null,
      chipName: null,
      voterId: null,
      voterName: msg.voterName,
      voterPhone: msg.voterPhone,
      message: msg.content,
      resolvedMessage: msg.content,
      status: 'received',
      direction: 'inbound' as const,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failReason: null,
      createdAt: msg.createdAt?.toISOString() ?? new Date().toISOString(),
    }));

    // Merge and sort
    const merged = [...outboundMapped, ...inboundMapped];
    merged.sort((a, b) => {
      const diff = b._date.getTime() - a._date.getTime();
      return sortOrder === 'asc' ? -diff : diff;
    });

    const total = merged.length;
    const totalPages = Math.ceil(total / limit);

    // Paginate
    const paginated = merged.slice(offset, offset + limit);

    if (paginated.length === 0) {
      return NextResponse.json({
        data: [],
        total,
        page,
        limit,
        totalPages,
      } as HistoryResponse);
    }

    // ─── Enrich with related entity names ──────────────────────────────────────
    const campaignIds = [...new Set(paginated.map(m => m.campaignId).filter(Boolean))] as string[];
    const chipIds = [...new Set(paginated.map(m => m.chipId).filter(Boolean))] as string[];
    const voterIds = [...new Set(paginated.map(m => m.voterId).filter(Boolean))] as string[];

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

    // Apply names
    const data: MessageHistoryRow[] = paginated.map(({ _date: _d, ...row }) => ({
      ...row,
      campaignName: row.campaignId ? (campaignMap.get(row.campaignId) ?? null) : null,
      chipName: row.chipId ? (chipMap.get(row.chipId) ?? null) : null,
      voterName: row.voterId ? (voterMap.get(row.voterId) ?? row.voterName) : row.voterName,
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
