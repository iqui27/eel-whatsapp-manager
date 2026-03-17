import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messageQueue, chips, voters, conversationMessages, conversations } from '@/db/schema';
import { eq, desc, sql, or } from 'drizzle-orm';

/**
 * GET /api/dashboard/messages
 * Get recent messages for dashboard feed - includes both outbound (queue) and inbound (conversations)
 */
export async function GET() {
  try {
    // Get recent outbound messages from queue
    const outboundMessages = await db
      .select({
        id: messageQueue.id,
        direction: sql<'outbound'>`'outbound'`,
        chipId: messageQueue.chipId,
        voterId: messageQueue.voterId,
        voterName: messageQueue.voterName,
        voterPhone: messageQueue.voterPhone,
        message: messageQueue.resolvedMessage,
        status: messageQueue.status,
        createdAt: messageQueue.createdAt,
      })
      .from(messageQueue)
      .orderBy(desc(messageQueue.createdAt))
      .limit(25);

    // Get recent inbound messages from conversations
    const inboundMessages = await db
      .select({
        id: conversationMessages.id,
        direction: sql<'inbound'>`'inbound'`,
        conversationId: conversationMessages.conversationId,
        sender: conversationMessages.sender,
        content: conversationMessages.content,
        createdAt: conversationMessages.createdAt,
        voterName: conversations.voterName,
        voterPhone: conversations.voterPhone,
        chipId: conversations.chipId,
      })
      .from(conversationMessages)
      .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
      .where(eq(conversationMessages.sender, 'voter'))
      .orderBy(desc(conversationMessages.createdAt))
      .limit(25);

    // Get chip names
    const allChipIds = [
      ...new Set([
        ...outboundMessages.map(m => m.chipId).filter(Boolean),
        ...inboundMessages.map(m => m.chipId).filter(Boolean),
      ]),
    ];
    
    let chipNames: Record<string, string> = {};
    
    if (allChipIds.length > 0) {
      const chipData = await db
        .select({ id: chips.id, name: chips.name })
        .from(chips)
        .where(sql`${chips.id} IN ${allChipIds}`);
      
      chipNames = Object.fromEntries(chipData.map(c => [c.id, c.name]));
    }

    // Format outbound messages
    const formattedOutbound = outboundMessages.map(m => ({
      id: m.id,
      direction: 'outbound' as const,
      chipName: m.chipId ? chipNames[m.chipId] || 'Unknown' : 'Unassigned',
      leadName: m.voterName || 'Unknown',
      leadPhone: m.voterPhone || '',
      preview: m.message || '',
      status: m.status,
      createdAt: m.createdAt,
    }));

    // Format inbound messages
    const formattedInbound = inboundMessages.map(m => ({
      id: `inbound-${m.id}`,
      direction: 'inbound' as const,
      chipName: m.chipId ? chipNames[m.chipId] || 'Unknown' : 'Unknown',
      leadName: m.voterName || 'Unknown',
      leadPhone: m.voterPhone || '',
      preview: m.content || '',
      status: 'received',
      createdAt: m.createdAt,
    }));

    // Merge and sort by createdAt
    const allMessages = [...formattedOutbound, ...formattedInbound]
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 50);

    return NextResponse.json({ messages: allMessages });
  } catch (error) {
    console.error('[api/dashboard/messages] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}