'use client';

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { Conversation, ConversationMessage } from '@/db/schema';
import {
  CONVERSATION_STREAM_EVENT,
  encodeConversationStreamCursor,
  getConversationCursorPoint,
  getMessageCursorPoint,
  type ConversationConnectedPayload,
  type ConversationHeartbeatPayload,
  type ConversationStreamFilters,
  type ConversationUpsertPayload,
  type MessageCreatedPayload,
} from '@/lib/conversation-stream';

export type ConversationStreamStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline';

type UseConversationStreamOptions = ConversationStreamFilters & {
  enabled?: boolean;
  initialCursor?: string | null;
  onConversationUpsert?: (conversation: Conversation, cursor: string) => void;
  onMessageCreated?: (message: ConversationMessage, cursor: string) => void;
};

type UseConversationStreamResult = {
  cursor: string | null;
  status: ConversationStreamStatus;
  lastEventAt: string | null;
  reconnectAttempts: number;
  forceReconnect: () => void;
};

const MAX_RECONNECT_ATTEMPTS = 8;
const OFFLINE_RETRY_MS = 30000;
const HEARTBEAT_TIMEOUT_MS = 45000;

export function useConversationStream({
  enabled = true,
  initialCursor,
  status,
  conversationId,
  voterId,
  onConversationUpsert,
  onMessageCreated,
}: UseConversationStreamOptions): UseConversationStreamResult {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const cursorRef = useRef<string | null>(initialCursor ?? null);
  const heartbeatTimerRef = useRef<number | null>(null);

  const [streamStatus, setStreamStatus] = useState<ConversationStreamStatus>(
    enabled ? 'connecting' : 'idle',
  );
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const onConversationUpsertRef = useRef(onConversationUpsert);
  const onMessageCreatedRef = useRef(onMessageCreated);

  useEffect(() => {
    onConversationUpsertRef.current = onConversationUpsert;
  }, [onConversationUpsert]);

  useEffect(() => {
    onMessageCreatedRef.current = onMessageCreated;
  }, [onMessageCreated]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const clearHeartbeatTimer = useCallback(() => {
    if (heartbeatTimerRef.current !== null) {
      window.clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    clearHeartbeatTimer();
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, [clearReconnectTimer, clearHeartbeatTimer]);

  useEffect(() => {
    cursorRef.current = initialCursor ?? null;
    reconnectAttemptsRef.current = 0;

    let cancelled = false;
    const resetTimer = window.setTimeout(() => {
      if (cancelled) return;
      startTransition(() => {
        setCursor(initialCursor ?? null);
        setReconnectAttempts(0);
      });
    }, 0);

    const handleMetaEvent = (payload: ConversationConnectedPayload | ConversationHeartbeatPayload) => {
      if (cancelled) return;
      resetHeartbeat();
      cursorRef.current = payload.cursor;
      startTransition(() => {
        setCursor(payload.cursor);
        setLastEventAt(payload.now);
        setStreamStatus('live');
        setReconnectAttempts(0);
      });
      reconnectAttemptsRef.current = 0;
    };

    const handleConversationUpsert = (payload: ConversationUpsertPayload) => {
      if (cancelled) return;
      resetHeartbeat();
      cursorRef.current = payload.cursor;
      startTransition(() => {
        setCursor(payload.cursor);
        setLastEventAt(new Date().toISOString());
        setStreamStatus('live');
        setReconnectAttempts(0);
      });
      reconnectAttemptsRef.current = 0;
      onConversationUpsertRef.current?.(payload.conversation, payload.cursor);
    };

    const handleMessageCreated = (payload: MessageCreatedPayload) => {
      if (cancelled) return;
      resetHeartbeat();
      cursorRef.current = payload.cursor;
      startTransition(() => {
        setCursor(payload.cursor);
        setLastEventAt(new Date().toISOString());
        setStreamStatus('live');
        setReconnectAttempts(0);
      });
      reconnectAttemptsRef.current = 0;
      onMessageCreatedRef.current?.(payload.message, payload.cursor);
    };

    const resetHeartbeat = () => {
      if (heartbeatTimerRef.current !== null) window.clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = window.setTimeout(() => {
        // No events for 45s — connection is stale, force reconnect
        if (!cancelled) {
          disconnect();
          reconnectTimerRef.current = window.setTimeout(() => { connect(); }, 500);
        }
      }, HEARTBEAT_TIMEOUT_MS);
    };

    const connect = () => {
      disconnect();

      if (!enabled || cancelled) {
        setStreamStatus('idle');
        return;
      }

      const url = new URL('/api/conversations/stream', window.location.origin);
      if (status) url.searchParams.set('status', status);
      if (conversationId) url.searchParams.set('conversationId', conversationId);
      if (voterId) url.searchParams.set('voterId', voterId);
      if (cursorRef.current) url.searchParams.set('since', cursorRef.current);

      const source = new EventSource(url);
      eventSourceRef.current = source;
      setStreamStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');

      source.onopen = () => {
        if (cancelled) return;
        resetHeartbeat();
        startTransition(() => {
          setStreamStatus('live');
          setReconnectAttempts(reconnectAttemptsRef.current);
        });
      };

      source.addEventListener(CONVERSATION_STREAM_EVENT.connected, (event) => {
        handleMetaEvent(JSON.parse(event.data) as ConversationConnectedPayload);
      });

      source.addEventListener(CONVERSATION_STREAM_EVENT.snapshotReady, (event) => {
        handleMetaEvent(JSON.parse(event.data) as ConversationConnectedPayload);
      });

      source.addEventListener(CONVERSATION_STREAM_EVENT.heartbeat, (event) => {
        handleMetaEvent(JSON.parse(event.data) as ConversationHeartbeatPayload);
      });

      source.addEventListener(CONVERSATION_STREAM_EVENT.conversationUpsert, (event) => {
        handleConversationUpsert(JSON.parse(event.data) as ConversationUpsertPayload);
      });

      source.addEventListener(CONVERSATION_STREAM_EVENT.messageCreated, (event) => {
        handleMessageCreated(JSON.parse(event.data) as MessageCreatedPayload);
      });

      source.onerror = () => {
        source.close();
        eventSourceRef.current = null;

        if (cancelled) return;

        reconnectAttemptsRef.current += 1;
        const attempts = reconnectAttemptsRef.current;
        const nextStatus = attempts >= MAX_RECONNECT_ATTEMPTS ? 'offline' : 'reconnecting';
        const nextDelay = attempts >= MAX_RECONNECT_ATTEMPTS
          ? OFFLINE_RETRY_MS
          : Math.min(1000 * 2 ** (attempts - 1), 15000);

        startTransition(() => {
          setStreamStatus(nextStatus);
          setReconnectAttempts(attempts);
        });

        reconnectTimerRef.current = window.setTimeout(() => {
          connect();
        }, nextDelay);
      };
    };

    connect();

    // Online/offline browser event handlers
    const handleOnline = () => {
      if (cancelled) return;
      reconnectAttemptsRef.current = 0;
      connect();
    };
    const handleOffline = () => {
      if (cancelled) return;
      clearHeartbeatTimer();
      disconnect();
      startTransition(() => setStreamStatus('offline'));
    };

    // Visibility change — reconnect when tab comes back to foreground
    // (browser may have silently killed the SSE connection while hidden)
    const handleVisibilityChange = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      // Only reconnect if connection appears stale (not actively live)
      if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
        reconnectAttemptsRef.current = 0;
        connect();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect();
    };
  }, [conversationId, disconnect, clearHeartbeatTimer, enabled, initialCursor, status, voterId]);

  const forceReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    // Setting the deps via a state trick will re-trigger the effect to reconnect
    setStreamStatus('connecting');
  }, []);

  return {
    cursor,
    status: streamStatus,
    lastEventAt,
    reconnectAttempts,
    forceReconnect,
  };
}

