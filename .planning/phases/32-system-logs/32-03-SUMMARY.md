---
phase: 32-system-logs
plan: 03
subsystem: observability-perf
tags: [performance, connection-pool, batch-writer, debounce, system-logs]
dependency-graph:
  requires: [32-01, 32-02]
  provides: [batch-logger, debounced-logs-page]
  affects: [src/lib/system-logger.ts, src/app/logs/page.tsx, src/app/api/webhook/route.ts]
tech-stack:
  added: []
  patterns: [in-memory-buffer, batch-insert, appliedRef-pattern, debounce]
key-files:
  created: []
  modified:
    - src/lib/system-logger.ts
    - src/app/logs/page.tsx
    - src/app/api/webhook/route.ts
decisions:
  - "Batch writer: in-memory buffer + 2s flush interval → N individual connections → 1 connection per 2 seconds"
  - "SYSLOG_MIN_LEVEL env var (default 'warn') silences debug/info in production"
  - "appliedRef pattern in logs page decouples filter state from fetch triggers (no stale closure storms)"
  - "400ms debounce on search and date inputs; pill toggles fetch immediately"
  - "Auto-refresh uses doFetch via ref (no interval recreation on filter change)"
  - "Default log limit reduced from 200 to 100"
  - "Routine 'message received' log demoted from syslogInfo to syslogDebug (silent by default)"
metrics:
  duration: "~20 min"
  completed: "2026-03-19"
  tasks-completed: 3
  files-modified: 3
---

# Phase 32 Plan 03: Performance Fixes — Batch Logger + Logs Page Debounce Summary

**One-liner:** In-memory batch logger (2s flush, SYSLOG_MIN_LEVEL guard) + appliedRef debounce pattern prevent DB pool exhaustion and render storms

## Root Cause Analysis

### DB Connection Pool Exhaustion
- **Root cause:** `syslog()` did 1 individual `INSERT` per call. With `max: 10` pool connections and 5+ syslog calls per webhook message, the pool saturated and starved all other queries (conversations, campaigns, CRM).
- **Fix:** In-memory buffer. All log calls push to array. A `setInterval(2000)` flushes with a single bulk `INSERT`. N individual connections → 1 connection per 2 seconds.
- **Guard:** `SYSLOG_MIN_LEVEL=warn` default drops all debug/info calls entirely (no buffer push, no INSERT).

### Logs Page Render Storm  
- **Root cause:** `useCallback` with all filter state as deps + `useEffect([fetchLogs])` → every keystroke and every pill click triggered immediate fetch. No debounce.
- **Fix:** `appliedRef` pattern — filter state lives in refs, `doFetch` reads from refs (no closure staleness). Search/date inputs debounced 400ms. Pill toggles apply immediately (single fetch). Auto-refresh stable (no interval recreation).

## What Changed

### `src/lib/system-logger.ts` — Rewritten
- Module-level `logBuffer: LogEntry[]` array
- `setInterval(flushLogs, 2000)` batch flush with bulk INSERT
- `SYSLOG_MIN_LEVEL` env guard (default `'warn'`)
- Full JSDoc explaining batch writer design rationale

### `src/app/logs/page.tsx` — Rewritten
- `appliedRef` pattern: `filtersRef` holds current state, `doFetch` reads from ref
- 400ms debounce for search/date inputs via `debounceRef`
- `autoRefreshRef` holds `doFetch` — interval never recreates on filter change
- Default limit 200→100

### `src/app/api/webhook/route.ts`
- Routine "message received" log: `syslogInfo` → `syslogDebug` (silent at default SYSLOG_MIN_LEVEL=warn)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/lib/system-logger.ts` has batch writer pattern
- [x] `src/app/logs/page.tsx` has appliedRef + debounce pattern
- [x] Commit `ccc6879` exists in git log
