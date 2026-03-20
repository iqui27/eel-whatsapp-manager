---
phase: 36-dashboard-editorial-polish
plan: "01"
subsystem: dashboard
tags: [ui, polish, v2-editorial-light, layout]
dependency_graph:
  requires: []
  provides: [polished-dashboard-layout, relocated-chat-queue-panel]
  affects: [src/app/page.tsx]
tech_stack:
  added: []
  patterns: [V2-Editorial-Light warm tokens, colored dot trend indicators]
key_files:
  created: []
  modified:
    - src/app/page.tsx
decisions:
  - "ChatQueuePanel relocated below Campanhas Ativas in main column — right column reserved for CommandPanel only"
  - "KPI trend indicators use colored dot spans instead of TrendingUp/TrendingDown icons (no emoji per V2 direction)"
  - "All 7 Ações Rápidas links verified to point to existing routes — /mobile/captura and /mobile/inbox both exist"
  - "CommandPanel right column width reduced from 320px to 300px to give more space to main content"
metrics:
  duration: "~2 min"
  completed: "2026-03-20"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 1
---

# Phase 36 Plan 01: Dashboard Editorial Polish Summary

Dashboard rebuilt with V2 Editorial Light warm styling on KPI cards, ChatQueuePanel relocated below campaigns table, and all Ações Rápidas links audited.

## What Was Built

### Task 1: Rebuild KPI cards with V2 Editorial Light styling and fix dashboard layout

**KPI Card Styling:**
- Background changed from `bg-card` to `bg-[#F8F6F1]` warm white
- Border changed from `border-border` to `border-[#E8E4DD]` warm border
- Added `shadow-sm` for subtle depth
- Value text changed from `text-3xl font-bold` to `text-2xl font-semibold` (more editorial)
- Trend indicators replaced: TrendingUp/TrendingDown Lucide icons replaced with colored dot spans (`h-2 w-2 rounded-full`) per V2 no-emoji direction
- Loading skeleton updated to match warm card styling

**Layout Restructure:**
- Layout changed from `grid-cols-[1fr_320px]` to `grid-cols-[1fr_300px]`
- ChatQueuePanel moved from the right sidebar (where it shared space with CommandPanel) to below the Campanhas Ativas table in the main left column
- CommandPanel is now the sole occupant of the sticky right column with `self-start` positioning
- CommandPanel card updated with warm `bg-[#F8F6F1]` and `border-[#E8E4DD]` styling
- Action buttons updated from `bg-background border-border hover:bg-accent` to warm `bg-[#F8F6F1] border-[#E8E4DD] hover:bg-[#F2F0EB]`

**Ações Rápidas Audit:**
All 7 action links verified against existing app routes:
- "Aquecer chips" — button calling `/api/warming` POST (valid)
- "Nova campanha" → `/campanhas/nova` (EXISTS)
- "Importar eleitores" → `/segmentacao/importar` (EXISTS)
- "Ver compliance" → `/compliance` (EXISTS)
- "Ver relatórios" → `/relatorios` (EXISTS)
- "Captura mobile" → `/mobile/captura` (EXISTS — route confirmed)
- "Inbox prioritária" → `/mobile/inbox` (EXISTS — route confirmed)

No links removed or redirected — all routes are valid.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx next build` completed without errors
- All 4 KPI cards render with `bg-[#F8F6F1]` warm background, `border-[#E8E4DD]` warm border, `shadow-sm`
- ChatQueuePanel renders below Campanhas Ativas (full-width in left column)
- CommandPanel is sticky in right column (solo)
- All Ações Rápidas links point to existing pages

## Self-Check: PASSED

- src/app/page.tsx modified and committed: 839be16
- Build output confirmed: no errors, all routes listed
