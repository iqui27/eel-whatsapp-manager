import { NextResponse } from 'next/server';
import { db } from '@/db';
import { messageQueue, chips, voters } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/messages
 * Get recent messages for dashboard feed
 */
export async function GET() {
  try {
    // Get recent messages from queue
    const recentMessages = await db
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
      .limit(50);

    // Get chip names
    const chipIds = [...new Set(recentMessages.map(m => m.chipId).filter(Boolean))];
    let chipNames: Record<string, string> = {};
    
    if (chipIds.length > 0) {
      const chipData = await db
        .select({ id: chips.id, name: chips.name })
        .from(chips)
        .where(sql`${chips.id} IN ${chipIds}`);
      
      chipNames = Object.fromEntries(chipData.map(c => [c.id, c.name]));
    }

    // Format messages
    const messages = recentMessages.map(m => ({
      id: m.id,
      direction: 'outbound' as const,
      chipName: m.chipId ? chipNames[m.chipId] || 'Unknown' : 'Unassigned',
      leadName: m.voterName || 'Unknown',
      leadPhone: m.voterPhone || '',
      preview: m.message || '',
      status: m.status,
      createdAt: m.createdAt,
    }));

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('[api/dashboard/messages] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load messages' },
      { status: 500 }
    );
  }
}