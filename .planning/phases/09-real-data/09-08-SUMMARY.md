---
phase: 09-real-data
plan: "08"
subsystem: delivery
tags: [campaigns, cron, whatsapp, monitoring, drizzle, nextjs]
requires:
  - phase: 09-real-data
    provides: real Evolution API send pipeline with persisted campaign chip bindings
  - phase: 09-real-data
    provides: campaign monitor page and scheduler flows already wired to campaign records
provides:
  - authenticated cron dispatcher for due scheduled campaigns
  - shared campaign send executor with persisted delivery events
  - monitor timeline backed by persisted delivery events instead of synthetic milestones
  - conversation chip copy aligned with persisted chip routing
affects: [campaigns, monitoramento, cron, conversas]
tech-stack:
  added:
    - src/lib/campaign-delivery.ts
  patterns:
    - manual sends and cron-triggered sends share the same execution path and event persistence
    - campaign delivery monitoring reads persisted event rows via the campaigns API instead of inferring milestones from counters
key-files:
  created:
    - src/lib/campaign-delivery.ts
    - src/app/api/cron/campaigns/route.ts
  modified:
    - src/app/api/campaigns/[id]/send/route.ts
    - src/app/api/campaigns/route.ts
    - src/app/campanhas/[id]/monitor/page.tsx
    - src/app/conversas/page.tsx
    - src/lib/db-campaigns.ts
key-decisions:
  - "Campaign sends now run through a shared executeCampaignSend helper so cron and manual dispatch persist the same delivery events and counters."
  - "The monitor page now requests campaigns with include=deliveryEvents and renders persisted rows directly, with a legacy empty state for older campaigns."
  - "Scheduled campaigns are claimed by cron before execution and emit a scheduled_claimed event to make dispatcher activity auditable."
patterns-established:
  - "Delivery-event persistence is now the source of truth for send timelines; aggregate counters remain for KPI/progress displays only."
  - "Chip routing falls back in this order: explicit chip, persisted campaign chip, first connected chip."
requirements-completed: [RD-03, RD-05, RD-07, RD-19]
duration: 10 min
completed: 2026-03-06
---

# Phase 09 Plan 08: Delivery Orchestration Gaps Summary

**Scheduled sends now have a real cron dispatcher, campaign sends persist delivery events, and the monitor page renders an auditable event timeline**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-06T13:18:00-0300
- **Completed:** 2026-03-06T13:27:59-0300
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Replaced the ad hoc send route logic with a shared `executeCampaignSend()` helper that persists `send_started`, `message_sent`, `message_failed`, and `send_completed` events.
- Added `/api/cron/campaigns`, protected by `CRON_SECRET`, to claim due scheduled campaigns and execute them through the same shared send path.
- Extended `GET /api/campaigns?id=...` so the monitor can opt into `deliveryEvents` and render the real persisted timeline instead of synthetic aggregate rows.
- Updated the conversations chip selector copy to reflect that the selected chip is now stored on the conversation and used for future replies.

## Task Commits

Each task was committed atomically:

1. **Task 1-4: Delivery orchestration gap closure** - `bb34eae` (feat)

## Files Created/Modified

- `src/lib/campaign-delivery.ts` - Shared delivery executor used by manual sends and cron dispatch, with per-recipient event persistence.
- `src/app/api/cron/campaigns/route.ts` - Authenticated cron dispatcher that claims due scheduled campaigns and executes them safely.
- `src/app/api/campaigns/[id]/send/route.ts` - Slim manual send route that delegates to the shared delivery executor.
- `src/app/api/campaigns/route.ts` - Adds opt-in `include=deliveryEvents` support for campaign detail reads.
- `src/app/campanhas/[id]/monitor/page.tsx` - Replaces the synthetic milestone log with persisted delivery-event rows and explicit legacy empty states.
- `src/app/conversas/page.tsx` - Clarifies that the chosen chip is persisted on the conversation and reused for future replies.
- `src/lib/db-campaigns.ts` - Adds `getCampaignWithDeliveryEvents()` to support monitor reads.

## Decisions Made

- Kept aggregate campaign counters for progress cards, but moved timeline rendering to persisted delivery events so auditing is no longer derived from counters alone.
- Ran manual and scheduled sends synchronously through one helper instead of duplicating send loops across routes.
- Preserved the existing campaign API array shape for `GET /api/campaigns?id=...` and only extended it when `include=deliveryEvents` is explicitly requested.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `next build` still warns that Next.js inferred `/Users/hrocha` as the workspace root because multiple lockfiles are present. The build passed, so this remains out of scope for the plan.

## User Setup Required

None - existing `CRON_SECRET` protection pattern is reused, with no new environment variables.

## Next Phase Readiness

- Scheduled campaigns can now leave `scheduled` state without browser interaction.
- Campaign monitoring is ready for future delivery-webhook enrichment because event persistence is already in place.
- The remaining CRM-to-campaign handoff gap can now build on persisted campaign routing instead of client-only state.

## Self-Check: PASSED

- `FOUND: bb34eae`
- `FOUND: node_modules/.bin/tsc --noEmit`
- `FOUND: npm run build`
- `FOUND: /api/cron/campaigns`
- `FOUND: include=deliveryEvents`
