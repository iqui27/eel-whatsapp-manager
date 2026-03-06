---
phase: 10-real-time-chat-via-sse
plan: "01"
subsystem: conversations-realtime
tags: [sse, conversations, nextjs, drizzle, auth, realtime]
requires:
  - phase: 06-hitl-crm
    provides: conversations API, message persistence, operator chat surfaces
  - phase: 09-real-data
    provides: webhook ingress and agent replies persisted in Postgres
provides:
  - authenticated SSE route for persisted conversation/message deltas
  - shared stream contract with cursor resume and heartbeats
  - delta-query helpers scoped by status, voter, and conversation
affects: [conversas, dashboard, api]
tech-stack:
  added:
    - src/lib/conversation-stream.ts
  patterns:
    - realtime fanout reads persisted database state instead of introducing a second transport source of truth
    - clients resume streams with encoded cursor tokens built from persisted timestamps and ids
key-files:
  created:
    - src/lib/conversation-stream.ts
    - src/app/api/conversations/stream/route.ts
  modified:
    - src/lib/db-conversations.ts
key-decisions:
  - "Realtime transport for chat is SSE over authenticated HTTP so it fits the existing Next.js route model without a separate WebSocket service."
  - "Queue deltas use persisted conversation.updatedAt while thread deltas use conversation_messages.createdAt, both with id tie-breaks for stable resume."
  - "A fresh connection without `since` starts from the current watermark; bootstrap/replay remains the responsibility of the existing REST reads plus client-provided cursors."
patterns-established:
  - "Stream payloads carry the next encoded cursor so clients can reconnect without refetching full queue/thread history."
  - "Only conversation surfaces subscribe to the stream; write paths remain the existing REST and webhook handlers."
requirements-completed: [RT-01, RT-02, RT-05]
duration: 18 min
completed: 2026-03-06
---

# Phase 10 Plan 01: SSE Backend Foundation Summary

**The backend now exposes an authenticated conversation SSE stream backed by persisted delta queries, with cursor resume and heartbeat support**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-06T15:15:00-0300
- **Completed:** 2026-03-06T15:32:55-0300
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `src/lib/db-conversations.ts` with reusable delta readers for conversation rows and message rows, filtered by `status`, `conversationId`, `voterId`, and cursor.
- Added `src/lib/conversation-stream.ts` to centralize event names, cursor parsing/encoding, heartbeat payloads, and SSE serialization helpers.
- Created `GET /api/conversations/stream`, authenticated with the existing `auth` cookie, streaming `conversation.upsert` and `message.created` events over `text/event-stream`.
- Kept realtime additive: webhook ingress and operator sends still persist to Postgres first, and the stream only fans out persisted rows.

## Task Commits

Each task was committed atomically:

1. **Task 1-2: SSE backend foundation** - pending commit in this execution step

## Files Created/Modified

- `src/lib/db-conversations.ts` - Adds cursor-aware delta reads for queue conversations and thread messages.
- `src/lib/conversation-stream.ts` - Defines the shared SSE contract, cursor encoding/decoding, and payload builders.
- `src/app/api/conversations/stream/route.ts` - Implements the authenticated SSE route with replay cursor, polling loop, heartbeats, and abort cleanup.

## Decisions Made

- Used SSE instead of introducing a separate WebSocket service, matching the planning decision for this phase.
- Scoped message streaming to `conversationId` or `voterId` listeners so queue-only consumers do not pay for thread deltas.
- Defaulted stream start without `since` to the current watermark to avoid duplicating the initial REST bootstrap.

## Deviations from Plan

None.

## Issues Encountered

- Local authenticated smoke test could not be completed because the session database was unavailable (`ECONNREFUSED` to Postgres) in this shell environment.
- `next build` still emits the pre-existing multiple-lockfile workspace-root warning, but the build completed successfully.

## User Setup Required

None.

## Next Phase Readiness

- `/conversas` can now switch from timer polling to `EventSource` while preserving initial REST bootstrap.
- The dashboard queue panel can reuse the same stream contract for `status=open` without a second realtime implementation.

## Self-Check: PASSED

- `FOUND: node_modules/.bin/tsc --noEmit`
- `FOUND: npm run build`
- `FOUND: /api/conversations/stream`
- `FOUND: curl unauthenticated stream returns 401`
- `FOUND: text/event-stream route compiled into production build`
