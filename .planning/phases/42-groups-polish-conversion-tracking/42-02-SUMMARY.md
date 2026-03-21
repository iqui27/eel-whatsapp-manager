---
phase: 42-groups-polish-conversion-tracking
plan: "02"
subsystem: api
tags: [drizzle-orm, inArray, whatsapp-webhook, phone-normalization, opt-in, consent]

# Dependency graph
requires:
  - phase: 42-groups-polish-conversion-tracking
    provides: dual-format phone normalization helper (normalizePhone), db-compliance logConsent, searchVoters
provides:
  - Members API enriched with voter names via Drizzle inArray lookup using dual-format phone keys
  - Webhook group_participants.update auto opt-in via logConsent for action === 'add' participants
affects:
  - groups-ui (voterName field now available in member list response)
  - conversion-tracking (opt-in is now automatic on group join)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - dual-format phone indexing (12-digit + 13-digit) for Brazilian WhatsApp JID variation
    - batch voter lookup with inArray instead of per-participant searchVoters
    - double-key nameByPhone index for bidirectional 12/13-digit resolution

key-files:
  created: []
  modified:
    - src/app/api/groups/[id]/members/route.ts
    - src/app/api/webhook/route.ts

key-decisions:
  - "Use Drizzle inArray for batch voter lookup (one round-trip for up to 800+ members) instead of searchVoters loop"
  - "Double-key nameByPhone index: register both 12-digit and 13-digit variants per voter so lookup succeeds regardless of which format the JID produced"
  - "Auto opt-in loop placed before campaignId conversion tracking so it runs for all groups, not just campaign-linked ones"
  - "Wrap opt-in in try/catch — webhook must always return 200 regardless of opt-in failures"

patterns-established:
  - "Dual-format phone matching: generate normalizedPhonesWithNine for 12-digit JIDs, query union, index both key variants"
  - "Opt-in on group join: skip @lid JIDs, normalize phone, match voter with 12/13-digit fallback, check optInStatus !== 'active' before logConsent"

requirements-completed: [GRP-POL-02, GRP-POL-04]

# Metrics
duration: 15min
completed: 2026-03-21
---

# Phase 42 Plan 02: Groups Polish — Voter Name Enrichment + Auto Opt-in Summary

**Batch voter name lookup with dual-format inArray in members API, and automatic logConsent opt-in for every group join via webhook with Brazilian 9th-digit phone variation support**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-21T06:30:11Z
- **Completed:** 2026-03-21T06:45:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Members API now returns `voterName: string | null` per participant via efficient single-query Drizzle `inArray` against `voters` table
- Dual-format phone handling: both 12-digit WhatsApp JIDs and 13-digit DB-stored numbers resolve to the same voter name via double-key index
- Webhook `group_participants.update` auto-calls `logConsent(opt_in)` for every new participant matching a voter without active opt-in status
- All opt-in errors caught — webhook always returns 200; @lid JIDs (Linked Device IDs) are correctly skipped

## Task Commits

Each task was committed atomically:

1. **Task 1: Enrich members API with voter names via dual-format inArray lookup** - `b485eb1` (feat)
2. **Task 2: Auto opt-in via logConsent on group join with dual-format phone matching** - `cbc9dc9` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `src/app/api/groups/[id]/members/route.ts` - Added imports for db/voters/inArray/normalizePhone; batch voter lookup with dual-format phone variants; enriched participants response with `voterName` field
- `src/app/api/webhook/route.ts` - Added auto opt-in loop in `group_participants.update` for `action === 'add'`, using dual-format phone matching and logConsent, before existing campaignId conversion tracking

## Decisions Made
- Used Drizzle `inArray` for a single batch query instead of per-participant `searchVoters` calls — critical for groups with 800+ members
- Double-key `nameByPhone` index strategy: for each voter row, register both the 12-digit and 13-digit variants as keys, so lookup succeeds regardless of which format the JID produces
- Auto opt-in placed before `campaignId`-specific conversion tracking — it should apply to ALL group joins, not just campaign-linked ones
- `normalizedPhoneWithNine` fallback covers Brazilian WhatsApp 9th-digit variation: JIDs may arrive as 12-digit (55+DDD+8digits) while DB stores 13-digit

## Deviations from Plan

None - plan executed exactly as written.

**Note on pre-existing TypeScript errors:** `src/lib/conversion-tracking.ts` has 6 pre-existing TS errors (`sql` not imported) that were present before this plan. Not caused by or related to plan 42-02 changes. Logged to `deferred-items.md` for future attention. The two modified files compile without errors.

## Issues Encountered
None — both files compiled cleanly. Pre-existing `sql` import error in `conversion-tracking.ts` was out of scope and logged to `deferred-items.md`.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Members API now returns `voterName` — frontend member list UI can display real names
- Group join auto opt-in is live — every new member joining via invite link gets consent recorded automatically
- Pre-existing conversion-tracking.ts TypeScript error should be fixed before next TypeScript-strict build

---
*Phase: 42-groups-polish-conversion-tracking*
*Completed: 2026-03-21*
