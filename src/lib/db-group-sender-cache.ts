/**
 * Group sender cache — stores @s.whatsapp.net senders seen in group messages.
 * Used to resolve @lid participants (WhatsApp privacy) to known voter phones.
 * Phase 43.
 */
import { db } from '@/db';
import { groupSenderCache } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * Upsert a sender mapping. Called whenever a real @s.whatsapp.net sender
 * posts in a group. Uses ON CONFLICT DO UPDATE to refresh lastSeenAt.
 */
export async function upsertGroupSenderCache(
  groupJid: string,
  senderJid: string,
  normalizedPhone: string,
): Promise<void> {
  await db
    .insert(groupSenderCache)
    .values({ groupJid, senderJid, normalizedPhone })
    .onConflictDoUpdate({
      target: [groupSenderCache.groupJid, groupSenderCache.senderJid],
      set: {
        normalizedPhone,
        lastSeenAt: sql`now()`,
      },
    });
}

/**
 * Returns all known sender phones for a given group JID.
 * Used by the members API to enrich group participants with voter names.
 */
export async function getGroupSendersByGroupJid(
  groupJid: string,
): Promise<Array<{ senderJid: string; normalizedPhone: string }>> {
  const rows = await db
    .select({
      senderJid: groupSenderCache.senderJid,
      normalizedPhone: groupSenderCache.normalizedPhone,
    })
    .from(groupSenderCache)
    .where(eq(groupSenderCache.groupJid, groupJid));
  return rows;
}
