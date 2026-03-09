---
phase: 13-zero-pendency-release-closure
plan: 02
subsystem: authz
tags: [auth, authz, roles, permissions, admin, nextjs]
requires:
  - phase: 07-compliance-admin
    provides: users, roles, admin surface foundation
  - phase: 11-full-system-verification-uat-sweep
    provides: explicit release-blocked authz gap evidence
provides:
  - session actors with role, region scope, and resolved permissions
  - reusable API authorization helpers with real `401` vs `403` behavior
  - admin UI aligned with the enforced permission contract
affects: [login, session, admin, protected-apis]
tech-stack:
  added: [drizzle migration, reusable policy helpers]
  patterns: [shared authz guards, actor-backed sessions]
key-files:
  modified:
    - drizzle/0004_phase_13_zero_pendency.sql
    - src/lib/authorization.ts
    - src/lib/api-auth.ts
    - src/lib/db-auth.ts
    - src/lib/db-users.ts
    - src/app/api/auth/login/route.ts
    - src/app/api/auth/session/route.ts
    - src/app/api/users/route.ts
    - src/app/api/voters/route.ts
    - src/app/api/campaigns/route.ts
    - src/app/api/conversations/route.ts
    - src/app/api/compliance/route.ts
    - src/app/admin/page.tsx
key-decisions:
  - "Session cookies now carry actor metadata backed by the user record so role changes and disabled users take effect immediately."
  - "Protected APIs distinguish authentication failure from authorization failure instead of treating every logged-in user as full access."
patterns-established:
  - "Route handlers call a shared authz layer rather than open-coding role checks."
  - "The admin UI mirrors the same permission model enforced by the APIs."
requirements-completed: [SEC-01, SEC-02]
duration: 1 session
completed: 2026-03-09
---

# Phase 13 Plan 02: Authorization Closure Summary

**The product now enforces real authorization across sensitive APIs and reflects that policy in the admin surface**

## Performance

- **Duration:** 1 session
- **Completed:** 2026-03-09T16:26:37-03:00
- **Files modified:** 20+

## Accomplishments

- Added a reusable authorization layer that resolves role, region scope, and effective permissions from the persisted user/session model.
- Upgraded login and session handling so operator sessions can be tied to actual enabled users instead of a generic password-only actor.
- Updated sensitive routes to return `401` for missing sessions and `403` for insufficient rights.
- Reworked `/admin` so the permissions view and user editing flows match the real policy contract instead of a static descriptive matrix.

## Task Commits

1. **Plan 13-02: close API and UI authorization gaps** - `20156ad` (feat)

## Files Created/Modified

- `drizzle/0004_phase_13_zero_pendency.sql` - Adds session actor fields and persisted user/reporting support required by the final closure work.
- `src/lib/authorization.ts` - Central permission and role resolution helpers.
- `src/lib/api-auth.ts` - Shared API-side auth/authz guard utilities.
- `src/lib/db-auth.ts` - Session actor persistence and validation backed by current user state.
- `src/lib/db-users.ts` - User loading helpers required by actor-backed sessions and admin policy resolution.
- `src/app/api/auth/login/route.ts` - Supports operator-selected login when enabled users exist.
- `src/app/api/auth/session/route.ts` - Exposes authenticated actor context to the client.
- `src/app/admin/page.tsx` - Replaces the static permission story with real role/permission editing and visibility.

## Decisions Made

- Authorization needed to be enforced centrally, not page-by-page as ad hoc guards.
- Existing password-based bootstrap login remains available only when no explicit enabled-user list exists.

## Deviations from Plan

None. The authz gap was closed in the shared runtime rather than piecemeal.

## Issues Encountered

- The original session model had no stable user/role context, so the login/session layer had to be upgraded before API authorization could become real.

## User Setup Required

- At least one enabled operator in `users` to exercise role-aware login instead of bootstrap mode.

## Verification

- `node_modules/.bin/tsc --noEmit`
- `npm run build`
- Manual API smoke distinguishing `401` from `403` on protected routes

## Next Phase Readiness

- Plans 13-03 and 13-04 could now rely on the shared authz/session contract for CRM/mobile/reporting surfaces.

## Self-Check: PASSED

- FOUND: `20156ad`
- FOUND: `.planning/phases/13-zero-pendency-release-closure/13-02-SUMMARY.md`
- FOUND: `src/lib/authorization.ts`

---
*Phase: 13-zero-pendency-release-closure*
*Completed: 2026-03-09*
