import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, campaigns, chips, voters } from '@/db/schema';
import { and, or, ilike, desc, inArray, sql } from 'drizzle-orm';

interface SearchResult {
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
  createdAt: string;
  // Highlighted snippets
  highlightedContent?: string;
}

interface SearchResponse {
  results: SearchResult[];
  query: string;
  total: number;
}

/**
 * GET /api/messages/search
 * Full-text search across messages
 * 
 * Query params:
 * - q: search query (required)
 * - limit: max results (default 50, max 100)
 * - type: filter by content type (message, phone, name)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'operations.view', 'Acesso negado à busca');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') ?? searchParams.get('search');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10) || 50, 1), 100);
  const type = searchParams.get('type'); // 'message', 'phone', 'name', or undefined for all

  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      results: [],
      query: query ?? '',
      total: 0,
    } as SearchResponse);
  }

  const searchTerm = query.trim();
  const searchPattern = `%${searchTerm}%`;

  try {
    // Build search conditions based on type
    const buildSearchConditions = () => {
      if (type === 'phone') {
        return ilike(messageQueue.voterPhone, searchPattern);
      }
      
      if (type === 'name') {
        return or(
          ilike(messageQueue.voterName, searchPattern),
          // Also search in voters table for more matches
          sql`EXISTS (
            SELECT 1 FROM ${voters} 
            WHERE ${voters.id} = ${messageQueue.voterId} 
            AND ${ilike(voters.name, searchPattern)}
          )`
        );
      }
      
      if (type === 'message') {
        return or(
          ilike(messageQueue.message, searchPattern),
          ilike(messageQueue.resolvedMessage, searchPattern)
        );
      }
      
      // Default: search all fields
      return or(
        ilike(messageQueue.voterPhone, searchPattern),
        ilike(messageQueue.voterName, searchPattern),
        ilike(messageQueue.message, searchPattern),
        ilike(messageQueue.resolvedMessage, searchPattern),
        sql`EXISTS (
          SELECT 1 FROM ${voters} 
          WHERE ${voters.id} = ${messageQueue.voterId} 
          AND ${ilike(voters.name, searchPattern)}
        )`
      );
    };

    const searchCondition = buildSearchConditions();

    // Execute search
    const messages = await db
      .select()
      .from(messageQueue)
      .where(searchCondition)
      .orderBy(desc(messageQueue.createdAt))
      .limit(limit);

    if (messages.length === 0) {
      return NextResponse.json({
        results: [],
        query: searchTerm,
        total: 0,
      } as SearchResponse);
    }

    // Get related entities for display
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

    // Helper to highlight search term in text
    const highlightText = (text: string | null, term: string): string | undefined => {
      if (!text) return undefined;
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      if (regex.test(text)) {
        // Return text with highlights (marked with ** for display)
        return text.replace(regex, '**$1**');
      }
      return undefined;
    };

    // Build results with highlights
    const results: SearchResult[] = messages.map(msg => ({
      id: msg.id,
      campaignId: msg.campaignId,
      campaignName: msg.campaignId ? (campaignMap.get(msg.campaignId) ?? null) : null,
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
      createdAt: msg.createdAt?.toISOString() ?? new Date().toISOString(),
      highlightedContent: highlightText(msg.resolvedMessage, searchTerm) ?? highlightText(msg.message, searchTerm),
    }));

    return NextResponse.json({
      results,
      query: searchTerm,
      total: results.length,
    } as SearchResponse);
  } catch (error) {
    console.error('[api/messages/search] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}