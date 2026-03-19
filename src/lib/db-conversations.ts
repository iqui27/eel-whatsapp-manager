/**
 * Conversations data access — Drizzle / Supabase
 * Human-voter conversation threads with message history.
 */
import { db } from '@/db';
import {
  conversations, conversationMessages,
  type Conversation, type NewConversation,
  type ConversationMessage,
} from '@/db/schema';
import type { ConversationStreamCursorPoint, ConversationStreamFilters } from '@/lib/conversation-stream';
import { and, asc, desc, eq, gt, inArray, or } from 'drizzle-orm';

export type { Conversation, NewConversation, ConversationMessage };

type ConversationStatus = NonNullable<Conversation['status']>;

function buildSinceCondition<TColumn>(
  column: TColumn,
  idColumn: typeof conversations.id | typeof conversationMessages.id,
  since: ConversationStreamCursorPoint | undefined,
) {
  if (!since) return undefined;

  const sinceDate = new Date(since.at);
  if (Number.isNaN(sinceDate.getTime())) return undefined;

  return or(
    gt(column as typeof conversations.updatedAt, sinceDate),
    and(eq(column as typeof conversations.updatedAt, sinceDate), gt(idColumn, since.id)),
  );
}

export async function loadConversations(status?: string): Promise<Conversation[]> {
  if (status) {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.status, status as NonNullable<Conversation['status']>))
      .orderBy(desc(conversations.priority), desc(conversations.lastMessageAt));
  }
  return db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.priority), desc(conversations.lastMessageAt));
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return rows[0];
}

export async function getConversationsByVoter(voterId: string): Promise<Conversation[]> {
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.voterId, voterId))
    .orderBy(desc(conversations.priority), desc(conversations.lastMessageAt));
}

export async function addConversation(
  data: Omit<NewConversation, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Conversation> {
  const rows = await db.insert(conversations).values(data).returning();
  return rows[0];
}

export async function updateConversationStatus(
  id: string,
  status: NonNullable<Conversation['status']>,
  assignedAgent?: string,
): Promise<Conversation | undefined> {
  const rows = await db
    .update(conversations)
    .set({
      status,
      ...(assignedAgent !== undefined ? { assignedAgent } : {}),
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning();
  return rows[0];
}

export async function addMessage(
  conversationId: string,
  sender: NonNullable<ConversationMessage['sender']>,
  content: string,
): Promise<ConversationMessage> {
  const now = new Date();
  const [message] = await db
    .insert(conversationMessages)
    .values({ conversationId, sender, content })
    .returning();

  // Update lastMessageAt on the parent conversation
  await db
    .update(conversations)
    .set({ lastMessageAt: now, updatedAt: now })
    .where(eq(conversations.id, conversationId));

  return message;
}

export async function getMessages(conversationId: string): Promise<ConversationMessage[]> {
  return db
    .select()
    .from(conversationMessages)
    .where(eq(conversationMessages.conversationId, conversationId))
    .orderBy(conversationMessages.createdAt);
}

export async function getConversationDeltas(
  filters: ConversationStreamFilters & {
    since?: ConversationStreamCursorPoint;
    limit?: number;
  },
): Promise<Conversation[]> {
  const conditions = [
    filters.status
      ? eq(conversations.status, filters.status as ConversationStatus)
      : undefined,
    filters.conversationId ? eq(conversations.id, filters.conversationId) : undefined,
    filters.voterId ? eq(conversations.voterId, filters.voterId) : undefined,
    buildSinceCondition(conversations.updatedAt, conversations.id, filters.since),
  ].filter(Boolean);

  return db
    .select()
    .from(conversations)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(conversations.updatedAt), asc(conversations.id))
    .limit(filters.limit ?? 100);
}

export async function getMessageDeltas(
  filters: ConversationStreamFilters & {
    since?: ConversationStreamCursorPoint;
    limit?: number;
    conversationIds?: string[];
  },
): Promise<ConversationMessage[]> {
  const conditions = [
    filters.status
      ? eq(conversations.status, filters.status as ConversationStatus)
      : undefined,
    filters.conversationId ? eq(conversationMessages.conversationId, filters.conversationId) : undefined,
    filters.voterId ? eq(conversations.voterId, filters.voterId) : undefined,
    // Allow polling messages for a set of tracked conversation IDs (queue mode)
    filters.conversationIds && filters.conversationIds.length > 0
      ? inArray(conversationMessages.conversationId, filters.conversationIds)
      : undefined,
    buildSinceCondition(conversationMessages.createdAt, conversationMessages.id, filters.since),
  ].filter(Boolean);

  const rows = await db
    .select({ message: conversationMessages })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(conversationMessages.createdAt), asc(conversationMessages.id))
    .limit(filters.limit ?? 100);

  return rows.map((row) => row.message);
}
