import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { db } from '@/db';
import { messageQueue, campaigns, chips, voters } from '@/db/schema';
import { and, eq, inArray, gte, lte, or, ilike, sql, desc } from 'drizzle-orm';
import { generateCSV, generatePDFHTML, type ExportMessage } from '@/lib/export-messages';

/**
 * GET /api/messages/export
 * Export messages to CSV or PDF format
 * 
 * Query params:
 * - format: 'csv' or 'pdf' (required)
 * - campaignId: filter by campaign
 * - chipId: filter by chip
 * - status: filter by status
 * - startDate: filter from date
 * - endDate: filter to date
 * - search: search query
 * - limit: max messages to export (default 10000)
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'reports.export', 'Acesso negado à exportação');
  if (auth.response) return auth.response;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '10000', 10) || 10000, 1), 50000);

  const campaignId = searchParams.get('campaignId');
  const chipId = searchParams.get('chipId');
  const status = searchParams.get('status');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const searchQuery = searchParams.get('search');

  if (!format || !['csv', 'pdf'].includes(format)) {
    return NextResponse.json(
      { error: 'Formato inválido. Use "csv" ou "pdf"' },
      { status: 400 }
    );
  }

  try {
    // Build filter conditions (same as history API)
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
        end.setDate(end.getDate() + 1);
        conditions.push(lte(messageQueue.createdAt, end));
      }
    }

    if (searchQuery && searchQuery.trim().length >= 2) {
      const searchTerm = searchQuery.trim();
      const searchPattern = `%${searchTerm}%`;
      conditions.push(or(
        ilike(messageQueue.voterPhone, searchPattern),
        ilike(messageQueue.voterName, searchPattern),
        ilike(messageQueue.message, searchPattern),
        ilike(messageQueue.resolvedMessage, searchPattern),
        sql`EXISTS (
          SELECT 1 FROM ${voters} 
          WHERE ${voters.id} = ${messageQueue.voterId} 
          AND ${ilike(voters.name, searchPattern)}
        )`
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get messages
    const messages = await db
      .select()
      .from(messageQueue)
      .where(whereClause)
      .orderBy(desc(messageQueue.createdAt))
      .limit(limit);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma mensagem encontrada para exportar' },
        { status: 404 }
      );
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

    // Build export data
    const exportMessages: ExportMessage[] = messages.map(msg => ({
      id: msg.id,
      campaignName: msg.campaignId ? (campaignMap.get(msg.campaignId) ?? null) : null,
      chipName: msg.chipId ? (chipMap.get(msg.chipId) ?? null) : null,
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

    // Generate output based on format
    if (format === 'csv') {
      const csvContent = generateCSV(exportMessages);
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mensagens-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      // PDF format - return HTML for printing
      const htmlContent = generatePDFHTML(exportMessages);
      
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `attachment; filename="mensagens-${new Date().toISOString().split('T')[0]}.html"`,
        },
      });
    }
  } catch (error) {
    console.error('[api/messages/export] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao exportar mensagens' },
      { status: 500 }
    );
  }
}