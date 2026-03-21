---
phase: 43-phone-resolution-group-identity
plan: "02"
subsystem: groups-api, webhook
tags: [group-sender-cache, lid-resolution, members-api, dual-format, webhook]
dependency_graph:
  requires: [43-01]
  provides: [members-api-cache-enrichment, group-join-cache-write]
  affects:
    - src/app/api/groups/[id]/members/route.ts
    - src/app/api/webhook/route.ts
tech_stack:
  added: []
  patterns: [dual-format-phone-lookup, best-effort-cache, cache-fallback]
key_files:
  created: []
  modified:
    - src/app/api/groups/[id]/members/route.ts
    - src/app/api/webhook/route.ts
decisions:
  - "@lid participants remain voterName: null — WhatsApp does not expose @lid↔phone mapping; comment in code documents this for future resolution if API changes"
  - "cachePhoneToName used as fallback only for @s.whatsapp.net (not @lid) — adds resilience when normalizePhone produces a format variant missed by batch query"
  - "Cache write in GROUP_PARTICIPANTS_UPDATE placed after auto opt-in loop, before campaign conversion tracking — preserves logical execution order"
metrics:
  duration: "~8 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 2
  files_changed: 2
---

# Phase 43 Plan 02: Members API Cache Enrichment + Join Cache Write Summary

**One-liner:** Members API now loads group_sender_cache to enrich @s.whatsapp.net voter name resolution; GROUP_PARTICIPANTS_UPDATE writes joining @s.whatsapp.net participants to the cache on join.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Enrich members API with group_sender_cache @lid resolution | b53836b | Done |
| 2 | Write GROUP_PARTICIPANTS_UPDATE join events to group_sender_cache | a65f82f | Done |

## What Was Built

**Task 1 — Members API cache enrichment:**
- Added imports for `getGroupSendersByGroupJid` and `findVoterByPhone` to `src/app/api/groups/[id]/members/route.ts`
- After `fetchGroupParticipants`, loads group sender cache via `getGroupSendersByGroupJid(group.groupJid)`
- Builds `cachePhoneToName` map by calling `findVoterByPhone` for each cache entry with dual-format keys (both 12-digit and 13-digit variants registered)
- Updated enriched participant mapping: `@s.whatsapp.net` participants use `nameByPhone[norm] ?? cachePhoneToName[norm] ?? null` (cache as fallback)
- `@lid` participants remain `voterName: null` with documented comment explaining WhatsApp privacy limitation
- Debug log: `[api/groups/${id}/members] known from sender cache: N voters`
- Response shape unchanged: `{ participants: enriched }` — no frontend breakage

**Task 2 — GROUP_PARTICIPANTS_UPDATE cache write:**
- Added cache write loop in `GROUP_PARTICIPANTS_UPDATE` handler at `action === 'add'`, after auto opt-in loop, before campaign conversion tracking
- Only `@s.whatsapp.net` JIDs written — `@lid` skipped (cannot resolve to phone)
- `upsertGroupSenderCache` now called at 2 sites: group message handler (Plan 01, line 229) and join handler (Plan 02, line 617)
- Confirmed existing opt-in loop uses `findVoterByPhone` (correct dual-format, not `searchVoters` exact-match)
- Errors wrapped in `try/catch` — never propagate to webhook response

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- [x] TypeScript compiles with zero errors across all modified files
- [x] Members API imports and calls `getGroupSendersByGroupJid`, uses result as fallback for voter name resolution
- [x] `@lid` participants remain `voterName: null` (WhatsApp limitation, explicitly commented in code)
- [x] `upsertGroupSenderCache` called in GROUP_PARTICIPANTS_UPDATE for real @s.whatsapp.net joining participants (line 617)
- [x] GROUP_PARTICIPANTS_UPDATE opt-in loop confirmed using `findVoterByPhone` (not searchVoters)
- [x] No existing tests broken, no response schema changes to members API
- [x] `upsertGroupSenderCache` appears at 2 call sites in webhook/route.ts (lines 229 and 617)

## Self-Check: PASSED

- src/app/api/groups/[id]/members/route.ts — FOUND
- src/app/api/webhook/route.ts — FOUND
- b53836b (Task 1 commit) — FOUND
- a65f82f (Task 2 commit) — FOUND
