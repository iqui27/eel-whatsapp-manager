---
phase: 35-campaign-management
plan: "01"
subsystem: campaign-ui + observability
tags: [bug-fix, sidebar, syslog, cron, instrumentation]
dependency_graph:
  requires: []
  provides: [single-sidebar-campaign-pages, cron-observability]
  affects: [all-cron-routes, system-logger, campaign-detail-pages]
tech_stack:
  added: []
  patterns: [passthrough-layout, syslog-instrumentation]
key_files:
  created: []
  modified:
    - src/app/campanhas/[id]/layout.tsx
    - src/app/campanhas/[id]/page.tsx
    - src/app/campanhas/[id]/mensagens/page.tsx
    - src/lib/system-logger.ts
    - src/app/api/cron/send-queue/route.ts
    - src/app/api/cron/campaigns/route.ts
    - src/app/api/cron/chip-health/route.ts
    - src/app/api/cron/reset-counters/route.ts
    - src/app/api/cron/warming/route.ts
    - src/app/api/cron/ai-profile/route.ts
    - src/app/api/cron/group-overflow/route.ts
    - src/app/api/cron/reports/route.ts
decisions:
  - "layout.tsx is now a passthrough — each sub-page owns its own SidebarLayout wrapper"
  - "SYSLOG_MIN_LEVEL default changed from 'warn' to 'info' for full cron observability"
  - "flushBuffer now logs errors to console.error instead of silently discarding"
metrics:
  duration: "7 minutes"
  completed: "2026-03-20"
  tasks_completed: 2
  tasks_planned: 2
  files_modified: 12
---

# Phase 35 Plan 01: Quick Fixes Summary

**One-liner:** Passthrough layout eliminates double sidebar; syslog default raised to 'info' with full cron instrumentation across all 8 routes.

## What Was Built

### Task 1 — Double Sidebar Fix

The root cause was `src/app/campanhas/[id]/layout.tsx` wrapping all children in `<SidebarLayout>` while the sub-pages (`editar`, `monitor`, `agendar`, `mensagens`) each also wrapped themselves in `<SidebarLayout>` — producing a nested double sidebar.

**Fix applied:**
- `layout.tsx` → passthrough (`export default function ... { return <>{children}</>; }`) — no `use client`, no SidebarLayout
- `page.tsx` (campaign detail) → added its own `<SidebarLayout currentPage="campanhas" pageTitle="Campanha">` wrapper
- `mensagens/page.tsx` → added its own `<SidebarLayout currentPage="campanhas" pageTitle="Mensagens">` wrapper
- `editar/page.tsx`, `monitor/page.tsx`, `agendar/page.tsx` — left untouched (already had their own SidebarLayout)

### Task 2 — System Logger Default + Cron Instrumentation

Two changes to `system-logger.ts`:
1. `MIN_LEVEL` default changed from `'warn'` → `'info'` — info-level cron entries now persist to DB without needing `SYSLOG_MIN_LEVEL=info` in env
2. `flushBuffer` catch block now calls `console.error(...)` instead of silently discarding — DB write failures are now visible in server logs

All 8 cron routes instrumented with syslog:

| Cron | Calls | Details logged |
|------|-------|----------------|
| send-queue | 4 | started, skipped-window, completed-empty, completed |
| campaigns | 2 | started, completed (scanned/claimed/hydrated/failed) |
| chip-health | 2 | started, completed (checked/healthy/degraded/disconnected/quarantined) |
| reset-counters | 3 | started, completed-hourly, completed-daily |
| warming | 3 | started, skipped-disabled, completed (total/results) |
| ai-profile | 4 | started, completed-empty, completed, error |
| group-overflow | 4 | started, completed-none, completed, error |
| reports | 2 | started, completed (processed count) |

## Verification

- `npx next build` passes with no errors
- `layout.tsx` — no SidebarLayout import, passthrough only
- `page.tsx` and `mensagens/page.tsx` — each import and wrap with SidebarLayout
- `system-logger.ts` — defaults to `'info'`
- All 8 cron files — `syslog` imported, 2-4 calls each (confirmed via grep)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 8acf3d5 | fix(35-01): remove double sidebar on campaign sub-pages |
| Task 2 | 08754c3 | feat(35-01): default syslog to info + instrument all 8 crons |
