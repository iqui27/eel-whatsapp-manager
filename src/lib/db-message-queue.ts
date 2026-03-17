/**
 * Message Queue data access — Drizzle / Supabase
 * Mass messaging queue with full lifecycle tracking.
 */
import { db, messageQueue, type MessageQueue, type NewMessageQueue } from '@/db';
import { eq, inArray, and, sql, isNull } from 'drizzle-orm';

export type { MessageQueue, NewMessageQueue };

// ─── Queue Operations ────────────────────────────────────────────────────────

/**
 * Enqueue messages (batch insert).
 * All messages start with status='queued'.
 */
export async function enqueueMessages(
  messages: Omit<NewMessageQueue, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<MessageQueue[]> {
  if (messages.length === 0) return [];
  return db.insert(messageQueue).values(messages).returning();
}

/**
 * Get next batch of queued messages ready for sending.
 * Ordered by priority (desc) then createdAt (asc).
 */
export async function getNextQueuedMessages(limit: number): Promise<MessageQueue[]> {
  return db
    .select()
    .from(messageQueue)
    .where(eq(messageQueue.status, 'queued'))
    .orderBy(sql`${messageQueue.priority} DESC, ${messageQueue.createdAt} ASC`)
    .limit(limit);
}

/**
 * Get messages by status for a campaign.
 */
export async function getMessagesByStatus(
  campaignId: string,
  statuses: MessageQueue['status'][]
): Promise<MessageQueue[]> {
  return db
    .select()
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.campaignId, campaignId),
        inArray(messageQueue.status, statuses)
      )
    );
}

// ─── Status Transitions ──────────────────────────────────────────────────────

/**
 * Assign message to a chip.
 * Status: queued → assigned
 */
export async function assignMessageToChip(
  messageId: string,
  chipId: string
): Promise<void> {
  await db
    .update(messageQueue)
    .set({
      chipId,
      status: 'assigned',
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, messageId));
}

/**
 * Mark message as sending.
 * Status: assigned → sending
 */
export async function markMessageSending(messageId: string): Promise<void> {
  await db
    .update(messageQueue)
    .set({
      status: 'sending',
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, messageId));
}

/**
 * Mark message as sent with Evolution API message ID.
 * Status: sending → sent
 */
export async function markMessageSent(
  messageId: string,
  evolutionMessageId: string
): Promise<void> {
  await db
    .update(messageQueue)
    .set({
      status: 'sent',
      evolutionMessageId,
      sentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, messageId));
}

/**
 * Mark message as delivered.
 * Status: sent → delivered
 */
export async function markMessageDelivered(messageId: string): Promise<void> {
  await db
    .update(messageQueue)
    .set({
      status: 'delivered',
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, messageId));
}

/**
 * Mark message as read.
 * Status: delivered → read
 */
export async function markMessageRead(messageId: string): Promise<void> {
  await db
    .update(messageQueue)
    .set({
      status: 'read',
      readAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, messageId));
}

/**
 * Mark message as failed.
 * Status: * → failed
 */
export async function markMessageFailed(
  messageId: string,
  reason: string
): Promise<void> {
  await db
    .update(messageQueue)
    .set({
      status: 'failed',
      failedAt: new Date(),
      failReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(messageQueue.id, messageId));
}

/**
 * Mark message for retry.
 * Status: failed → retry (or queued if retry count exceeded)
 * Returns number of messages reset.
 */
export async function resetFailedMessagesForRetry(maxRetries: number): Promise<number> {
  // Get failed messages with retry count below threshold
  const toRetry = await db
    .select()
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.status, 'failed'),
        sql`${messageQueue.retryCount} < ${maxRetries}`
      )
    );

  if (toRetry.length === 0) return 0;

  // Update each message
  for (const msg of toRetry) {
    await db
      .update(messageQueue)
      .set({
        status: 'queued',
        retryCount: (msg.retryCount ?? 0) + 1,
        chipId: null,
        assignedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(messageQueue.id, msg.id));
  }

  return toRetry.length;
}

// ─── Stats & Bulk Operations ─────────────────────────────────────────────────

/**
 * Get queue statistics (count by status).
 */
export async function getQueueStats(
  campaignId?: string
): Promise<Record<string, number>> {
  const whereClause = campaignId
    ? eq(messageQueue.campaignId, campaignId)
    : undefined;

  const rows = await db
    .select({
      status: messageQueue.status,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(messageQueue)
    .where(whereClause)
    .groupBy(messageQueue.status);

  const stats: Record<string, number> = {
    queued: 0,
    assigned: 0,
    sending: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    retry: 0,
  };

  for (const row of rows) {
    if (row.status) {
      stats[row.status] = Number(row.count);
    }
  }

  return stats;
}

/**
 * Reassign all pending messages from a chip back to the queue.
 * Called when a chip goes to quarantined/banned status.
 * Returns number of messages reassigned.
 */
export async function reassignMessagesFromChip(chipId: string): Promise<number> {
  // Get messages to reassign first
  const toReassign = await db
    .select({ id: messageQueue.id })
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.chipId, chipId),
        inArray(messageQueue.status, ['assigned', 'sending'])
      )
    );

  if (toReassign.length === 0) return 0;

  // Update them
  await db
    .update(messageQueue)
    .set({
      status: 'queued',
      chipId: null,
      assignedAt: null,
      updatedAt: new Date(),
    })
    .where(
      inArray(
        messageQueue.id,
        toReassign.map(m => m.id)
      )
    );

  return toReassign.length;
}

/**
 * Delete all messages for a campaign.
 * Used when cancelling a campaign.
 */
export async function deleteCampaignMessages(campaignId: string): Promise<number> {
  // Get messages to delete first
  const toDelete = await db
    .select({ id: messageQueue.id })
    .from(messageQueue)
    .where(
      and(
        eq(messageQueue.campaignId, campaignId),
        inArray(messageQueue.status, ['queued', 'assigned', 'sending'])
      )
    );

  if (toDelete.length === 0) return 0;

  // Delete them
  await db
    .delete(messageQueue)
    .where(
      inArray(
        messageQueue.id,
        toDelete.map(m => m.id)
      )
    );

  return toDelete.length;
}

/**
 * Get total pending messages (queued + assigned + sending).
 */
export async function getPendingMessageCount(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(messageQueue)
    .where(inArray(messageQueue.status, ['queued', 'assigned', 'sending']));

  return Number(rows[0]?.count ?? 0);
}