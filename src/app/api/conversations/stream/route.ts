import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/api-auth';
import { isVoterInScope } from '@/lib/authorization';
import {
  CONVERSATION_STREAM_EVENT,
  createConnectedPayload,
  createConversationStreamCursor,
  createConversationUpsertPayload,
  createHeartbeatPayload,
  createMessageCreatedPayload,
  formatConversationStreamEvent,
  parseConversationStreamCursor,
  withConversationCursor,
  withMessageCursor,
  type ConversationStreamEventName,
  type ConversationStreamFilters,
} from '@/lib/conversation-stream';
import { getConversationDeltas, getMessageDeltas } from '@/lib/db-conversations';
import { getVoter } from '@/lib/db-voters';

// Increased from 1.5s to 5s — reduces DB queries from ~40/min to ~12/min per SSE connection
const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 15000;
const MAX_TRACKED_CONVERSATIONS = 200; // cap to prevent memory leaks on long-running connections
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ─── Connection Tracking ──────────────────────────────────────────────────────
const MAX_CONNECTIONS_GLOBAL = 50;
const MAX_CONNECTIONS_PER_USER = 3;
const MAX_CONNECTION_LIFETIME_MS = 5 * 60 * 1000; // 5 minutes — forces reconnect (client already handles this)

interface ActiveConnection {
  userId: string;
  startedAt: number;
}

