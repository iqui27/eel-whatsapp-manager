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
import { eq, desc, and } from 'drizzle-orm';

export type { Conversation, NewConversation, ConversationMessage };

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
