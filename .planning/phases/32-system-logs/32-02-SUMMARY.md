---
phase: 32-system-logs
plan: 02
subsystem: observability-ui
tags: [system-logs, ui, dashboard, filters, csv-export, auto-refresh]
dependency-graph:
  requires: [32-01]
  provides: [logs-page, logs-navigation]
  affects: [src/app/logs/page.tsx, src/components/SidebarLayout.tsx, src/lib/authorization.ts]
tech-stack:
  added: []
  patterns: [filter-pills, expandable-rows, auto-refresh, csv-export]
key-files:
  created:
    - src/app/logs/page.tsx
  modified:
    - src/components/SidebarLayout.tsx
    - src/lib/authorization.ts
decisions:
  - "Level pills: DEBUG/INFO/WARN/ERROR with color coding; category pills auto-populated from API response"
  - "Relative timestamps (useEffect humanizeDate) to avoid SSR/hydration mismatch"
  - "Expandable meta JSON rows for viewing structured log data inline"
  - "Duration badge shown as yellow/red based on ms threshold"
  - "'logs' page mapped to 'operations.view' permission (operators can see logs)"
  - "Auto-refresh every 10s while page is active; pauses on blur"
  - "CSV export downloads all filtered logs as UTF-8 BOM CSV"
metrics:
  duration: "~25 min"
  completed: "2026-03-19"
  tasks-completed: 3
  files-modified: 3
---

# Phase 32 Plan 02: System Logs UI Page Summary

**One-liner:** Full /logs dashboard with level/category filter pills, search, date range, expandable JSON, auto-refresh, and CSV export

## What Was Built

### `/logs` Page (`src/app/logs/page.tsx`)
- **Filters:** Level pills (DEBUG/INFO/WARN/ERROR), category pills (dynamic from API), text search (ILIKE), date range inputs
- **Table:** level badge, category, message, duration badge (yellow >500ms, red >2000ms), relative timestamp
- **Expandable rows:** click any row to expand and see formatted JSON meta
- **Auto-refresh:** every 10s, pauses when window loses focus
- **CSV export:** downloads current filtered view as UTF-8 BOM CSV (compatible with Excel)
- **Limit selector:** 50/100/500 rows

### Navigation
- `src/components/SidebarLayout.tsx`: added `'logs'` to `PageId` type, `ScrollText` icon imported, entry added to `legacyNavItems` under "Sistema"
- `src/lib/authorization.ts`: `'logs'` → `'operations.view'` permission mapping

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] `src/app/logs/page.tsx` exists
- [x] SidebarLayout has 'logs' nav entry
- [x] Commit `a30c991` exists in git log
