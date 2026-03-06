---
phase: 09-real-data
plan: "06"
subsystem: ui
tags: [dashboard, reports, campaigns, nextjs, react, drizzle]
requires:
  - phase: 09-real-data
    provides: real campaign delivery counters from Evolution API sends
  - phase: 09-real-data
    provides: live segment metadata and voter totals from real APIs
provides:
  - dashboard KPIs sourced from real campaign and voter aggregates
  - reports KPIs, chart, and CSV export sourced from real campaign stats
  - monitor timeline driven by live campaign totals instead of sample rows
  - campaign list segment names resolved from the segments API
affects: [dashboard, relatorios, campanhas, monitoramento]
tech-stack:
  added: []
  patterns:
    - pages aggregate campaign totals client-side from /api/campaigns and derive zero states in render
    - segment names are resolved via /api/segments lookups instead of exposing raw UUIDs in UI
key-files:
  created: []
  modified:
    - src/app/page.tsx
    - src/app/relatorios/page.tsx
    - src/app/campanhas/[id]/monitor/page.tsx
    - src/app/campanhas/page.tsx
key-decisions:
  - "Dashboard voter totals now read the paginated /api/voters response via limit=1 and use its total metadata instead of assuming an array payload."
  - "Reports aggregate sends by campaign updatedAt over 7-day and 14-day windows so KPI cards, bars, and CSV exports stay aligned."
  - "Monitoring uses aggregate delivery milestones because the current Evolution flow does not persist per-message delivery events."
patterns-established:
  - "Campaign-facing UI surfaces delivery counts, responses, and failures directly from campaign totals without client-side mock constants."
  - "When a related segment record is missing, campaign views degrade to 'Segmento removido' instead of leaking stale IDs."
requirements-completed: [RD-17, RD-18, RD-19, RD-20]
duration: 12 min
completed: 2026-03-05
---

# Phase 09 Plan 06: Dashboard + Reports Real Data Summary

**Dashboard KPIs, reports visualizations, monitor progress, and campaign segment labels now render directly from live campaign aggregates instead of hardcoded placeholders**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-06T00:01:15Z
- **Completed:** 2026-03-06T00:12:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Replaced the dashboard's mock delivery/opening metrics with real campaign totals and voter counts from the live APIs.
- Rebuilt the reports page so KPI cards, daily send bars, and CSV export all derive from filtered campaign aggregates.
- Swapped the monitor sample log for live aggregate delivery milestones and resolved segment names across campaign views.

## Task Commits

Each task was committed atomically:

1. **Task 1: Dashboard + Reports real KPIs from campaign aggregates** - `6576619` (feat)
2. **Task 2: Monitor delivery log + campaign list segment name** - `a8a5133` (feat)

## Files Created/Modified

- `src/app/page.tsx` - Dashboard now reads paginated voter totals, aggregates real campaign counters, and removes the mocked opening KPI.
- `src/app/relatorios/page.tsx` - Reports now filter live campaigns by period, build daily volume bars from DB-backed stats, and export matching CSV summaries.
- `src/app/campanhas/[id]/monitor/page.tsx` - Monitor now resolves the segment name, shows real progress summaries, and renders an aggregate delivery timeline instead of sample phone rows.
- `src/app/campanhas/page.tsx` - Campaign list now loads segments alongside campaigns and shows segment names or a removed-state fallback.

## Decisions Made

- Kept the dashboard KPI layout intact and treated "Taxa de abertura" as an estimated proxy derived from delivered versus sent totals, labeled accordingly because WhatsApp read tracking is not available in the current data model.
- Standardized reports around 7-day and 14-day windows so the cards, chart, and CSV export all use the same filtered dataset.
- Represented monitor activity as aggregate milestones because the send pipeline exposes campaign-level counters but not per-recipient delivery webhooks.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `next build` still warns about multiple lockfiles and infers `/Users/hrocha` as the workspace root. The build passed, so this remains out of scope for the plan.
- Another executor completed `09-03` in parallel while this plan was running. Summary and state updates were based on the refreshed HEAD to avoid overwriting their planning metadata.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 09 now has real data visible across dashboard, reports, and monitor surfaces, leaving `09-07` as the remaining UI clean-up and voter-linking pass.
- Campaign analytics views now consume the same DB-backed counters produced by the real send pipeline, so future reporting work can build on one consistent source of truth.

## Self-Check: PASSED

---
*Phase: 09-real-data*
*Completed: 2026-03-05*
