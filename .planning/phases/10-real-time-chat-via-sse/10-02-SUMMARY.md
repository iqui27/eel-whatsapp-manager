---
phase: 10-real-time-chat-via-sse
plan: "02"
subsystem: operator-chat
tags: [sse, eventsource, react, conversations, crm]
requires:
  - phase: 10-real-time-chat-via-sse
    provides: authenticated SSE route and cursor/event contract
provides:
  - shared EventSource hook with reconnect/backoff and cursor tracking
  - `/conversas` migrated off queue/message polling timers
  - duplicate-safe queue and thread merges fed by persisted stream events
affects: [conversas, crm]
tech-stack:
  added:
    - src/lib/use-conversation-stream.ts
  patterns:
    - REST bootstrap remains for first render and hard refresh while live updates arrive through SSE
    - stream reconnection degrades to a visible offline fallback instead of silently restoring polling timers
key-files:
  created:
    - src/lib/use-conversation-stream.ts
  modified:
    - src/app/conversas/page.tsx
key-decisions:
  - "The EventSource hook owns cursor persistence, reconnect backoff, and stream state so both chat surfaces can reuse one client lifecycle."
  - "Bootstrap cursor seeds are captured from the initial REST payloads only, avoiding unnecessary stream reconnects on every incoming event."
  - "Agent-send optimistic appends remain in place and reconcile against streamed message ids through duplicate-safe merges."
patterns-established:
  - "Conversation queue ordering now centralizes around priority plus persisted activity timestamps."
  - "Realtime state is visible to operators through a lightweight status hint rather than toast noise."
requirements-completed: [RT-03]
duration: 16 min
completed: 2026-03-06
---

# Phase 10 Plan 02: `/conversas` Realtime Migration Summary

**The primary operator chat screen now boots from REST and then stays current through a shared SSE hook instead of 10s/5s polling**

## Performance

- **Duration:** 16 min
- **Started:** 2026-03-06T15:33:00-0300
- **Completed:** 2026-03-06T15:49:00-0300
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `src/lib/use-conversation-stream.ts` to manage `EventSource`, encoded cursors, reconnect/backoff, and duplicate-safe queue/message merge helpers.
- Removed the queue `setInterval(..., 10000)` and active-thread `setInterval(..., 5000)` loops from `/conversas`.
- Preserved REST bootstrap for the queue and active thread, then switched the page to SSE once the initial payloads were loaded.
- Added a lightweight realtime status hint so operators can see live, reconnecting, or offline-fallback states without noisy alerts.

## Task Commits

Each task was committed atomically:

1. **Task 1: `/conversas` realtime migration** - pending commit in this execution step

## Files Created/Modified

- `src/lib/use-conversation-stream.ts` - Shared EventSource lifecycle, cursor seeding, reconnect behavior, and list/message merge helpers.
- `src/app/conversas/page.tsx` - Replaces the polling loops with the shared realtime hook while preserving bootstrap and operator actions.

## Decisions Made

- Kept the first-load REST fetches because the stream contract is additive, not a replacement for bootstrap rendering.
- Seeded reconnect cursors only from the bootstrap payloads so steady-state SSE updates do not force unnecessary reconnects.
- Chose a subtle inline status label over toasts or banners for reconnect/fallback visibility.

## Deviations from Plan

None.

## Issues Encountered

- Manual end-to-end chat verification remains blocked in this shell because the local Postgres-backed session flow is unavailable.

## User Setup Required

None.

## Next Phase Readiness

- The dashboard queue panel can now reuse the same hook instead of creating another EventSource implementation.
- `/conversas` no longer depends on timer windows to see inbound webhook or agent reply persistence.

## Self-Check: PASSED

- `FOUND: node_modules/.bin/tsc --noEmit`
- `FOUND: npm run build`
- `FOUND: /api/conversations/stream`
- `FOUND: src/app/conversas/page.tsx no longer contains queue/message polling intervals`
- `FOUND: src/lib/use-conversation-stream.ts`
