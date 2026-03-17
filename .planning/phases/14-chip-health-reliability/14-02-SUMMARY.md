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
  patterns: [health-first-ux, 7-state-indicator, auto-refresh-15s, progress-bars, graceful-degradation]
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
  - "Added 'not_found' status for instances that don't exist in Evolution API (different from disconnected)"
  - "restartInstance returns gracefully when endpoint unavailable (some Evolution API versions don't have it)"
metrics:
  duration: "25 min"
  completed: "2026-03-17"
  tasks_completed: 3
  files_changed: 5
---

# Phase 14 Plan 02: Chip Health UI + API Summary

Rebuilt chips page as a health-first monitoring dashboard with 8-state indicators, daily/hourly progress bars, timestamps, and graceful restart handling — backed by health-aware API and sync endpoints.

## What Was Built

### Task 1: Chips API Health Updates + Restart Endpoint

**GET /api/chips:**
- Returns all chip fields including Phase 14 health fields: `healthStatus`, `messagesSentToday/ThisHour`, `dailyLimit/hourlyLimit`, `lastHealthCheck`, `lastWebhookEvent`, `cooldownUntil`, `bannedAt`, `errorCount`, `blockRate`

**POST /api/chips:**
- Now accepts `dailyLimit` and `hourlyLimit` fields (default 200/25)

**PUT /api/chips — restart action:**
- `{ id, action: 'restart' }` attempts restart, waits, checks connection state
- Returns `{ success, healthStatus, connectionState, restartAvailable, restartMessage }`
- Gracefully handles Evolution API versions without restart endpoint

**POST /api/chips/sync (updated):**
- Uses `getConnectionState()` per chip with instanceExists check
- Detects `not_found` status for missing instances
- Returns `{ synced, healthy, degraded, disconnected, notFound, chips[] }`

### Task 2: Rebuilt Chips Page

**Layout:** Card grid (1 col mobile, 2 col tablet, 3 col desktop)

**Health summary bar** (top): Live counts of healthy/degraded/disconnected/notFound/quarantined

**Each chip card shows:**
1. Large colored status dot overlaid on chip avatar icon
2. Health badge with tooltip explaining the status
3. Chip name (bold) + phone (monospace)
4. Instance name (muted, truncated)
5. Status explanation box (for non-healthy chips)
6. Daily progress bar: "Enviados hoje: X/Y" with color (green→yellow→red)
7. Hourly progress bar: "Esta hora: X/Y"
8. Last health check timestamp + last webhook event with stale warning
9. Error count badge (if >0)
10. Actions: Enable/Disable toggle, Reiniciar button, Warm, Delete

**8 Health Statuses:**
| Status | Meaning |
|--------|---------|
| healthy | Connected + receiving webhook events |
| degraded | Connected but webhook stale (>2min) |
| disconnected | Instance exists but not connected |
| not_found | Instance doesn't exist in Evolution API |
| quarantined | 3+ consecutive restart failures |
| banned | Number blocked by WhatsApp |
| warming_up | New number in warmup phase |
| cooldown | In preventive pause |

### Task 3: Human Verification ✅
- Chips page loads correctly with card layout
- Health statuses display correctly
- Sync shows correct counts including "not found"
- Restart gracefully handles unavailable endpoint

## Deviations from Plan

**Additional fixes during verification:**
1. Fixed hydration error — replaced `TableSkeleton` with card-grid skeleton
2. Added `not_found` status — differentiate "instance doesn't exist" from "disconnected"
3. Graceful restart handling — Evolution API may not have `/instance/restart` endpoint
4. Added health status explanations — tooltips + card-level explanation box

## Self-Check: PASSED
- ✅ `src/app/chips/page.tsx` — rebuilt with 8-state health cards
- ✅ `src/app/api/chips/route.ts` — restart action + full health data
- ✅ `src/app/api/chips/sync/route.ts` — health-aware sync with notFound detection
- ✅ `src/lib/evolution.ts` — graceful restartInstance with success/message return
- ✅ TypeScript compiles cleanly
- ✅ All commits: 02cb925, ee15600, 1f6d702, 01eb392, 5098e39, c0198e2, fc84d7f
