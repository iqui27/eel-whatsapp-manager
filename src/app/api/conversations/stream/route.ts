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

const POLL_INTERVAL_MS = 1500;
const HEARTBEAT_INTERVAL_MS = 15000;
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'conversations.view', 'Seu operador não pode acompanhar o stream de conversas');
  if (auth.response) return auth.response;

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
        try {
          if (filters.status) {
            const seededConversations = await getConversationDeltas(filters);
            for (const conversation of seededConversations) {
              trackedConversationIds.add(conversation.id);
            }
          }

          push(CONVERSATION_STREAM_EVENT.connected, createConnectedPayload(cursor, filters));
          push(CONVERSATION_STREAM_EVENT.snapshotReady, createConnectedPayload(cursor, filters));
          heartbeatAt = Date.now();

          while (!request.signal.aborted && !closed) {
            let emitted = false;

            const conversationDeltas = await getConversationDeltas({
              ...filters,
              status: undefined,
              since: cursor.conversations,
            });

            for (const conversation of conversationDeltas) {
              if (conversation.voterId && auth.actor?.regionScope) {
                const voter = await getVoter(conversation.voterId);
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
                trackedConversationIds.add(conversation.id);
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
                  const voter = await getVoter(filters.voterId);
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
            }

            const now = Date.now();
            if (!emitted && now - heartbeatAt >= HEARTBEAT_INTERVAL_MS) {
              push(CONVERSATION_STREAM_EVENT.heartbeat, createHeartbeatPayload(cursor));
              heartbeatAt = now;
            }

            await waitForNextPoll(request.signal);
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
