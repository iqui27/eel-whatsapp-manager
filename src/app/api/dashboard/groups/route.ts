import { NextResponse } from 'next/server';
import { db } from '@/db';
import { whatsappGroups } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

/**
 * GET /api/dashboard/groups
 * Get groups data for dashboard
 */
export async function GET() {
  try {
    const groups = await db
      .select({
        id: whatsappGroups.id,
        name: whatsappGroups.name,
        currentSize: whatsappGroups.currentSize,
        maxSize: whatsappGroups.maxSize,
        status: whatsappGroups.status,
        inviteUrl: whatsappGroups.inviteUrl,
        chipInstanceName: whatsappGroups.chipInstanceName,
        segmentTag: whatsappGroups.segmentTag,
      })
      .from(whatsappGroups)
      .where(sql`${whatsappGroups.status} IN ('active', 'full')`)
      .orderBy(desc(whatsappGroups.currentSize))
      .limit(20);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('[api/dashboard/groups] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load groups' },
      { status: 500 }
    );
  }
}