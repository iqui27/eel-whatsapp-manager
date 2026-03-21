---
phase: 42-groups-polish-conversion-tracking
verified: 2026-03-21T07:00:00Z
status: gaps_found
score: 6/7 must-haves verified
re_verification: false
gaps:
  - truth: "TypeScript compiles without errors across all phase-modified files"
    status: partial
    reason: "Pre-existing `sql` not imported in src/lib/conversion-tracking.ts causes 6 TS errors that block a clean tsc --noEmit. Although the errors predate phase 42 and are not caused by phase 42 changes, they are deferred rather than fixed, leaving the codebase in a non-compiling state."
    artifacts:
      - path: "src/lib/conversion-tracking.ts"
        issue: "TS2304: Cannot find name 'sql' at lines 59, 95, 116, 240, 244, 248 — missing `sql` import from 'drizzle-orm'"
    missing:
      - "Add `sql` to the drizzle-orm import in src/lib/conversion-tracking.ts: `import { ..., sql } from 'drizzle-orm'`"
human_verification:
  - test: "Create a new group mid-campaign and immediately send a campaign link to a voter"
    expected: "The link resolves to the newly created group, not the previously cached one"
    why_human: "Cache invalidation is in-memory — cannot verify that the next campaign rotation actually picks up the new group without running the full campaign dispatch flow"
  - test: "Navigate to /grupos and open a group card on a narrow viewport (mobile or small tablet)"
    expected: "'Ver detalhes' button stays fully visible within the card boundary; left buttons (Sincronizar, Arquivar) wrap if space is tight"
    why_human: "Tailwind flex-wrap/shrink-0 behavior is visual — cannot verify rendering programmatically"
  - test: "Click 'Sincronizar' on a chip that has proxy settings configured in Evolution API but not in the DB"
    expected: "After sync, the chip's proxy fields in the DB match what is in Evolution"
    why_human: "Requires a live Evolution API instance with proxy configured to observe the sync behavior"
  - test: "Have a phone number join a group via invite link whose number is stored in the voters DB with non-active opt-in"
    expected: "opt-in consent is recorded automatically; voter.optInStatus changes to 'active'"
    why_human: "Requires a live WhatsApp webhook event to trigger the group_participants.update handler"
---

# Phase 42: Groups Polish + Conversion Tracking — Verification Report

**Phase Goal:** Fix group management bugs and add conversion tracking — auto-link rotation when creating new groups mid-campaign, real member names display, "ver detalhes" layout fix, and auto opt-in on group join.
**Verified:** 2026-03-21T07:00:00Z
**Status:** gaps_found (1 gap: pre-existing TypeScript compilation error deferred rather than fixed)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Campaign link immediately resolves to newly created group after POST /api/groups | VERIFIED | `invalidateGroupCache(group.segmentTag)` called at line 145-147 of `src/app/api/groups/route.ts`, guarded by `if (group.segmentTag)`, placed after `createGroupRecord` returns and before `NextResponse.json` |
| 2 | "Ver detalhes" button is fully contained within group card at all widths | VERIFIED | Line 175 of `src/components/group-card.tsx`: `className="flex flex-wrap items-center gap-1.5 px-4 pb-4 pt-1 border-t border-border/50 mt-auto"` and line 198: `className="ml-auto flex items-center gap-1.5 shrink-0"` — both `flex-wrap` and `shrink-0` present |
| 3 | Chip sync pulls proxy and profile from Evolution API and updates DB | VERIFIED | `src/app/api/chips/sync/route.ts` lines 48-57: `fetchInstances` called once before chip loop, building `evolutionInstanceMap`; lines 121-149: inside loop, syncs `proxyHost`, `proxyPort`, `proxyProtocol`, `proxyUsername`, `proxyPassword`, and `profileName` conditionally |
| 4 | Group member list displays voter's real name when phone matches | VERIFIED | `src/app/api/groups/[id]/members/route.ts` lines 63-111: `inArray` batch query against `voters` table using dual-format phone keys; enriched response returns `voterName: string \| null` per participant |
| 5 | 12-digit JIDs (missing 9th digit) resolve to voter name stored as 13-digit | VERIFIED | Dual-format strategy confirmed: `normalizedPhonesWithNine` built at lines 71-73; double-key `nameByPhone` index registers both 12-digit and 13-digit keys per voter row (lines 88-100) |
| 6 | Auto opt-in fires via logConsent when participant joins via group invite (action === 'add') | VERIFIED | `src/app/api/webhook/route.ts` lines 554-601: auto opt-in loop for `action === 'add'`, skips `@lid` JIDs, dual-format phone matching with `normalizedPhoneWithNine`, calls `logConsent(voter.id, 'opt_in', 'whatsapp_group', ...)` with `voter.optInStatus !== 'active'` guard, wrapped in try/catch |
| 7 | TypeScript compiles without errors across all modified files | FAILED | `npx tsc --noEmit` returns 6 errors in `src/lib/conversion-tracking.ts` (missing `sql` import). All 6 errors are pre-existing and unrelated to phase 42 changes, but left unresolved and deferred |