export function buildConversationStreamCursor(
  conversations: Conversation[],
  messages: ConversationMessage[],
): string {
  const latestConversation = [...conversations].sort(compareConversationCursor).at(-1);
  const latestMessage = [...messages].sort(compareMessageCursor).at(-1);

  return encodeConversationStreamCursor({
    conversations: latestConversation ? getConversationCursorPoint(latestConversation) : undefined,
    messages: latestMessage ? getMessageCursorPoint(latestMessage) : undefined,
  });
}

export function upsertConversationList(
  conversations: Conversation[],
  nextConversation: Conversation,
): Conversation[] {
  const index = conversations.findIndex((conversation) => conversation.id === nextConversation.id);

  if (index === -1) {
    return sortConversationsByQueuePriority([...conversations, nextConversation]);
  }

  const next = [...conversations];
  next[index] = { ...next[index], ...nextConversation };
  return sortConversationsByQueuePriority(next);
}

export function appendUniqueMessage(
  messages: ConversationMessage[],
  nextMessage: ConversationMessage,
): ConversationMessage[] {
  if (messages.some((message) => message.id === nextMessage.id)) {
    return messages;
  }

  return [...messages, nextMessage].sort(compareMessageCursor);
}

export function sortConversationsByQueuePriority(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) => {
    const priorityDelta = (right.priority ?? 0) - (left.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;

    const lastMessageDelta = compareDate(right.lastMessageAt, left.lastMessageAt);
    if (lastMessageDelta !== 0) return lastMessageDelta;

    const updatedDelta = compareDate(right.updatedAt, left.updatedAt);
    if (updatedDelta !== 0) return updatedDelta;

    const createdDelta = compareDate(right.createdAt, left.createdAt);
    if (createdDelta !== 0) return createdDelta;

    return right.id.localeCompare(left.id);
  });
}

function compareConversationCursor(left: Conversation, right: Conversation): number {
  const atDelta = compareDate(
    left.updatedAt ?? left.lastMessageAt ?? left.createdAt,
    right.updatedAt ?? right.lastMessageAt ?? right.createdAt,
  );
  if (atDelta !== 0) return atDelta;
  return left.id.localeCompare(right.id);
}

function compareMessageCursor(left: ConversationMessage, right: ConversationMessage): number {
  const atDelta = compareDate(left.createdAt, right.createdAt);
  if (atDelta !== 0) return atDelta;
  return left.id.localeCompare(right.id);
}

function compareDate(
  left: Date | string | null | undefined,
  right: Date | string | null | undefined,
): number {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime - rightTime;
}
