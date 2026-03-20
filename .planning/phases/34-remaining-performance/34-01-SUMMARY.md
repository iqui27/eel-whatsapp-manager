---
phase: 34-remaining-performance
plan: "01"
subsystem: cron-infrastructure
tags: [cron, db-locking, overlap-protection, performance]
dependency_graph:
  requires: [drizzle/0012_system_logs.sql]
  provides: [cron-lock-table, withCronLock-helper, all-cron-routes-protected]
  affects: [all 8 cron routes, DB connection pool]
tech_stack:
  added: [drizzle cron_locks table]
  patterns: [DB advisory lock via INSERT, withCronLock higher-order function]
key_files:
  created:
    - drizzle/0013_cron_locks.sql
    - src/lib/cron-lock.ts
  modified:
    - src/db/schema.ts
    - src/app/api/cron/send-queue/route.ts
    - src/app/api/cron/ai-profile/route.ts
    - src/app/api/cron/chip-health/route.ts
    - src/app/api/cron/campaigns/route.ts
    - src/app/api/cron/warming/route.ts
    - src/app/api/cron/reports/route.ts
    - src/app/api/cron/group-overflow/route.ts
    - src/app/api/cron/reset-counters/route.ts
decisions:
  - "DB-based lock (cron_locks table) chosen over Redis — no extra infra needed, postgres is already the source of truth"
  - "INSERT...ON CONFLICT DO NOTHING pattern — atomic and works without transactions"
  - "Locks auto-expire (lockedUntil timestamp) so a crashed cron can never permanently block future runs"
  - "TTL set to 1.5x maxDuration as safety margin (e.g. maxDuration=60 → TTL=90000ms)"
metrics:
  duration: "15 min"
  completed: "2026-03-20"
  tasks: 2
  files: 10
---

# Phase 34 Plan 01: Cron Overlap Protection Summary

**One-liner:** DB lock table (`cron_locks`) + `withCronLock` higher-order function wraps all 8 cron routes to prevent concurrent execution via INSERT...ON CONFLICT DO NOTHING.

## What Was Built

### Task 1: DB Schema + withCronLock Helper
Added `cronLocks` table to `src/db/schema.ts` with `jobName` (unique), `lockedAt`, and `lockedUntil` columns. Migration `drizzle/0013_cron_locks.sql` created.

Created `src/lib/cron-lock.ts` exporting:
- `acquireCronLock(jobName, ttlMs)` — attempts INSERT, returns `{ acquired: boolean }`
- `releaseCronLock(jobName)` — deletes the lock row
- `withCronLock(jobName, ttlMs, fn)` — wraps async fn, returns `{ locked: boolean, result?: T }`

Commit: `62e8ac8` — `feat(34-01): add cron_locks table and withCronLock helper`

### Task 2: Wrap All 8 Cron Routes
Applied `withCronLock` + `export const maxDuration` to all cron routes:

| Route | maxDuration | TTL |
|-------|-------------|-----|
| send-queue | 300s | 360000ms |
| ai-profile | 300s | 360000ms |
| chip-health | 60s | 90000ms |
| campaigns | 60s | 90000ms |
| warming | 60s | 90000ms |
| reports | 60s | 90000ms |
| group-overflow | 60s | 90000ms |
| reset-counters | 30s | 60000ms |

Commit: `0d4d8bf` — `feat(34-01): wrap all 8 cron routes with withCronLock + maxDuration`

## Verification
- `npx tsc --noEmit` passes
- All 8 routes return `{ message: 'Execução anterior ainda em andamento', skipped: true }` when lock is held

## Deviations from Plan
None — plan executed exactly as written. Note: migration file uses `0013_` prefix (not `0004_` as plan originally suggested) to match actual DB state.

## Self-Check: PASSED
- `src/lib/cron-lock.ts` ✅
- `drizzle/0013_cron_locks.sql` ✅
- All 8 cron routes updated ✅
- Commits `62e8ac8` and `0d4d8bf` ✅