**Score:** 6/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/app/api/groups/route.ts` | POST /api/groups with cache invalidation after group creation | VERIFIED | Imports `invalidateGroupCache` at line 6; calls it at lines 145-147 with `if (group.segmentTag)` guard |
| `src/components/group-card.tsx` | Group card with fixed flex layout on actions row | VERIFIED | `flex-wrap` on container (line 175), `shrink-0` on right cluster (line 198) |
| `src/lib/evolution.ts` | EvolutionInstance interface extended with optional proxy fields | VERIFIED | Lines 17-24: optional `proxy?: { host?, port?, protocol?, username?, password? }` field added to `EvolutionInstance` |
| `src/app/api/chips/sync/route.ts` | Chip sync that pulls proxy/profile info from Evolution and updates DB | VERIFIED | Imports `fetchInstances` at line 5; calls it before the chip loop at line 50; syncs proxy and profileName inside loop at lines 122-148 |
| `src/app/api/groups/[id]/members/route.ts` | Members API enriched with voter names via Drizzle inArray lookup using dual-format phone keys | VERIFIED | `inArray` import at line 9; batch voter query with dual-format phone variants at lines 76-83; `enriched` returned at line 111 |
| `src/app/api/webhook/route.ts` | group_participants.update handler with logConsent on action === 'add' with dual-format phone matching | VERIFIED | Auto opt-in loop at lines 554-601; `logConsent` imported at line 21; dual-format phone at lines 569-573 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/app/api/groups/route.ts` | `src/lib/group-link-cache.ts` | `invalidateGroupCache(group.segmentTag)` | WIRED | Import at line 6; call at lines 145-147 |
| `src/components/group-card.tsx` | actions row DOM | `flex-wrap` + `shrink-0` on right cluster | WIRED | `flex-wrap` at line 175; `shrink-0` at line 198 |
| `src/app/api/chips/sync/route.ts` | `src/lib/evolution.ts` | `fetchInstances()` to get full instance data | WIRED | `fetchInstances` imported at line 5; called at line 50; result used to build `evolutionInstanceMap` at lines 51-53 |
| `src/app/api/groups/[id]/members/route.ts` | `src/db/schema.ts voters` table | `db.select().from(voters).where(inArray(voters.phone, allPhoneVariants))` | WIRED | Lines 78-83: Drizzle inArray query against `voters.phone` with dual-format variants |
| `src/app/api/webhook/route.ts` | `src/lib/db-compliance.ts logConsent` | `logConsent(voter.id, 'opt_in', 'whatsapp_group', ...)` | WIRED | `logConsent` imported at line 21; called at lines 584-589 inside try/catch |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GRP-POL-01 | 42-01-PLAN.md | Campaign link auto-updates to new group on creation mid-campaign | SATISFIED | `invalidateGroupCache` called in POST /api/groups after `createGroupRecord` |
| GRP-POL-02 | 42-02-PLAN.md | Group member list shows real contact names from voters/contacts DB | SATISFIED | Members API returns `voterName: string \| null` via batch `inArray` lookup |
| GRP-POL-03 | 42-01-PLAN.md | "Ver detalhes" button contained within card component (no overflow/clipping) | SATISFIED | `flex-wrap` on container + `shrink-0` on right cluster in group-card.tsx |
| GRP-POL-04 | 42-02-PLAN.md | Person joining group via invite link is automatically opted-in | SATISFIED | Webhook auto opt-in loop with `logConsent('opt_in')` for `action === 'add'` |
| GRP-POL-05 | 42-01-PLAN.md | Chip sync pulls proxy/profile from Evolution API and updates DB | SATISFIED | `fetchInstances` before loop; conditional `updateChip` inside loop for proxy and profileName |

