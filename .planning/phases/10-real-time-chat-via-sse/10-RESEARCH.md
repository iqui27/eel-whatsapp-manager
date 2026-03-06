---
phase: 10-real-time-chat-via-sse
type: research
status: complete
created: 2026-03-06
---

# Phase 10 Research: Real-Time Chat via SSE

## Executive Summary

Phase 10 should be planned as **SSE-first realtime for chat surfaces only**, not as a WebSocket infrastructure phase.

Prescriptive conclusion:
- Use **Server-Sent Events** from a new authenticated route such as `GET /api/conversations/stream`
- Keep **Postgres as the source of truth**; only stream events after the existing write paths persist successfully
- Use a **small server-side event bus abstraction** for current production, because production runs as a single `next start` Node 22 process behind nginx on Contabo
- Keep a clean seam so the publisher backend can later swap to Postgres `LISTEN/NOTIFY` or a vendor if multi-instance delivery ever becomes a requirement

Why this is the right plan:
- Next.js Route Handlers already support streaming via the Web `Response`/`ReadableStream` APIs
- `EventSource` fits the current one-way requirement: queue changes and new messages flowing from server to UI
- WebSocket would force broader infrastructure decisions for this codebase and deploy model
- The current polling pain is isolated to `/conversas` and the dashboard queue panel, so the scope can stay tight

Confidence:
- **High** that SSE is the correct transport for this phase
- **High** that WebSocket should be deferred
- **Medium** that a process-local publisher is enough long-term; it is enough for the current production topology, but not for future horizontal scaling or Vercel-first runtime assumptions

## Current State in This Repo

Current polling surfaces:
- `src/app/conversas/page.tsx`
  - queue refresh every 10s
  - active conversation messages refresh every 5s
- `src/components/ChatQueuePanel.tsx`
  - open queue refresh every 15s

Current write paths that must fan out realtime events:
- `src/app/api/webhook/route.ts`
  - inbound WhatsApp messages create/update conversations and append persisted messages
- `src/app/api/conversations/route.ts`
  - manual conversation creation
  - status, handoff, and priority updates
- `src/app/api/conversations/[id]/messages/route.ts`
  - outbound agent replies after successful WhatsApp send
- `src/lib/db-conversations.ts`
  - shared persistence helpers for conversation/message writes

Current deploy/runtime facts:
- `package.json` uses `next` `16.1.6` and `react` `19.2.3`
- `next.config.ts` uses `output: 'standalone'`
- `README.md` documents production as Node 22 on a Contabo VPS behind nginx, running the app via `systemd` and `next start`
- the repo is also linked to Vercel via `.vercel/project.json`, so previews may still matter

Planning implication:
- production is currently a **single long-lived Node process**, which makes SSE straightforward and makes a process-local publisher acceptable for this phase
- Vercel previews and any future multi-instance scale are the edge cases that must be explicitly documented, not the primary design center

## Official Findings

### Next.js and SSE

What the official docs confirm:
- Route Handlers use the standard Web Request/Response APIs and can stream responses directly
- Route Handlers are **not cached by default**
- Route segment config supports explicit `runtime = 'nodejs'`
- route segment config also supports `maxDuration`, which matters on platforms that enforce function duration

Planning consequence:
- the SSE endpoint should be a Route Handler under the App Router and should explicitly export `runtime = 'nodejs'`
- explicit `dynamic = 'force-dynamic'` is optional, but reasonable as a clarity guardrail

### Browser/EventSource behavior

What the platform docs confirm:
- SSE connections reconnect automatically unless closed intentionally
- the protocol supports `id` and `retry`
- `EventSource` exposes `withCredentials`, which fits cookie-backed auth
- browsers warn about low per-origin connection limits when not using HTTP/2

Planning consequence:
- use the existing session cookie auth model instead of inventing token headers for the stream
- send `id:` on events and keep a client-side `lastEventId`
- keep the number of SSE connections low: one per mounted chat surface, not one per conversation row
- keep nginx HTTP/2 enabled in production

### nginx behavior that matters

nginx documents that proxy buffering can be disabled and that `X-Accel-Buffering` can control buffering behavior.

