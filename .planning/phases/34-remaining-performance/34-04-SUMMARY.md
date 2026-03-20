---
phase: 34-remaining-performance
plan: "04"
subsystem: cron-infrastructure
tags: [cron, log-retention, maintenance, system-logs]
dependency_graph:
  requires: [src/db/schema.ts (systemLogs table), drizzle/0012_system_logs.sql]
  provides: [log-cleanup-cron, 30-day-retention-policy]
  affects: [system_logs table, vercel.json]
tech_stack:
  added: []
  patterns: [drizzle DELETE with lt(), .returning() for count, vercel cron schedule]
key_files:
  created:
    - src/app/api/cron/log-cleanup/route.ts
  modified:
    - vercel.json
decisions:
  - "No withCronLock needed — DELETE is idempotent; running twice just deletes zero rows the second time"
  - "Uses .returning({ id }) to get accurate deleted count (instead of result.rowCount which postgres-js may not expose)"
  - "Schedule 0 3 * * * — daily at 3 AM UTC = midnight BRT, lowest traffic window"
  - "30-day retention — sufficient for debugging recent issues; older logs are analytics noise"
  - "INTERVAL via sql.raw() — Drizzle 0.45 lacks a native interval builder, raw string interpolation is safe here (RETENTION_DAYS is a compile-time constant, not user input)"
metrics:
  duration: "8 min"
  completed: "2026-03-20"
  tasks: 2
  files: 2
---

# Phase 34 Plan 04: Log Retention Cron Summary

**One-liner:** New `/api/cron/log-cleanup` route deletes `system_logs` older than 30 days via `DELETE WHERE created_at < NOW() - INTERVAL '30 days'`, scheduled daily at 3 AM UTC in vercel.json.

## What Was Built

### Task 1: Create log-cleanup Route
Created `src/app/api/cron/log-cleanup/route.ts`:
- Auth: CRON_SECRET or loopback (same pattern as all other cron routes)
- `maxDuration = 30`
- Deletes using `db.delete(systemLogs).where(lt(systemLogs.createdAt, cutoff)).returning({ id: systemLogs.id })`
- Returns `{ message, deleted, retentionDays: 30, timestamp }`
- Logs to console for observability via system_logs

### Task 2: Register in vercel.json
Added `log-cleanup` entry alongside existing `warming` cron:
```json
{
  "crons": [
    { "path": "/api/cron/warming", "schedule": "* * * * *" },
    { "path": "/api/cron/log-cleanup", "schedule": "0 3 * * *" }
  ]
}
```

Commit: `2dc3e1e` — `feat(34-04): add log-cleanup cron with 30-day retention`

## Verification
- `npx tsc --noEmit` passes
- `vercel.json` has exactly 2 crons, log-cleanup entry present
- GET handler exports confirmed

## Deviations from Plan
**[Rule 1 - Bug] Used `.returning({ id })` instead of `result.rowCount`**
- **Found during:** Task 1
- **Issue:** Plan suggested `result.rowCount` but postgres-js driver with drizzle 0.45 may not expose `rowCount` on plain deletes
- **Fix:** Used `.returning({ id: systemLogs.id }).length` — safe, accurate, and consistent with how other delete counts are obtained in the codebase
- **Files modified:** `src/app/api/cron/log-cleanup/route.ts`
- **Commit:** Same as task commit `2dc3e1e`

## Self-Check: PASSED
- `src/app/api/cron/log-cleanup/route.ts` ✅
- `vercel.json` has log-cleanup at `0 3 * * *` ✅
- Commit `2dc3e1e` ✅