No orphaned requirements — all 5 GRP-POL IDs are covered by the two plans.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/conversion-tracking.ts` | 59, 95, 116, 240, 244, 248 | `sql` identifier used but not imported — pre-existing TypeScript errors | Warning | Does not block phase 42 functionality (none of phase 42's flows call these specific functions), but prevents a clean `tsc --noEmit` and was explicitly deferred rather than fixed |

No placeholder comments, empty implementations, or console-log-only stubs found in any of the six phase-modified files.

---

### Human Verification Required

#### 1. Auto-link rotation in live campaign

**Test:** Create a new group mid-campaign via the UI (POST /api/groups), then immediately fire a campaign dispatch that uses the same segmentTag.
**Expected:** The dispatched campaign link resolves to the newly created group, not any previously cached group.
**Why human:** Cache invalidation is in-memory per process. Verifying that the next campaign rotation actually reads past the cleared cache requires running the full campaign dispatch flow against a live instance.

#### 2. Group card layout on narrow viewport

**Test:** Navigate to /grupos on a mobile viewport or at ~640px width. Inspect a group card with both Sincronizar and Arquivar buttons visible.
**Expected:** "Ver detalhes" button stays fully visible and clickable inside the card. Left-side buttons may wrap to a new line if space is tight, but no button overflows or clips out of the card boundary.
**Why human:** Tailwind CSS rendering is visual — programmatic checks cannot confirm actual browser layout behaviour.

#### 3. Chip sync proxy pull from Evolution UI

**Test:** Configure proxy settings directly in the Evolution API admin for a chip instance, without setting them in the application DB. Click "Sincronizar" in the chips page.
**Expected:** After sync, the chip's proxy fields in the DB match what was configured in Evolution API.
**Why human:** Requires a live Evolution API instance with proxy configured to trigger the sync path at lines 127-138 of `src/app/api/chips/sync/route.ts`.

#### 4. Auto opt-in on live group join

**Test:** Have a phone number whose corresponding voter record has `optInStatus !== 'active'` join a group via invite link. Observe the consent log.
**Expected:** A consent event `opt_in` / `whatsapp_group` is recorded for that voter, and their `optInStatus` changes to `active`.
**Why human:** Requires a live WhatsApp webhook delivery of a `group_participants.update` event with `action === 'add'`.

---

### Gaps Summary

**One gap — deferred TypeScript compilation error.** The only gap blocking a fully clean assessment is the pre-existing `sql` import missing in `src/lib/conversion-tracking.ts`. This was present before phase 42 began, was not introduced by either plan, and was explicitly logged to `deferred-items.md`. However, leaving it deferred means `npx tsc --noEmit` returns 6 errors, which is a project-level health issue. The fix is trivial: add `sql` to the existing `drizzle-orm` import on line 8 of `conversion-tracking.ts`.

All six core behaviors required by this phase — cache invalidation on group creation, card layout fix, Evolution proxy sync, voter name enrichment, dual-format phone resolution, and auto opt-in on group join — are implemented, substantive, and wired correctly. No stubs were found in any phase-modified file.

---

_Verified: 2026-03-21T07:00:00Z_
_Verifier: Claude (gsd-verifier)_
