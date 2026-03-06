---
phase: 09-real-data
plan: "03"
subsystem: api
tags: [conversations, whatsapp, evolution-api, react, hitl]
requires:
  - phase: 09-01
    provides: inbound conversations and message persistence from webhook events
provides:
  - outbound-agent-message delivery through Evolution API
  - conversation deletion endpoint for HITL threads
  - voter-linked conversation creation flow with chip awareness
affects: ["/conversas", "api/conversations", "api/conversations/[id]/messages"]
tech-stack:
  added: []
  patterns: [send-before-persist for outbound messages, debounced voter search in modal forms]
key-files:
  created: []
  modified:
    - src/app/api/conversations/[id]/messages/route.ts
    - src/app/api/conversations/route.ts
    - src/app/conversas/page.tsx
key-decisions:
  - "Agent replies only persist after Evolution sendText succeeds, preventing false-positive chat history."
  - "Without a chipId column on conversations, outbound sends resolve to the first connected chip instance and fall back to config.instanceName."
  - "New conversations require selecting an existing voter so HITL threads stay linked to CRM data."
patterns-established:
  - "Conversation send handlers should normalize the voter phone and fail fast on missing Evolution configuration."
  - "Search-first modal creation flows can use a 300ms debounce plus read-only derived fields after selection."
requirements-completed: [RD-06, RD-07, RD-08]
duration: 7 min
completed: 2026-03-06
---

# Phase 09 Plan 03: Conversations WhatsApp Integration Summary

**HITL conversations now send real outbound WhatsApp messages via Evolution API, support thread deletion, and create new threads from searchable voter records with connected-chip context.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T00:03:40Z
- **Completed:** 2026-03-06T00:10:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Agent replies posted in `/api/conversations/[id]/messages` now send through Evolution API before being stored in the database.
- `/api/conversations` now supports authenticated thread deletion, removing both the conversation row and child messages.
- The `/conversas` "Nova conversa" dialog now searches real voters, loads connected chips, and refreshes/selects the created conversation in the live queue.

## Task Commits

Each task was committed atomically:

1. **Task 1: Send agent replies via WhatsApp + add DELETE handler** - `c642893` (feat)
2. **Task 2: New conversation dialog with voter search + chip selector** - `fc4b98d` (feat)

## Files Created/Modified

- `src/app/api/conversations/[id]/messages/route.ts` - Sends agent-authored messages via `sendText`, validates config/chip availability, and only persists on successful delivery.
- `src/app/api/conversations/route.ts` - Adds authenticated `DELETE` support for removing a conversation and its associated messages.
- `src/app/conversas/page.tsx` - Replaces the manual new-conversation form with debounced voter lookup, connected chip loading, and post-create queue refresh/select behavior.

## Decisions Made

- Required a real voter selection before creating a conversation so new HITL threads remain linked to CRM records.
- Kept the chip selector visible in the dialog even though the current schema cannot persist `chipId`, because operators still need chip context and the plan explicitly avoids a schema change here.
- Used the first connected chip with `config.instanceName` fallback for outbound sends, which keeps replies operational without introducing architectural changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] conversations schema still has no chipId column**
- **Found during:** Task 1 (Send agent replies via WhatsApp + add DELETE handler)
- **Issue:** The plan mentions per-conversation chip selection, but `conversations` cannot persist `chipId`.
- **Fix:** Resolved outbound sends against the first connected chip instance and exposed the chip selector in the creation dialog as operator context only, without forcing a schema change.
- **Files modified:** `src/app/api/conversations/[id]/messages/route.ts`, `src/app/conversas/page.tsx`
- **Verification:** Task 1 handler resolves an instance name from connected chips/config; Task 2 dialog loads chips and explains current behavior.
- **Committed in:** `c642893`, `fc4b98d`

---

**Total deviations:** 1 auto-fixed (1 bug/plan-schema mismatch)
**Impact on plan:** The fallback preserved the required WhatsApp flow and avoided an out-of-scope schema migration.

## Issues Encountered

- Project-wide verification is currently blocked by an unrelated, already-modified file: `src/app/relatorios/page.tsx` fails `tsc --noEmit` with `TS2339` (`Property 'label' does not exist on type 'DayBar'`). Per execution constraints, this was logged in `deferred-items.md` and left untouched.

## User Setup Required

None - no external service configuration required beyond the existing Evolution API and chip setup already expected by Phase 09.

## Next Phase Readiness

- `/conversas` is ready for real inbound/outbound operator workflows using the webhook pipeline from `09-01`.
- If future plans need chip-specific routing per conversation, that requires an architectural schema change to persist chip bindings.

## Self-Check: PASSED

- Summary, deferred log, and modified plan files exist.
- Task commits `c642893` and `fc4b98d` are present in git history.

---
*Phase: 09-real-data*
*Completed: 2026-03-06*
