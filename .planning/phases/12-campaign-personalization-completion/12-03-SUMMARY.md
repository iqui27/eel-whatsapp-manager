---
phase: 12-campaign-personalization-completion
plan: 03
subsystem: runtime
tags: [campaigns, personalization, runtime, cron, delivery, nextjs]
requires:
  - phase: 12-campaign-personalization-completion
    provides: shared variable registry, candidate profile source, and authoring-time validation
  - phase: 09-real-data
    provides: real delivery pipeline and cron dispatcher
provides:
  - shared runtime interpolation using the same campaign-variable contract as the editor
  - explicit `{data}` semantics for manual vs scheduled execution
  - safer cron behavior when scheduled sends fail before provider dispatch
affects: [campaign-delivery, cron-dispatch, manual-send, scheduled-send]
tech-stack:
  added: []
  patterns: [shared preview/runtime semantics, fail-fast delivery validation]
key-files:
  modified:
    - src/lib/campaign-delivery.ts
    - src/app/api/cron/campaigns/route.ts
key-decisions:
  - "Manual sends use the actual execution date for `{data}`, while cron-triggered scheduled sends use the campaign scheduled date."
  - "Scheduled sends that fail before provider dispatch pause the campaign instead of silently remaining in a misleading sending state."
patterns-established:
  - "Delivery resolves templates through `buildCampaignRuntimeContext` and `resolveCampaignTemplate`, matching the editor contract."
  - "Runtime validation blocks unsupported or unconfigured placeholders before any outbound provider call."
requirements-completed: [PERS-03, PERS-05]
duration: 2 min
completed: 2026-03-09
---

# Phase 12 Plan 03: Delivery Parity Summary

**Manual and scheduled campaign sends now resolve the same placeholders advertised by the editor and fail fast before leaking raw personalization tokens**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-09T15:30:00Z
- **Completed:** 2026-03-09T15:31:38Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced ad hoc delivery-time string replacement with the shared runtime context/resolver so `{candidato}` and `{data}` follow the same semantics as the editor preview.
- Added pre-send validation inside the delivery pipeline so invalid or unconfigured placeholders are blocked before any provider send call.
- Defined `{data}` semantics explicitly: manual sends use the real execution date; cron-triggered scheduled sends use the campaign scheduled date.
- Hardened cron failure handling so a claimed scheduled campaign is paused and gets an explicit failure event if dispatch aborts before outbound provider delivery.

## Task Commits

This plan landed in one atomic commit because the runtime and cron changes were tightly coupled:

1. **Plan 12-03: enforce delivery-time personalization parity** - `4047112` (feat)

## Files Created/Modified

- `src/lib/campaign-delivery.ts` - Validates runtime templates and resolves delivery content through the shared campaign-variable contract.
- `src/app/api/cron/campaigns/route.ts` - Pauses claimed scheduled campaigns and records an explicit failure event when dispatch aborts pre-send.

## Decisions Made

- Runtime parity is enforced at the shared delivery layer instead of duplicating checks in the manual and cron entrypoints.
- Pre-send validation errors are treated as operator-actionable configuration issues, not as silent provider failures.

## Deviations from Plan

None - the delivery pipeline now matches the planned contract.

## Issues Encountered

- The existing cron path could leave a claimed campaign in `sending` if dispatch failed before the provider call. The plan completion corrected that state transition while closing personalization parity.

## User Setup Required

None beyond the existing settings/config row and at least one valid voter-backed segment when exercising live sends.

## Verification

- `node_modules/.bin/tsc --noEmit`
- `npm run build`
- `node_modules/.bin/tsx --eval "...campaign variable smoke..."` validating:
  - supported placeholders merge across templates
  - missing `{candidato}` config returns the expected operator message
  - scheduled preview resolves `{data}` to `15/03/2026`
  - runtime output resolves `{nome}`, `{bairro}`, `{candidato}`, and `{data}` without leaking raw placeholders

## Next Phase Readiness

- Phase 12 is complete. The next correct step is deployment/UAT on the live environment or planning the next deferred backlog item.

## Self-Check: PASSED

- FOUND: `4047112`
- FOUND: `.planning/phases/12-campaign-personalization-completion/12-03-SUMMARY.md`
- FOUND: `src/lib/campaign-delivery.ts` using `buildCampaignRuntimeContext` + `resolveCampaignTemplate`

---
*Phase: 12-campaign-personalization-completion*
*Completed: 2026-03-09*
