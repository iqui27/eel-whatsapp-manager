---
phase: 09-real-data
plan: "09"
subsystem: crm
tags: [crm, campaigns, segments, nextjs, drizzle]
requires:
  - phase: 09-real-data
    provides: CRM voter profile deep-links into campaign creation
  - phase: 09-real-data
    provides: segment materialization helpers and campaign composer segment selector
provides:
  - idempotent single-voter segment bootstrap endpoint
  - campaign composer prefilled with a real voter-specific segment when launched from CRM
  - preserved operator control to switch the selected segment before saving
affects: [crm, campaigns, segments]
tech-stack:
  added:
    - src/app/api/segments/from-voter/route.ts
  patterns:
    - voter-originated campaign creation resolves server-side into a reusable segment before the composer renders
key-files:
  created:
    - src/app/api/segments/from-voter/route.ts
  modified:
    - src/lib/db-segments.ts
    - src/app/campanhas/nova/page.tsx
    - src/app/crm/[id]/page.tsx
key-decisions:
  - "Single-voter campaign targeting stays inside the existing segment model rather than creating a special hidden campaign mode."
  - "The CRM link now tags the origin with source=crm so the composer only bootstraps a single-voter segment for that explicit flow."
patterns-established:
  - "CRM deep-links can trigger server-side bootstrap actions in downstream pages while still leaving the final form editable."
requirements-completed: [RD-23]
duration: 1 min
completed: 2026-03-06
---

# Phase 09 Plan 09: CRM Single-Voter Segment Prefill Summary

**Creating a campaign from a voter profile now opens the composer with a real single-voter segment already selected**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-06T13:27:59-0300
- **Completed:** 2026-03-06T13:28:04-0300
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added an idempotent `ensureSingleVoterSegment()` helper that creates or reuses a segment marked with `__singleVoterId` metadata and materializes it through the normal `segment_voters` path.
- Exposed that helper through `POST /api/segments/from-voter` so downstream UI can bootstrap a voter-specific segment without bypassing existing auth or segment CRUD flows.
- Updated `/campanhas/nova` so CRM-originated access (`source=crm`) auto-creates or reuses the single-voter segment, selects it in the composer, and shows clear copy that the operator can still change the target segment.
- Updated the CRM profile action link to identify the flow as CRM-originated when opening the campaign composer.

## Task Commits

Each task was committed atomically:

1. **Task 1-2: Single-voter CRM segment prefill** - `184776b` (feat)

## Files Created/Modified

- `src/lib/db-segments.ts` - Adds `ensureSingleVoterSegment()` with idempotent reuse and junction-table materialization.
- `src/app/api/segments/from-voter/route.ts` - Authenticated bootstrap endpoint returning the resolved single-voter segment.
- `src/app/campanhas/nova/page.tsx` - Boots the CRM voter context into a selected segment and keeps the selector editable afterward.
- `src/app/crm/[id]/page.tsx` - Marks the campaign-creation handoff as `source=crm`.

## Decisions Made

- Stored the voter-specific marker inside the segment filters payload so the helper can detect and reuse an existing single-voter segment without needing a schema change.
- Used the existing segment selector instead of a hidden prefill mode so operators can still clear or replace the target segment before saving the campaign.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- CRM-to-campaign handoff now lands on an actionable segment instead of an explanatory hint.
- Repeated clicks on "Criar campanha personalizada" for the same voter converge on one reusable segment path instead of creating duplicates endlessly.

## Self-Check: PASSED

- `FOUND: 184776b`
- `FOUND: node_modules/.bin/tsc --noEmit`
- `FOUND: npm run build`
- `FOUND: /api/segments/from-voter`