Planning consequence:
- the SSE route should send:
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache, no-transform`
  - `Connection: keep-alive`
  - `X-Accel-Buffering: no`
- runtime validation must include `curl -N` against production-like nginx to confirm events are not buffered

### WebSocket in this architecture

Official guidance is the main reason not to choose WebSocket here:
- Socket.IO’s Next.js guide uses a **custom server**
- that same guide states you cannot deploy that custom-server setup to Vercel
- the Next.js custom server guide warns that custom servers remove important Next.js optimizations
- the Next.js custom server guide also notes that standalone output does **not** trace custom server files
- Vercel’s guidance for WebSockets points users to external realtime providers rather than native Function-based WebSocket handling

Planning consequence:
- WebSocket is the wrong default for this phase because it would force one of these decisions immediately:
  - eject from the current `next start`/standalone deployment model into a custom server
  - run a sidecar websocket service
  - adopt a realtime vendor
- none of those are required to solve the current problem

## Recommended Transport Decision

## Standard Stack

- Next.js Route Handler for the stream endpoint
- `runtime = 'nodejs'`
- native Web Streams API (`ReadableStream` or `TransformStream`)
- browser `EventSource`
- existing cookie-backed auth via `validateSession()`
- existing REST writes for send/status/create flows
- existing Drizzle/Postgres persistence as canonical storage

## Architecture Patterns

### 1. Single authenticated SSE endpoint

Start with one route:
- `GET /api/conversations/stream`

Suggested query params:
- `conversationId`
- `voterId`
- `status`

Use one endpoint, not several transport flavors. The server can emit a small set of semantic events and the client can decide which ones matter.

### 2. Thin event model, not full snapshots by default

Recommended event types:
- `connected`
- `conversation.created`
- `conversation.updated`
- `conversation.deleted`
- `message.created`
- `heartbeat`

Recommended payload shape:
- `eventId`
- `conversationId`
- `messageId` when relevant
- `occurredAt`
- minimal queue fields needed to patch list state
- minimal message fields needed to append to the active thread

Rule:
- stream the smallest useful payload
- keep REST bootstrap endpoints for initial load and hard resync

### 3. Publish after persistence, never before

The correct write order is:
1. write to Postgres through the existing path
2. confirm success
3. publish an in-process realtime event
4. let SSE clients consume it

That preserves the existing invariant from the phase context:
- webhook/database writes remain canonical
- realtime transport is a fanout layer, not a second source of truth

### 4. Prefer process-local fanout for Phase 10

Recommended backend shape for this phase:
- create a small module such as `src/lib/conversation-realtime.ts`
- hold a process-local set/map of subscribers
- expose `subscribeConversationEvents()` and `publishConversationEvent()`
- call `publishConversationEvent()` from the existing write paths

Why this is the best current fit:
- production is a single Node process on VPS
- the app already tolerates process-local state in at least one place (`processedMessageIds` in `src/app/api/webhook/route.ts`)
- this avoids replacing client polling with hidden server polling
- it keeps latency lower than per-connection DB delta loops

Important limitation:
- this publisher is **deployment-topology aware**
- it is correct for the documented production topology
- it is not a cross-instance broadcast mechanism

### 5. Keep a future seam for multi-instance delivery

Do not plan WebSocket as the fallback path.

If multi-instance or Vercel-grade parity becomes a hard requirement later, the next upgrade path should be:
- Postgres `LISTEN/NOTIFY`, or
- a dedicated realtime service/vendor

The SSE API surface and client hook can stay the same; only the publisher backend changes.

### 6. Rehydrate on connect and reconnect

Client pattern:
- initial REST fetch for queue and selected conversation
- open SSE
- merge incoming deltas
- on `error` or reconnect, re-fetch the affected slice before trusting local state again

This avoids trying to make SSE the only state bootstrap path.

### 7. One stream per page, not per widget

For `/conversas`:
- one EventSource should serve both queue updates and active-thread updates

For the dashboard:
- `ChatQueuePanel` can open its own EventSource because it lives on a different page

Avoid:
- per-conversation EventSource instances
- separate queue stream and message stream on the same page

## Affected Files

Files that are almost certainly part of the phase:
- `src/app/conversas/page.tsx`
- `src/components/ChatQueuePanel.tsx`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/messages/route.ts`
- `src/app/api/webhook/route.ts`
- `src/lib/db-conversations.ts`

New files that should probably be introduced:
- `src/app/api/conversations/stream/route.ts`
- `src/lib/conversation-realtime.ts`
- `src/lib/use-conversation-stream.ts`

Files that may be touched depending on extraction decisions:
- `src/app/page.tsx`
- `src/lib/db-auth.ts`

Non-repo operational surface to validate:
- nginx site config for `zap.iqui27.app`

## Don't Hand-Roll

- Do not hand-roll a custom WebSocket server inside this phase
- Do not replace existing POST/PUT/POST message writes with socket RPC
- Do not make SSE the source of truth
- Do not introduce a global whole-app realtime bus
- Do not create one SSE connection per conversation item
- Do not add a full external realtime vendor unless planning explicitly changes the phase boundary

## Common Pitfalls

- **nginx buffering**
  - If buffering is not disabled, events arrive in bursts and SSE looks broken
- **too many connections**
  - Browsers warn about SSE connection caps without HTTP/2
- **duplicate UI state**
  - optimistic local appends must reconcile with the later persisted `message.created` event
- **preview/runtime mismatch**
  - a process-local publisher is correct on the documented VPS topology, but not guaranteed across Vercel instances
- **auth mismatch**
  - EventSource does not give you arbitrary request headers; plan around same-origin cookie auth
- **hidden server polling**
  - replacing browser polling with per-connection database polling is simpler on paper but usually the wrong trade here

## Validation Architecture

There is no established automated test harness in this repo right now, so validation should be planned in layers without turning the phase into “add a full test framework”.