const activeConnections = new Map<string, ActiveConnection>(); // connectionId → info
let connectionCounter = 0;

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'conversations.view', 'Seu operador não pode acompanhar o stream de conversas');
  if (auth.response) return auth.response;

  // ─── Connection limits ────────────────────────────────────────────────────
  const userId = auth.actor?.userId ?? 'anonymous';
  const connectionId = `${userId}-${++connectionCounter}`;

  if (activeConnections.size >= MAX_CONNECTIONS_GLOBAL) {
    return new Response(
      JSON.stringify({ error: 'Limite global de conexões atingido', limit: MAX_CONNECTIONS_GLOBAL }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const userConnectionCount = Array.from(activeConnections.values()).filter(
    (conn) => conn.userId === userId,
  ).length;
  if (userConnectionCount >= MAX_CONNECTIONS_PER_USER) {
    return new Response(
      JSON.stringify({
        error: 'Limite de conexões por usuário atingido',
        limit: MAX_CONNECTIONS_PER_USER,
        current: userConnectionCount,
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const connectionStartedAt = Date.now();
  activeConnections.set(connectionId, { userId, startedAt: connectionStartedAt });

  const { searchParams } = new URL(request.url);
  const filters: ConversationStreamFilters = {
    status: searchParams.get('status') ?? undefined,
    conversationId: searchParams.get('conversationId') ?? undefined,
    voterId: searchParams.get('voterId') ?? undefined,
  };

  let cursor = parseConversationStreamCursor(searchParams.get('since'));
  if (!cursor.conversations && !cursor.messages) {
    cursor = createConversationStreamCursor();
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeatAt = 0;
      const trackedConversationIds = new Set<string>();

      const close = () => {
        if (closed) return;
        closed = true;
        activeConnections.delete(connectionId);
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      const push = (event: ConversationStreamEventName, payload: object) => {
        if (closed) return;
        controller.enqueue(encoder.encode(formatConversationStreamEvent(event, payload)));
      };

      const abortHandler = () => {
        close();
      };

      request.signal.addEventListener('abort', abortHandler, { once: true });

      const run = async () => {
        // Per-cycle voter lookup cache: avoids N+1 queries for voter scope checks
        const voterCache = new Map<string, Awaited<ReturnType<typeof getVoter>>>();
        let cycleCount = 0;

        const getCachedVoter = async (id: string) => {
          if (voterCache.has(id)) return voterCache.get(id)!;
          const voter = await getVoter(id);
          voterCache.set(id, voter);
          return voter;
        };

        try {
          if (filters.status) {
            const seededConversations = await getConversationDeltas(filters);
            for (const conversation of seededConversations) {
              if (trackedConversationIds.size < MAX_TRACKED_CONVERSATIONS) {
                trackedConversationIds.add(conversation.id);
              }
            }
          }

          push(CONVERSATION_STREAM_EVENT.connected, createConnectedPayload(cursor, filters));
          push(CONVERSATION_STREAM_EVENT.snapshotReady, createConnectedPayload(cursor, filters));
          heartbeatAt = Date.now();

          while (!request.signal.aborted && !closed) {
            let emitted = false;

            const conversationDeltas = await getConversationDeltas({
              ...filters,
              conversationId: undefined, // never filter conversation list by id — only messages use this
              status: undefined,
              since: cursor.conversations,
            });

            for (const conversation of conversationDeltas) {
              if (conversation.voterId && auth.actor?.regionScope) {
                const voter = await getCachedVoter(conversation.voterId);
                if (voter && !isVoterInScope(auth.actor, voter)) {
                  continue;
                }
              }
              const matchesStatus = !filters.status || conversation.status === filters.status;
              const shouldEmit = matchesStatus || trackedConversationIds.has(conversation.id);
              if (!shouldEmit) {
                continue;
              }

              if (matchesStatus) {
                // Cap tracked conversations to prevent unbounded memory growth
                if (trackedConversationIds.size < MAX_TRACKED_CONVERSATIONS) {
                  trackedConversationIds.add(conversation.id);
                }
              } else {
                trackedConversationIds.delete(conversation.id);
              }

              cursor = withConversationCursor(cursor, conversation);
              push(
                CONVERSATION_STREAM_EVENT.conversationUpsert,
                createConversationUpsertPayload(conversation, cursor),
              );
              emitted = true;
            }

            if (filters.conversationId || filters.voterId) {
              const messageDeltas = await getMessageDeltas({
                ...filters,
                since: cursor.messages,
              });

              for (const message of messageDeltas) {
                if (filters.voterId) {
                  const voter = await getCachedVoter(filters.voterId);
                  if (voter && !isVoterInScope(auth.actor, voter)) {
                    continue;
                  }
                }
                cursor = withMessageCursor(cursor, message);
                push(
                  CONVERSATION_STREAM_EVENT.messageCreated,
                  createMessageCreatedPayload(message, cursor),
                );
                emitted = true;
              }
            } else if (trackedConversationIds.size > 0) {
              // No explicit conversation/voter filter but we have tracked conversations
              // (e.g. queue mode). Poll messages for all tracked conversations so that
              // inbound replies surface in real time.
              const messageDeltas = await getMessageDeltas({
                since: cursor.messages,
                conversationIds: Array.from(trackedConversationIds),
              });

              for (const message of messageDeltas) {
                cursor = withMessageCursor(cursor, message);
                push(
                  CONVERSATION_STREAM_EVENT.messageCreated,
                  createMessageCreatedPayload(message, cursor),
                );
                emitted = true;
              }
            }

            const now = Date.now();
            if (!emitted && now - heartbeatAt >= HEARTBEAT_INTERVAL_MS) {
              push(CONVERSATION_STREAM_EVENT.heartbeat, createHeartbeatPayload(cursor));
              heartbeatAt = now;
            }

            // Refresh voter cache every ~60s (12 cycles at 5s) to avoid stale data
            cycleCount++;
            if (cycleCount % 12 === 0) voterCache.clear();

            // Stale connection cleanup safety valve (every ~5 min)
            if (cycleCount % 60 === 0) {
              const cutoff = Date.now() - MAX_CONNECTION_LIFETIME_MS * 2;
              for (const [id, conn] of activeConnections) {
                if (conn.startedAt < cutoff) {
                  activeConnections.delete(id);
                }
              }
            }

            await waitForNextPoll(request.signal);

            // Server-side max lifetime — forces reconnect to prevent stale connections
            if (Date.now() - connectionStartedAt > MAX_CONNECTION_LIFETIME_MS) {
              close();
              break;
            }
          }
        } catch (error) {
          if (!request.signal.aborted) {
            console.error('[GET /api/conversations/stream]', error);
          }
        } finally {
          request.signal.removeEventListener('abort', abortHandler);
          close();
        }
      };

      void run();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const timeoutId = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, POLL_INTERVAL_MS);

    const onAbort = () => {
      clearTimeout(timeoutId);
      resolve();
    };

    signal.addEventListener('abort', onAbort, { once: true });
  });
}
