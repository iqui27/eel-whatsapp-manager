---
phase: 12-campaign-personalization-completion
plan: 02
subsystem: ui
tags: [campaigns, personalization, validation, preview, nextjs, react]
requires:
  - phase: 12-campaign-personalization-completion
    provides: persisted candidate profile plus canonical variable registry
  - phase: 04-campaigns
    provides: campaign create/edit/schedule surfaces that now need contract parity
  - phase: 09-real-data
    provides: persisted campaign records and delivery metadata fields
provides:
  - shared variable/preview/validation behavior across create, edit, and schedule authoring surfaces
  - save-time validation and variable persistence for campaign templates
  - operator guidance for candidate-backed placeholders before scheduling or sending
affects: [phase-12-03, campaign-editor, campaign-scheduling]
tech-stack:
  added: []
  patterns: [registry-driven authoring, aggregated template validation]
key-files:
  modified:
    - src/app/api/campaigns/route.ts
    - src/app/campanhas/nova/page.tsx
    - src/app/campanhas/[id]/editar/page.tsx
    - src/app/campanhas/[id]/agendar/page.tsx
    - src/lib/campaign-variables.ts
    - src/lib/cta-score.ts
key-decisions:
  - "Create/edit/schedule flows validate the effective campaign templates as one unit, including Variant B when A/B is enabled."
  - "Operators see exactly the supported placeholder set from the shared registry, including `{zona}` and `{secao}`."
patterns-established:
  - "Campaign authoring surfaces import `SUPPORTED_CAMPAIGN_VARIABLES`, preview builders, and validation helpers from one shared module."
  - "Campaign persistence records the exact supported placeholders referenced by the effective templates."
requirements-completed: [PERS-02, PERS-04]
duration: 12 min
completed: 2026-03-09
---

# Phase 12 Plan 02: Authoring + Validation Alignment Summary

**Campaign creation, editing, and scheduling now use the same personalization contract, preview semantics, and pre-save validation rules**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-09T15:18:00Z
- **Completed:** 2026-03-09T15:30:45Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Replaced page-local variable mocks in `/campanhas/nova` and `/campanhas/[id]/editar` with the shared registry, preview resolver, and candidate-aware validation helpers.
- Added schedule-surface visibility for used placeholders, preview resolution, and operator-facing warnings so invalid or unconfigured templates are blocked before schedule/send actions.
- Updated `/api/campaigns` to validate the effective campaign templates, persist the referenced variable list into `campaigns.variables`, and surface clear API errors for unsupported or unconfigured placeholders.
- Aligned CTA score variable detection with the canonical placeholder registry so editorial feedback matches the real delivery contract.

## Task Commits

This plan landed in one atomic commit because the UI/API changes all depended on the same shared contract:

1. **Plan 12-02: align authoring surfaces and persistence with the personalization contract** - `652d92e` (feat)

## Files Created/Modified

- `src/app/api/campaigns/route.ts` - Validates effective templates, including Variant B, and persists referenced placeholders.
- `src/app/campanhas/nova/page.tsx` - Uses the shared registry, aggregated validation, candidate guidance, and preview resolution.
- `src/app/campanhas/[id]/editar/page.tsx` - Mirrors the create flow with the same variable set, warnings, and save-time blocking.
- `src/app/campanhas/[id]/agendar/page.tsx` - Shows used variables, preview resolution, and blocks invalid templates before scheduling or manual send.
- `src/lib/campaign-variables.ts` - Adds aggregated multi-template validation for create/edit/schedule parity.
- `src/lib/cta-score.ts` - Reads supported placeholders from the shared registry.

## Decisions Made

- Validation now happens against the effective set of campaign templates, not only the primary message, so A/B variants cannot drift into unsupported placeholders.
- The schedule screen became part of the authoring contract because it is the last operator checkpoint before dispatch.

## Deviations from Plan

None - the plan landed exactly on the targeted surfaces.

## Issues Encountered

- The create page had been partially patched in a previous turn. The continuation normalized those changes and then propagated the same contract to edit and schedule rather than leaving create as a special case.

## User Setup Required

None beyond having a candidate profile configured in `/settings` before using `{candidato}`.

## Verification

- `node_modules/.bin/tsc --noEmit`
- `npm run build`

## Next Phase Readiness

- Phase 12-03 can now rely on persisted `campaigns.variables`, schedule-surface warnings, and the same shared template validation contract already shown to operators.

## Self-Check: PASSED

- FOUND: `652d92e`
- FOUND: `.planning/phases/12-campaign-personalization-completion/12-02-SUMMARY.md`
- FOUND: `/campanhas/nova`, `/campanhas/[id]/editar`, and `/campanhas/[id]/agendar` all import the shared campaign-variable helpers

---
*Phase: 12-campaign-personalization-completion*
*Completed: 2026-03-09*
