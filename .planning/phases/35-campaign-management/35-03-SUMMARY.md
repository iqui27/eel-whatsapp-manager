---
phase: 35-campaign-management
plan: "03"
subsystem: campaign-ui
tags: [campaigns, send-config, chips, ui, shadcn]
dependency_graph:
  requires: [35-02]
  provides: [send-config-ui, multi-chip-selector, time-window-persistence]
  affects: [nova-page, editar-page, agendar-page]
tech_stack:
  added: []
  patterns: [collapsible-panel, speed-presets, health-dot-indicator]
key_files:
  created:
    - src/components/SendConfigPanel.tsx
  modified:
    - src/app/campanhas/nova/page.tsx
    - src/app/campanhas/[id]/editar/page.tsx
    - src/app/campanhas/[id]/agendar/page.tsx
decisions:
  - "SendConfigPanel is a single reusable component shared across all three campaign pages — avoids duplication, single source of truth for defaults"
  - "Speed presets (Lento/Normal/Rápido) map to named constant config bundles — operators pick a preset first, then optionally expand advanced controls"
  - "HealthDot color uses chip healthStatus string field — green=healthy, amber=degraded/cooldown, red=quarantined/banned, gray=disconnected"
  - "agendar/page.tsx fully rewritten — old decorative morning/afternoon/evening buttons replaced entirely with real SendConfigPanel"
  - "handleSendNow() now persists config via a PUT before triggering send — guarantees latest config is in DB before queue hydration"
metrics:
  duration: "~25 min"
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 4
---

# Phase 35 Plan 03: Campaign Send Config UI Summary

**One-liner:** Reusable `SendConfigPanel` with speed presets, multi-chip health selector, and real time windows wired into all three campaign pages.

## What Was Built

### `SendConfigPanel.tsx` (new component)

A fully self-contained collapsible configuration panel that manages a `SendConfigValue` object:

- **Speed presets:** Lento / Normal / Rápido buttons that atomically set `batchSize`, `minDelayMs`, `maxDelayMs`, `restPauseEvery`, `restPauseDurationMs`, `longBreakEvery`, `longBreakDurationMs`
- **Advanced config expand:** Individual number inputs for all speed fields, revealed only when user selects "Personalizado"
- **Time window:** Two real `<input type="time">` for `windowStart` / `windowEnd` (was decorative before)
- **Multi-chip selector:** Fetches all chips from `GET /api/chips`, renders a checklist with `HealthDot` component showing chip health + `messagesSentToday/dailyLimit` counter
- **Chip strategy:** `round_robin` / `least_loaded` / `affinity` selector (visible when ≥2 chips selected)
- **Per-chip limits:** `maxDailyPerChip` + `maxHourlyPerChip` number inputs
- **Circuit breaker:** Threshold slider (0–20%) + `pauseOnChipDegraded` toggle
- **Collapsed summary:** Shows active preset or custom values as a single-line summary when panel is collapsed
- **`disabled` prop:** Locks all inputs for sent/sending campaigns

Exports:
- `SendConfigValue` interface
- `DEFAULT_SEND_CONFIG` constant (Normal preset defaults)
- `SendConfigPanel` default export

### Campaign Pages Updated

**`nova/page.tsx`:** Added `allChips` + `sendConfig` state. `saveDraft()` POST body includes all 16 send config fields. `<SendConfigPanel>` rendered below A/B card.

**`editar/page.tsx`:** `loadCampaign()` restores all send config fields from DB into `sendConfig` state (`?? DEFAULT_SEND_CONFIG.*` fallback for old records). `handleSave()` PUT includes all fields. `<SendConfigPanel disabled={isLocked}>`.

**`agendar/page.tsx`:** Full rewrite — removed decorative morning/afternoon/evening time buttons and fake send-rate radio group. Replaced with real `SendConfigPanel` that loads campaign config from DB. `handleSchedule()` and `handleSendNow()` both persist all 16 config fields via PUT.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update campaign API/DB layer | (verified as already complete — no changes needed) | — |
| 2 | Add send config UI to create/edit/schedule pages | 6d5f589 | 4 files |

## Verification

- ✅ `npx tsc --noEmit` — no errors
- ✅ `npx next build` — all routes compile, no errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] agendar/page.tsx had duplicated content from prior session edit**
- **Found during:** Task 2 verification
- **Issue:** Previous edit had appended new content below the old content instead of replacing it, causing the file to be ~2x its intended length
- **Fix:** Full file rewrite with correct unified content
- **Files modified:** `src/app/campanhas/[id]/agendar/page.tsx`
- **Commit:** 6d5f589

**2. [Rule 1 - Discovery] API/DB layer already accepted all fields (Task 1 was no-op)**
- **Found during:** Task 1
- **Issue:** Plan assumed route.ts and db-campaigns.ts needed code changes — they did not. `addCampaign(body)` / `updateCampaign(id, updates)` use full `NewCampaign` inferred Drizzle type which already includes all 16 Phase 35-02 fields.
- **Fix:** Verified and documented; skipped Task 1 code changes
- **Impact:** Saved ~15 min, no risk of regression

## Self-Check: PASSED
- `src/components/SendConfigPanel.tsx` — FOUND ✅
- `src/app/campanhas/nova/page.tsx` — MODIFIED ✅
- `src/app/campanhas/[id]/editar/page.tsx` — MODIFIED ✅
- `src/app/campanhas/[id]/agendar/page.tsx` — MODIFIED ✅
- Commit 6d5f589 — FOUND ✅