### 1. Route-level contract validation

Must verify:
- unauthenticated stream returns `401`
- authenticated stream returns `200`
- response headers are correct for SSE
- heartbeats arrive without buffering
- the stream closes cleanly when the client disconnects

Minimal tooling:
- `curl -N`
- a small Node smoke script if needed
- `npm run build`

### 2. Write-path to event-path validation

Must verify each persisted write emits the correct realtime event:
- inbound webhook message
- agent reply
- new conversation creation
- status/handoff update
- priority update

The validation target is not “the event fires”.
The target is:
- DB write succeeds
- corresponding SSE event is published once
- the client merges it without duplication

### 3. UI validation for `/conversas`

Must verify:
- queue updates appear without waiting 10s
- active thread updates appear without waiting 5s
- sending an agent reply shows up once
- reconnect after a temporary network drop heals state
- resolved conversations stop accepting outbound replies and update queue state correctly

### 4. UI validation for dashboard queue

If the dashboard panel is in scope for Phase 10, verify:
- open queue count updates without waiting 15s
- newly opened conversations appear in the panel
- resolved/assigned conversations leave the `status=open` panel correctly

### 5. Production-like proxy validation

Must verify against the nginx-backed environment:
- no proxy buffering
- connection stays open long enough for normal operator use
- reconnect after app restart or nginx reload behaves cleanly

## Candidate Plan Shape

The cleanest plan split is probably 2 plans, with a possible 3rd only if dashboard scope needs isolating.

### Candidate Plan 10-01

Realtime backend foundation:
- stream route
- shared event contract
- process-local publisher module
- write-path fanout hooks
- headers, auth, heartbeat, reconnect semantics

### Candidate Plan 10-02

`/conversas` migration:
- shared `useConversationStream` hook
- remove queue/message polling loops
- merge stream events into queue + active thread state
- fallback revalidation UX

### Candidate Plan 10-03

Dashboard queue migration:
- move `ChatQueuePanel` from polling to the same SSE contract
- validate open-queue-only filtering and badge freshness

This 3rd plan is only needed if keeping dashboard work separate improves phase safety.

## Code Examples

These are planning anchors, not copy-paste-final implementations.

### SSE route shape

```ts
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await verifyAuth(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribeConversationEvents((event) => {
        controller.enqueue(encodeSseEvent(event));
      });

      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(': heartbeat\\n\\n'));
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

### Publish-after-write shape

```ts
const message = await addMessage(id, 'agent', body.content);

publishConversationEvent({
  type: 'message.created',
  eventId: message.id,
  conversationId: id,
  message,
  occurredAt: new Date().toISOString(),
});
```

### Client hook shape

```ts
useEffect(() => {
  const es = new EventSource(`/api/conversations/stream?conversationId=${selectedId ?? ''}`);

  es.addEventListener('message.created', (event) => {
    const payload = JSON.parse(event.data);
    setMessages((current) => mergeMessage(current, payload.message));
  });

  es.addEventListener('conversation.updated', (event) => {
    const payload = JSON.parse(event.data);
    setConversations((current) => mergeConversation(current, payload.conversation));
  });

  es.onerror = async () => {
    await reloadSnapshot();
  };

  return () => es.close();
}, [selectedId]);
```

## Open Questions That Matter Before Planning

- Is **production-only correctness** the target for Phase 10, or must Vercel previews behave identically?
- Should the dashboard `ChatQueuePanel` be part of Phase 10, or explicitly the last plan in the phase?
- Is a lightweight smoke script acceptable for validation, or does the user want test harness expansion in this phase?

Recommended assumption if the user does not answer:
- optimize for the documented production runtime on Contabo
- include dashboard queue migration in the phase, but only after `/conversas` is stable
- keep validation lightweight and targeted

## Sources

Primary sources used:
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Next.js route segment config (`runtime`, `maxDuration`): https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime
- Next.js custom server guide: https://nextjs.org/docs/app/guides/custom-server
- Socket.IO with Next.js: https://socket.io/how-to/use-with-nextjs
- MDN Server-Sent Events: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN `EventSource.withCredentials`: https://developer.mozilla.org/en-US/docs/Web/API/EventSource/withCredentials
- nginx proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Vercel WebSocket guidance: https://vercel.com/guides/do-vercel-serverless-functions-support-websocket-connections
- Vercel streaming functions: https://vercel.com/docs/functions/streaming-functions

## Recommended Planning Direction

Plan Phase 10 as:
- **SSE transport**
- **process-local publisher on the current production topology**
- **REST bootstrap + SSE deltas**
- **`/conversas` first, dashboard queue second**

Do **not** plan:
- WebSocket upgrades
- custom server adoption
- vendor realtime adoption
- app-wide subscription infrastructure

Success for this phase means:
- `/conversas` no longer depends on 5s/10s polling in normal operation
- dashboard queue polling is either removed or explicitly isolated into the last plan
- the database remains canonical
- nginx and reconnect behavior are validated in a production-like environment
