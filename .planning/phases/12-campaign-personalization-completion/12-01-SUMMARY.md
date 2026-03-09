---
phase: 12-campaign-personalization-completion
plan: 01
subsystem: ui
tags: [settings, campaign-personalization, nextjs, react, drizzle, config]
requires:
  - phase: 04-campaigns
    provides: campaign authoring surfaces that need a trusted personalization contract
  - phase: 09-real-data
    provides: persisted config/settings infrastructure and real voter-backed variable sources
  - phase: 11-full-system-verification-uat-sweep
    provides: release-blocking evidence that candidate config and variable drift remained open
provides:
  - persisted candidate profile fields in the existing config/settings model
  - canonical campaign variable registry with source metadata and validation helpers
  - settings readiness signal for `{candidato}` personalization
affects: [phase-12-02, phase-12-03, campaign-editor, campaign-delivery]
tech-stack:
  added: []
  patterns: [config-backed candidate profile, shared placeholder registry]
key-files:
  created: [drizzle/0003_phase_12_campaign_personalization.sql, src/lib/campaign-variables.ts]
  modified: [src/db/schema.ts, src/lib/db-config.ts, src/app/api/settings/route.ts, src/app/settings/page.tsx]
key-decisions:
  - "Candidate identity stays in the existing config/settings flow instead of introducing a parallel model."
  - "Campaign placeholder metadata, extraction, validation, and preview/runtime builders now live in one shared module."
patterns-established:
  - "Settings-backed personalization: `{candidato}` depends on persisted config candidate fields."
  - "Registry-first campaign variables: later campaign surfaces should import `src/lib/campaign-variables.ts` instead of defining local arrays."
requirements-completed: [PERS-01, PERS-02]
duration: 4 min
completed: 2026-03-09
---

# Phase 12 Plan 01: Candidate Profile + Variable Contract Summary

**Config-backed candidate profile plus a canonical campaign variable registry with extraction, validation, and preview/runtime builders**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-09T15:12:18Z
- **Completed:** 2026-03-09T15:16:06Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Extended the existing `config` table and settings persistence flow with backward-compatible candidate profile fields so `{candidato}` now has a real source of truth.
- Added a dedicated `/settings` candidate section that explains the personalization dependency, round-trips the new fields, and exposes readiness status through the authenticated settings API.
- Created `src/lib/campaign-variables.ts` as the canonical registry for supported campaign placeholders, including source categories, extraction, validation, and preview/runtime context builders.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend config/settings with a real candidate profile** - `fc95431` (feat)
2. **Task 2: Introduce one shared campaign variable registry** - `8bab717` (feat)

## Files Created/Modified
- `drizzle/0003_phase_12_campaign_personalization.sql` - Adds optional candidate profile columns to the existing config table.
- `src/db/schema.ts` - Extends the Drizzle config schema with persisted candidate fields.
- `src/lib/db-config.ts` - Normalizes and validates candidate profile data inside the existing config persistence layer.
- `src/app/api/settings/route.ts` - Reads/writes candidate profile fields and returns readiness metadata without exposing secrets.
- `src/app/settings/page.tsx` - Adds the operator-facing candidate profile UI and displays the shared personalization contract status.
- `src/lib/campaign-variables.ts` - Defines the canonical campaign placeholder registry and its helper APIs.

## Decisions Made

- Candidate profile data remains in the current config/settings model because Phase 12 explicitly had to avoid a second admin surface for one operational identity.
- The shared registry owns placeholder categories and resolution metadata now so later plans can reuse the same contract across preview, validation, and delivery.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The previous execution turn was interrupted after part of Task 2 had been written. The continuation resumed from the existing worktree, validated the in-progress files, and completed the task without reverting unrelated changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 12-02 can now replace page-local campaign variable arrays with the shared registry and reuse the preview/validation helpers.
- Phase 12-03 can resolve `{candidato}` and `{data}` at delivery time from the same contract established here.

## Self-Check: PASSED

- FOUND: `.planning/phases/12-campaign-personalization-completion/12-01-SUMMARY.md`
- FOUND: `fc95431`
- FOUND: `8bab717`

---
*Phase: 12-campaign-personalization-completion*
*Completed: 2026-03-09*
