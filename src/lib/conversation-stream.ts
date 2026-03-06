import type { Conversation, ConversationMessage } from '@/db/schema';

export type ConversationStreamFilters = {
  status?: string;
  conversationId?: string;
  voterId?: string;
};

export type ConversationStreamCursorPoint = {
  at: string;
  id: string;
};

export type ConversationStreamCursor = {
  conversations?: ConversationStreamCursorPoint;
  messages?: ConversationStreamCursorPoint;
};

export const CONVERSATION_STREAM_EVENT = {
  connected: 'connected',
  snapshotReady: 'snapshot.ready',
  heartbeat: 'heartbeat',
  conversationUpsert: 'conversation.upsert',
  messageCreated: 'message.created',
} as const;

export type ConversationStreamEventName =
  (typeof CONVERSATION_STREAM_EVENT)[keyof typeof CONVERSATION_STREAM_EVENT];

type BaseStreamPayload = {
  cursor: string;
};

export type ConversationConnectedPayload = BaseStreamPayload & {
  filters: ConversationStreamFilters;
  now: string;
};

export type ConversationHeartbeatPayload = BaseStreamPayload & {
  now: string;
};

export type ConversationUpsertPayload = BaseStreamPayload & {
  conversation: Conversation;
};

export type MessageCreatedPayload = BaseStreamPayload & {
  message: ConversationMessage;
};

export function encodeConversationStreamCursor(cursor: ConversationStreamCursor): string {
  return encodeURIComponent(JSON.stringify(cursor));
}

export function parseConversationStreamCursor(
  rawCursor: string | null | undefined,
): ConversationStreamCursor {
  if (!rawCursor) return {};

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCursor)) as ConversationStreamCursor;
    return normalizeConversationStreamCursor(parsed);
  } catch {
    const legacyDate = new Date(rawCursor);
    if (!Number.isNaN(legacyDate.getTime())) {
      const point = { at: legacyDate.toISOString(), id: '' };
      return { conversations: point, messages: point };
    }

    return {};
  }
}

export function createConversationStreamCursor(now = new Date()): ConversationStreamCursor {
  const point = { at: now.toISOString(), id: '' };
  return { conversations: point, messages: point };
}

export function getConversationCursorPoint(
  conversation: Pick<Conversation, 'id' | 'updatedAt' | 'lastMessageAt' | 'createdAt'>,
): ConversationStreamCursorPoint {
  return {
    at: toCursorDate(conversation.updatedAt ?? conversation.lastMessageAt ?? conversation.createdAt),
    id: conversation.id,
  };
}

export function getMessageCursorPoint(
  message: Pick<ConversationMessage, 'id' | 'createdAt'>,
): ConversationStreamCursorPoint {
  return {
    at: toCursorDate(message.createdAt),
    id: message.id,
  };
}

export function withConversationCursor(
  cursor: ConversationStreamCursor,
  conversation: Pick<Conversation, 'id' | 'updatedAt' | 'lastMessageAt' | 'createdAt'>,
): ConversationStreamCursor {
  return {
    ...cursor,
    conversations: getConversationCursorPoint(conversation),
  };
}

export function withMessageCursor(
  cursor: ConversationStreamCursor,
  message: Pick<ConversationMessage, 'id' | 'createdAt'>,
): ConversationStreamCursor {
  return {
    ...cursor,
    messages: getMessageCursorPoint(message),
  };
}

export function createConnectedPayload(
  cursor: ConversationStreamCursor,
  filters: ConversationStreamFilters,
): ConversationConnectedPayload {
  return {
    cursor: encodeConversationStreamCursor(cursor),
    filters,
    now: new Date().toISOString(),
  };
}

export function createHeartbeatPayload(
  cursor: ConversationStreamCursor,
): ConversationHeartbeatPayload {
  return {
    cursor: encodeConversationStreamCursor(cursor),
    now: new Date().toISOString(),
  };
}

export function createConversationUpsertPayload(
  conversation: Conversation,
  cursor: ConversationStreamCursor,
): ConversationUpsertPayload {
  return {
    conversation,
    cursor: encodeConversationStreamCursor(cursor),
  };
}

export function createMessageCreatedPayload(
  message: ConversationMessage,
  cursor: ConversationStreamCursor,
): MessageCreatedPayload {
  return {
    message,
    cursor: encodeConversationStreamCursor(cursor),
  };
}

export function formatConversationStreamEvent(
  event: ConversationStreamEventName,
  payload: object,
): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function normalizeConversationStreamCursor(
  cursor: ConversationStreamCursor,
): ConversationStreamCursor {
  return {
    conversations: normalizeCursorPoint(cursor.conversations),
    messages: normalizeCursorPoint(cursor.messages),
  };
}

function normalizeCursorPoint(
  point: ConversationStreamCursorPoint | undefined,
): ConversationStreamCursorPoint | undefined {
  if (!point?.at) return undefined;

  const at = new Date(point.at);
  if (Number.isNaN(at.getTime())) return undefined;

  return {
    at: at.toISOString(),
    id: point.id ?? '',
  };
}

function toCursorDate(value: Date | string | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return new Date(value).toISOString();
}
