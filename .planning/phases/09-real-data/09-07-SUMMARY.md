---
phase: 09-real-data
plan: 07
subsystem: ui
tags: [nextjs, react, campaigns, crm, conversations, deep-links]
requires:
  - phase: 09-real-data
    provides: "campaign send pipeline with chip selection and scheduler flow used by the edit screen"
  - phase: 09-real-data
    provides: "direct voter lookup plus CRM profile actions used for voter-context links"
provides:
  - functional campaign edit page with real load/save flow
  - CRM deep-links into filtered conversations
  - voter-context hint on new campaign creation
affects: [campaigns, crm, conversas]
tech-stack:
  added: []
  patterns: [url-driven voter context, shared campaign editing affordances, read-only sent campaign guard]
key-files:
  created: [.planning/phases/09-real-data/09-07-SUMMARY.md]
  modified:
    - src/app/campanhas/[id]/editar/page.tsx
    - src/app/campanhas/nova/page.tsx
    - src/app/conversas/page.tsx
    - src/app/crm/[id]/page.tsx
key-decisions:
  - "The campaign edit page keeps the same editor affordances as campaign creation but persists changes with PUT and blocks sent/sending records."
  - "Conversation voter filtering is driven by the URL voterId param and resolves voter metadata client-side for the filter badge and empty-state dialog prefill."
patterns-established:
  - "CRM action buttons can deep-link into downstream workflows by passing voter context through query params."
  - "Conversation queue filtering should treat voterId in the URL as the primary context and preserve the existing dialog flow by prefilling, not replacing, voter search."
requirements-completed: [RD-21, RD-22, RD-23]
duration: 7min
completed: 2026-03-06
---

# Phase 09 Plan 07: Campaign Fixes + Voter Links Summary

**Campaign editing now loads and updates real records, while CRM action buttons carry voter context into conversations and campaign creation flows**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T00:14:23Z
- **Completed:** 2026-03-06T00:21:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Replaced the `/campanhas/[id]/editar` redirect stub with a real editor that loads campaign data, preserves V2 styling, supports PUT updates, and blocks edits for `sending`/`sent` campaigns.
- Updated the CRM voter profile action buttons so "Ver conversas" opens `/conversas?voterId=...` and "Criar campanha personalizada" opens `/campanhas/nova` with voter context.
- Extended the conversations queue and new campaign page to consume that voter context through URL params, including a filter badge, empty-state CTA, and contextual guidance for segment-based sending.

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement campaign edit page** - `9978ba7` (feat)
2. **Task 2: Fix voter profile action links** - `9bf10d6` (feat)

**Plan metadata:** pending docs commit after summary/state updates

## Files Created/Modified
- `src/app/campanhas/[id]/editar/page.tsx` - Replaced the redirect with a full edit UI, real campaign loading, sent/sending guard, and PUT save flow.
- `src/app/crm/[id]/page.tsx` - Deep-linked voter actions into conversations and new campaign creation with voter context.
- `src/app/conversas/page.tsx` - Read `voterId` from the URL, fetched filtered conversations, showed a voter filter badge, and prefilling the existing new-conversation dialog when the queue is empty.
- `src/app/campanhas/nova/page.tsx` - Surfaced a voter-context hint so operators understand that campaigns target segments rather than individual voters.

## Decisions Made
- Kept the campaign edit page self-contained instead of changing the campaigns API contract, because existing scheduler/monitor consumers still read `GET /api/campaigns?id=...` as an array response.
- Reused the existing conversations dialog from 09-03 and added prefill behavior on top of it, which preserved the current voter-search workflow while satisfying the voter-filter empty state.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `GET /api/campaigns?id=...` still returns an array shape for legacy consumers. The new edit page normalizes that response locally so the plan could ship without widening the change surface.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 09 now has the remaining campaign/CRM navigation gaps closed, and `/campanhas/[id]/editar` is ready for operator use with live data.
- CRM, conversations, and campaigns now share a URL-based voter-context pattern that can be reused in later follow-up or automation flows.

---
*Phase: 09-real-data*
*Completed: 2026-03-06*

## Self-Check: PASSED

- `FOUND: .planning/phases/09-real-data/09-07-SUMMARY.md`
- `FOUND: 9978ba7`
- `FOUND: 9bf10d6`
- `FOUND: node_modules/.bin/tsc --noEmit`
- `FOUND: npm run build`
