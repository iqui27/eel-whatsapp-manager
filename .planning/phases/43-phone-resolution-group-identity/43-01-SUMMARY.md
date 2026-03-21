---
phase: 43-phone-resolution-group-identity
plan: "01"
subsystem: webhook
tags: [phone-resolution, group-sender-cache, drizzle, schema, dual-format]
dependency_graph:
  requires: []
  provides: [group_sender_cache-table, upsertGroupSenderCache, getGroupSendersByGroupJid]
  affects: [src/app/api/webhook/route.ts, src/db/schema.ts]
tech_stack:
  added: []
  patterns: [drizzle-onConflictDoUpdate, dual-format-phone-lookup, best-effort-cache]
key_files:
  created:
    - src/lib/db-group-sender-cache.ts
    - drizzle/0017_group_sender_cache.sql
  modified:
    - src/db/schema.ts
    - src/app/api/webhook/route.ts
decisions:
  - Migration placed in drizzle/ (not migrations/) — matches project drizzle.config.ts out dir
  - normalizedSender hoisted to outer scope to be accessible after message insert
metrics:
  duration: "~10 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 3
  files_changed: 4
---

# Phase 43 Plan 01: Phone Resolution + Group Sender Cache Summary

**One-liner:** Dual-format voter phone lookup already applied in webhook; added group_sender_cache table, migration, and cache population for @lid resolution infrastructure.

## Tasks Completed

| # | Name | Commit | Status |
|---|------|--------|--------|
| 1 | Fix 1:1 webhook voter resolution with findVoterByPhone | daedf76 (prior) | Done (pre-existing) |
| 2 | Add group_sender_cache table to schema and create migration | 6555b97 | Done |
| 3 | Create db-group-sender-cache.ts and wire cache population in webhook | 6fa6957 | Done |

## What Was Built

**Task 1 — Webhook voter resolution (pre-applied):**
The webhook already used `findVoterByPhone` (dual-format inArray query) from commit `daedf76`. Both the 1:1 voter lookup (line 308) and the group sender name lookup (line 209) use this function. `searchVoters` exact-match pattern is completely absent from the file.

**Task 2 — group_sender_cache schema + migration:**
- Added `groupSenderCache` Drizzle table to `src/db/schema.ts` with columns: `id`, `groupJid`, `senderJid`, `normalizedPhone`, `lastSeenAt`
- Two indexes: `idx_group_sender_cache_group` (groupJid), `idx_group_sender_cache_phone` (normalizedPhone)
- Migration SQL at `drizzle/0017_group_sender_cache.sql` with `CREATE TABLE IF NOT EXISTS`, indexes, and composite unique constraint `(group_jid, sender_jid)` for upsert support
- Exported `GroupSenderCache` and `NewGroupSenderCache` types

**Task 3 — Cache library + webhook wiring:**
- Created `src/lib/db-group-sender-cache.ts` with:
  - `upsertGroupSenderCache(groupJid, senderJid, normalizedPhone)` — ON CONFLICT DO UPDATE refreshes `lastSeenAt`
  - `getGroupSendersByGroupJid(groupJid)` — returns all sender mappings for a group
- Wired cache population in webhook group message handler after message insert
- `normalizedSender` hoisted to outer scope (was inside `if (senderPhone)` block) for accessibility
- Cache write wrapped in try/catch — errors logged but never propagate to webhook response

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration directory mismatch**
- **Found during:** Task 2
- **Issue:** Plan specified `migrations/0017_group_sender_cache.sql` but the project uses `drizzle/` as the migration output directory (per `drizzle.config.ts` `out: './drizzle'`)
- **Fix:** Created migration at `drizzle/0017_group_sender_cache.sql` instead
- **Files modified:** drizzle/0017_group_sender_cache.sql (path)
- **Commit:** 6555b97

**2. [Rule 1 - Bug] normalizedSender scope issue**
- **Found during:** Task 3
- **Issue:** Original code declared `const normalizedSender` inside `if (senderPhone)` block, making it inaccessible outside. The cache write needed `normalizedSender` after the insert.
- **Fix:** Changed to `const normalizedSender = senderPhone ? normalizePhone(senderPhone) : null` at outer scope
- **Files modified:** src/app/api/webhook/route.ts
- **Commit:** 6fa6957

### Migration Application

DATABASE_URL was not available in the execution environment. The migration SQL file is created and ready. Apply manually with:
```bash
npx drizzle-kit push
# or
psql "$DATABASE_URL" -f drizzle/0017_group_sender_cache.sql
```

## Success Criteria Verification

- [x] TypeScript compiles with zero errors
- [x] Webhook 1:1 path uses `findVoterByPhone` (dual-format), not `searchVoters` exact-match
- [x] Webhook group message sender name lookup uses `findVoterByPhone`
- [x] `group_sender_cache` table defined in schema.ts with correct columns and composite unique constraint
- [x] Migration SQL exists at `drizzle/0017_group_sender_cache.sql`
- [x] `src/lib/db-group-sender-cache.ts` exports `upsertGroupSenderCache` and `getGroupSendersByGroupJid`
- [x] Webhook calls `upsertGroupSenderCache` for real @s.whatsapp.net group senders, wrapped in try/catch
