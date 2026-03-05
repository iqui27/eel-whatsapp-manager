---
phase: 09-real-data
plan: "02"
subsystem: campaign-send-pipeline
tags: [campaigns, evolution-api, whatsapp, scheduling, chips]
dependency_graph:
  requires: [db-campaigns, db-segments, db-voters, db-chips, db-config, evolution-api]
  provides: [real-campaign-delivery, chip-selection-ui, scheduled-send-guard]
  affects: [/campanhas, /campanhas/[id]/agendar, /campanhas/[id]/monitor]
tech_stack:
  added: []
  patterns: [async-send-detach, client-side-chip-selection, scheduled-send-validation]
key_files:
  created: []
  modified:
    - src/app/api/campaigns/[id]/send/route.ts
    - src/app/campanhas/nova/page.tsx
    - src/app/campanhas/[id]/agendar/page.tsx
decisions:
  - "Campaign send resolves real segment voters from segment_voters and uses Evolution API sendText per voter"
  - "Scheduled campaigns are persisted as status=scheduled and blocked from premature send by the API route"
  - "Selected chip is persisted client-side per campaign and passed to the send endpoint, avoiding a campaigns schema change in this plan"
metrics:
  duration: "2 min"
  completed: "2026-03-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 09 Plan 02: Campaign Send Pipeline Summary

**One-liner:** Real campaign delivery now uses Evolution API with segment-backed voter resolution, connected-chip selection, and scheduling that persists without triggering an immediate send.

## What Was Built

### Task 1: Implement real campaign send via Evolution API

- Replaced the mocked send pipeline in `src/app/api/campaigns/[id]/send/route.ts` with real DB-backed delivery.
- The route now loads app config, validates the campaign, blocks future `scheduledAt` sends, resolves segment voter IDs via `getSegmentVoterIds()`, fetches voter records, and selects a connected chip from request body or DB fallback.
- Added `templateMessage()` to replace `{nome}`, `{bairro}`, `{zona}`, `{secao}` and `{interesse}` with voter data.
- Delivery runs asynchronously after the HTTP response is returned, calling `sendText()` for each voter and updating `totalSent`, `totalDelivered`, and `totalFailed` with real values.

### Task 2: Add chip selector to campaign editor + fix scheduling

- Added a connected-chip selector to `src/app/campanhas/nova/page.tsx`, populated from `/api/chips`, with an explicit `Auto (primeiro chip conectado)` option.
- Persisted the selected chip per campaign and reused it in `src/app/campanhas/[id]/agendar/page.tsx` when the operator chooses `Enviar agora`.
- Changed scheduling flow so `Agendar campanha` only saves `status: 'scheduled'` plus `scheduledAt` through `/api/campaigns`, instead of firing the send endpoint immediately.
- Added scheduled-state feedback in the scheduler summary card and kept manual send as an explicit separate action.

## Task Commits

1. **Task 1: Implement real campaign send via Evolution API** - `52f1e3b` (`feat`)
2. **Task 2: Add chip selector to campaign editor + fix scheduling** - `85682fd` (`feat`)

## Files Created/Modified

- `src/app/api/campaigns/[id]/send/route.ts` - real Evolution API send pipeline, segment voter lookup, chip selection, template replacement, scheduled-send guard
- `src/app/campanhas/nova/page.tsx` - connected-chip dropdown in campaign editor
- `src/app/campanhas/[id]/agendar/page.tsx` - schedule-only save flow, scheduled badge, explicit manual send action with chip forwarding

## Decisions Made

- Real delivery remains non-blocking to the HTTP caller; the monitor page continues to observe campaign status via polling.
- Future-scheduled campaigns are rejected by the send route, making the scheduling UI truthful even without a background worker in MVP.
- Chip choice is preserved client-side between the editor and scheduler to avoid introducing a campaigns schema migration in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Campaigns schema has no `chipId` field**
- **Found during:** Task 2 (chip selector + scheduling flow)
- **Issue:** The plan required preserving the selected chip with the campaign, but the current campaigns schema does not have a `chipId` column.
- **Fix:** Persisted the chip choice client-side per campaign and forwarded it to `/api/campaigns/[id]/send` from the scheduler's manual send action.
- **Files modified:** `src/app/campanhas/nova/page.tsx`, `src/app/campanhas/[id]/agendar/page.tsx`
- **Commit:** `85682fd`

---

**Total deviations:** 1 auto-fixed (1 bug/schema gap)
**Impact on plan:** No scope creep. The deviation avoided a DB schema change while still delivering the required chip-selection behavior for campaign sending.

## Verification

- [x] `node_modules/.bin/tsc --noEmit`
- [x] `npm run build`
- [x] `src/app/api/campaigns/[id]/send/route.ts` imports `sendText` and `getSegmentVoterIds`
- [x] No `setTimeout(3000)` or `audienceSize = 150` mock flow remains
- [x] Campaign editor shows a `/api/chips`-backed dropdown for connected chips

## Self-Check: PASSED

- Summary file exists: `.planning/phases/09-real-data/09-02-SUMMARY.md` ✅
- Task 1 commit exists: `52f1e3b` ✅
- Task 2 commit exists: `85682fd` ✅
- Verification commands pass on current HEAD ✅
