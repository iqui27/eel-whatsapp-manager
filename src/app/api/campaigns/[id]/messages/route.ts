import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, campaigns, chips, voters, conversations } from '@/db/schema';
import { and, eq, inArray, desc, count } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface CampaignInfo {
  id: string;
  name: string;
  status: string;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  createdAt: string;
}

interface MessageRow {
  id: string;
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
  conversationId?: string | null;
}

interface CampaignMessagesResponse {
  campaign: CampaignInfo;
  messages: MessageRow[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * GET /api/campaigns/[id]/messages
 * Get paginated messages for a specific campaign
 * 
 * Query params:
 * - page: page number (default 1)
 * - limit: items per page (default 50, max 100)
 * - status: filter by status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requirePermission(request, 'campaigns.view', 'Acesso negado');
  if (auth.response) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);
  const offset = (page - 1) * limit;
  const status = searchParams.get('status');

  try {
    // Get campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
    }

    // Build filter conditions
    const conditions = [eq(messageQueue.campaignId, id)];

    if (status && ['queued', 'assigned', 'sending', 'sent', 'delivered', 'read', 'failed', 'retry'].includes(status)) {
      conditions.push(eq(messageQueue.status, status as typeof messageQueue.$inferSelect.status));
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

    if (messages.length === 0) {
      return NextResponse.json({
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalSent: campaign.totalSent ?? 0,
          totalDelivered: campaign.totalDelivered ?? 0,
          totalRead: campaign.totalRead ?? 0,
          totalFailed: campaign.totalFailed ?? 0,
          createdAt: campaign.createdAt?.toISOString() ?? new Date().toISOString(),
        },
        messages: [],
        total: 0,
        page,
        totalPages: 0,
      } as CampaignMessagesResponse);
    }

    // Get related entities
    const chipIds = [...new Set(messages.map(m => m.chipId).filter(Boolean))] as string[];
    const voterIds = [...new Set(messages.map(m => m.voterId).filter(Boolean))] as string[];

    const [chipRecords, voterRecords, conversationRecords] = await Promise.all([
      chipIds.length > 0
        ? db.select().from(chips).where(inArray(chips.id, chipIds))
        : [],
      voterIds.length > 0
        ? db.select().from(voters).where(inArray(voters.id, voterIds))
        : [],
      voterIds.length > 0
        ? db.select().from(conversations).where(inArray(conversations.voterId, voterIds))
        : [],
    ]);

    const chipMap = new Map(chipRecords.map(c => [c.id, c.name]));
    const voterMap = new Map(voterRecords.map(v => [v.id, v.name]));
    
    // Map voter to conversation
    const voterToConversation = new Map(
      conversationRecords.map(c => [c.voterId, c.id])
    );

    // Build response
    const messageRows: MessageRow[] = messages.map(msg => ({
      id: msg.id,
      chipId: msg.chipId,
      chipName: msg.chipId ? (chipMap.get(msg.chipId) ?? null) : null,
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
      conversationId: msg.voterId ? (voterToConversation.get(msg.voterId) ?? null) : null,
    }));

    const response: CampaignMessagesResponse = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status ?? 'draft',
        totalSent: campaign.totalSent ?? 0,
        totalDelivered: campaign.totalDelivered ?? 0,
        totalRead: campaign.totalRead ?? 0,
        totalFailed: campaign.totalFailed ?? 0,
        createdAt: campaign.createdAt?.toISOString() ?? new Date().toISOString(),
      },
      messages: messageRows,
      total,
      page,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[api/campaigns/[id]/messages] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar mensagens da campanha' },
      { status: 500 }
    );
  }
}