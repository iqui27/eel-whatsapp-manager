---
phase: 32-system-logs
plan: 01
subsystem: observability
tags: [system-logs, logging, webhook, gemini, db-migration]
dependency-graph:
  requires: []
  provides: [system-logs-table, system-logger-lib, system-logs-api, webhook-instrumentation]
  affects: [src/db/schema.ts, src/lib/system-logger.ts, src/app/api/system-logs/route.ts, src/app/api/webhook/route.ts, src/lib/gemini.ts]
tech-stack:
  added: [system_logs table, drizzle migration 0012]
  patterns: [structured-logging, timed-instrumentation]
key-files:
  created:
    - src/lib/system-logger.ts
    - src/app/api/system-logs/route.ts
    - drizzle/0012_system_logs.sql
  modified:
    - src/db/schema.ts
    - src/app/api/webhook/route.ts
    - src/lib/gemini.ts
decisions:
  - "system_logs table with level/category/message/meta/duration_ms columns + indexes on created_at/level/category"
  - "syslogTimed() wraps async functions to measure duration and log both success and error"
  - "GET /api/system-logs supports level, category, search (ILIKE), from/to date, limit filters"
  - "Webhook instrumented for chip connect/disconnect/ban, opt-in/out events, group capacity warnings"
  - "Gemini analyzeMessage and profileLead instrumented with syslogTimed()"
metrics:
  duration: "~20 min"
  completed: "2026-03-19"
  tasks-completed: 4
  files-modified: 6
---

# Phase 32 Plan 01: System Logs Infrastructure Summary

**One-liner:** system_logs DB table, batch-safe logger lib, filtered GET API, and webhook+Gemini instrumentation

## What Was Built

### Database
- `system_logs` table added to `src/db/schema.ts` with columns: `id`, `level` (debug/info/warn/error), `category`, `message`, `meta` (jsonb), `duration_ms`, `created_at`
- Migration `drizzle/0012_system_logs.sql` created and applied to Supabase
- Indexes on `created_at`, `level`, `category` for fast filter queries

### Logger Library (`src/lib/system-logger.ts`)
- `syslog(level, category, message, meta?)` — base log function
- `syslogInfo/Warn/Error/Debug(...)` — level-specific shortcuts
- `syslogTimed(level, category, message, fn)` — wraps async function, logs duration_ms on completion or error

### API Route (`src/app/api/system-logs/route.ts`)
- `GET /api/system-logs` with query params: `level`, `category`, `search`, `from`, `to`, `limit` (default 100)
- Returns `{ logs: SystemLog[], total: number }`

### Instrumentation
- `src/lib/gemini.ts`: `analyzeMessage` and `profileLead` wrapped with `syslogTimed()`
- `src/app/api/webhook/route.ts`: chip connect/disconnect/ban events, opt-in/out events, group capacity warnings

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/db/schema.ts` contains systemLogs table definition
- [x] `drizzle/0012_system_logs.sql` migration exists
- [x] `src/lib/system-logger.ts` exists with syslog functions
- [x] `src/app/api/system-logs/route.ts` exists
- [x] Commit `b0ec3d4` exists in git log
