---
phase: 14-chip-health-reliability
plan: "02"
subsystem: chips-ui, chips-api
tags: [chip-health, monitoring-dashboard, restart, health-ui]
dependency_graph:
  requires: [14-01]
  provides: [chip-health-dashboard-ui, chips-api-health, chips-restart-action]
  affects: [src/app/chips/page.tsx, src/app/api/chips/route.ts, src/app/api/chips/sync/route.ts]
tech_stack:
  added: []
  patterns: [health-first-ux, 7-state-indicator, auto-refresh-15s, progress-bars]
key_files:
  created: []
  modified:
    - src/app/chips/page.tsx
    - src/app/api/chips/route.ts
    - src/app/api/chips/sync/route.ts
decisions:
  - "Rebuilt chips page from table layout to card grid for richer health visualization"
  - "Restart action added to PUT /api/chips with action='restart' param (no separate endpoint)"
  - "Sync endpoint now uses health logic (webhook staleness + restart attempt) instead of simple fetchInstances"
  - "Auto-refresh every 15s client-side with silent background fetch"
metrics:
  duration: "15 min"
  completed: "2026-03-17"
  tasks_completed: 2
  files_changed: 3
---

# Phase 14 Plan 02: Chip Health UI + API Summary

Rebuilt chips page as a health-first monitoring dashboard with 7-state indicators, daily/hourly progress bars, timestamps, and one-click restart — backed by health-aware API and sync endpoints.

## What Was Built

### Task 1: Chips API Health Updates + Restart Endpoint

**GET /api/chips:**
- Returns all chip fields including Phase 14 health fields: `healthStatus`, `messagesSentToday/ThisHour`, `dailyLimit/hourlyLimit`, `lastHealthCheck`, `lastWebhookEvent`, `cooldownUntil`, `bannedAt`, `errorCount`, `blockRate`

**POST /api/chips:**
- Now accepts `dailyLimit` and `hourlyLimit` fields (default 200/25)

**PUT /api/chips — restart action:**
- `{ id, action: 'restart' }` triggers `restartInstance()` → waits 5s → `getConnectionState()` → updates `healthStatus` + legacy `status`
- Returns `{ success, healthStatus, connectionState }`
- Increments `errorCount` on failure

**POST /api/chips/sync (updated):**
- Uses `getConnectionState()` per chip (not bulk fetchInstances)
- Attempts restart for non-connected chips before giving up
- Checks `lastWebhookEvent` staleness (>2min = degraded)
- Returns `{ synced, healthy, degraded, disconnected, chips[] }`

### Task 2: Rebuilt Chips Page

**Layout:** Card grid (1 col mobile, 2 col tablet, 3 col desktop)

**Health summary bar** (top): Live counts of healthy/degraded/disconnected/quarantined

**Each chip card shows:**
1. Large colored status dot overlaid on chip avatar icon
2. Health badge (7-state with color-coded border)
3. Chip name (bold) + phone (monospace)
4. Instance name (muted, truncated)
5. Daily progress bar: "Enviados hoje: X/Y" with color (green→yellow→red at 70/90%)
6. Hourly progress bar: "Esta hora: X/Y"
7. Last health check timestamp ("Xmin atrás")
8. Last webhook event timestamp with warning icon if >2min stale
9. Error count badge (if >0)
10. Cooldown expiry time (if in cooldown)
11. Actions: Enable/Disable toggle, Reiniciar button (degraded/disconnected/quarantined only), Warm (flame), Delete

**Filters:** 8-state filter buttons on desktop, dropdown on mobile

**Auto-refresh:** Every 15s with silent background fetch

**Footer:** "X de Y chips · Auto-atualiza a cada 15s"

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ `src/app/chips/page.tsx` — rebuilt (400+ lines, health-first card grid)
- ✅ `src/app/api/chips/route.ts` — restart action + full health data in GET
- ✅ `src/app/api/chips/sync/route.ts` — health-aware sync logic
- ✅ TypeScript compiles cleanly
- ✅ Commits: 02cb925 (chips API), ee15600 (chips page)
