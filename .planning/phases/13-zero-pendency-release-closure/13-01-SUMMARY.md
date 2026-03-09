---
phase: 13-zero-pendency-release-closure
plan: 01
subsystem: shell
tags: [shell, setup, dashboard, ux, nextjs]
requires:
  - phase: 01-v2-shell-design-tokens
    provides: sidebar, topbar, dashboard shell foundation
provides:
  - topbar and dashboard shell without demo-only contracts
  - configured `/setup` UX that no longer exposes a dead-end reconfiguration wizard
  - dashboard copy and surface behavior aligned with actual product support
affects: [topbar, sidebar-layout, dashboard, setup]
tech-stack:
  added: []
  patterns: [reduced-contract UX, configured-state guardrails]
key-files:
  modified:
    - src/components/topbar.tsx
    - src/components/SidebarLayout.tsx
    - src/app/page.tsx
    - src/app/setup/page.tsx
    - src/app/api/setup/route.ts
key-decisions:
  - "Unsupported shell affordances were reduced explicitly instead of pretending to have live backing data."
  - "Configured environments keep `/setup` as an informative guardrail, not as a silent reconfiguration path."
patterns-established:
  - "Topbar state is page-scoped and intentionally descriptive instead of using fake global defaults."
  - "Dashboard claims only supported operational signals."
requirements-completed: [CLOSE-01, CLOSE-02]
duration: 1 session
completed: 2026-03-09
---

# Phase 13 Plan 01: Shell Closure Summary

**The shell, setup route, and dashboard now present a real production contract instead of demo-only affordances**

## Performance

- **Duration:** 1 session
- **Completed:** 2026-03-09T13:27:37-03:00
- **Files modified:** 5

## Accomplishments

- Reworked the topbar contract so search, period, alert state, and session context are intentionally scoped and no longer imply unsupported live behavior.
- Removed misleading dashboard copy and KPI framing that still looked like a partial demo shell.
- Changed `/setup` so configured environments no longer render the onboarding wizard as if reconfiguration were a valid operator path.
- Added a clearer configured-state response in `/api/setup` so the client can render the correct guardrail UX.

## Task Commits

1. **Plan 13-01: remove remaining shell/setup demo drift** - `b158086` (fix)

## Files Created/Modified

- `src/components/topbar.tsx` - Replaced demo defaults with an intentionally scoped shell contract.
- `src/components/SidebarLayout.tsx` - Aligned shell state propagation with the updated topbar/dashboard behavior.
- `src/app/page.tsx` - Removed misleading dashboard framing and kept only supported signals.
- `src/app/setup/page.tsx` - Added configured-environment guardrail UI instead of the old dead-end wizard.
- `src/app/api/setup/route.ts` - Exposes configured-state metadata required by the updated setup UX.

## Decisions Made

- A reduced but truthful contract is better than a richer shell that fakes operational state.
- `/setup` is treated as bootstrap-only once configuration exists.

## Deviations from Plan

None. The shell/setup/dashboard surfaces now match the intended scope.

## Issues Encountered

- The existing topbar mixed useful navigation with placeholder operational semantics. The fix intentionally narrowed those semantics instead of inventing missing data sources.

## User Setup Required

None beyond the already-configured environment for verifying the `/setup` guardrail state.

## Verification

- `node_modules/.bin/tsc --noEmit`
- `npm run build`
- Visual confirmation that `/setup` no longer shows the first-run wizard in configured environments

## Next Phase Readiness

- Plan 13-01 completed the shell/setup cleanup and unblocked the remaining authz, CRM/mobile, and reporting closure work.

## Self-Check: PASSED

- FOUND: `b158086`
- FOUND: `.planning/phases/13-zero-pendency-release-closure/13-01-SUMMARY.md`
- FOUND: `src/app/setup/page.tsx` configured-state guardrail

---
*Phase: 13-zero-pendency-release-closure*
*Completed: 2026-03-09*
