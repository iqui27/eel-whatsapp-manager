---
phase: 22-ui-polish
plan: "01"
subsystem: navigation
tags: [navigation, shell, mobile, dashboard, fix]
dependency_graph:
  requires: [21-campaign-integration]
  provides: [22-02, 22-03]
  affects: [dashboard, sidebar, campanhas, grupos]
tech_stack:
  added: []
  patterns: [Next.js layout.tsx for route-level shell wrapping, Link component for internal navigation]
key_files:
  created:
    - src/app/campanhas/[id]/layout.tsx
    - src/app/grupos/layout.tsx
  modified:
    - src/app/page.tsx
    - src/components/SidebarLayout.tsx
    - src/app/campanhas/[id]/page.tsx
    - src/app/grupos/page.tsx
decisions:
  - "Used layout.tsx approach for SidebarLayout wrapping instead of converting server components to client components"
  - "Kept contacts/clusters in PageId union type to avoid breaking existing pages, removed from nav only"
metrics:
  duration: "12 min"
  completed: "2026-03-18"
  tasks: "3/3"
  files: "6"
---

# Phase 22 Plan 01: Navigation Fix Summary

**One-liner:** Complete removal of broken operations tab + mobile nav indices fixed + orphaned pages wrapped in SidebarLayout with Link conversions

## What Was Built

### Task 1: Dashboard Operations Tab Removal
- Removed `fetchOperations` callback and its auto-refresh `useEffect`  
- Removed Tab Switcher JSX (overview/operations buttons referencing `activeTab`)
- Removed entire Operations Tab JSX block (AlertsPanel, ConversionKPIs, ChipHealthGrid, CampaignProgressBars, GroupCapacityGrid, MessageFeed)
- Removed overview tab conditional wrapper — content now renders directly
- Added `totalSent > 0` guard to "Respostas" and "Bloqueios" KPI sublabel calculations

### Task 2: SidebarLayout Mobile Nav Fix
- Fixed mobile bottom nav indices: `[0]` Dashboard, `[2]` Campanhas, `[4]` Conversas, `[5]` CRM, `[7]` Relatorios
- Removed `Contatos` and `Clusters` entries from `legacyNavItems` (no longer appear in sidebar)
- Removed unused `Users` and `Layers` icon imports
- Kept `contacts` and `clusters` in `PageId` union type (existing pages still exist)

### Task 3: Orphaned Pages + Link Conversion
- Created `src/app/campanhas/[id]/layout.tsx` — wraps campaign detail and mensagens sub-route in SidebarLayout
- Created `src/app/grupos/layout.tsx` — wraps grupos page in SidebarLayout
- Converted `<a href>` to `<Link>` in `campanhas/[id]/page.tsx` (2 links: Ver mensagens, Voltar)
- Converted `<a href>` to `<Link>` in `grupos/page.tsx` (4 filter links: Todos, Ativos, Cheios, Arquivados)

## Commits
- `d363153` fix(22-01): complete dashboard operations tab removal and fix KPI division by zero
- `3e91962` fix(22-01): fix mobile nav indices and remove deprecated sidebar items
- `7c3f19f` fix(22-01): wrap orphaned pages in SidebarLayout and convert a-href to Link

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files verified:
- `src/app/page.tsx` ✓
- `src/components/SidebarLayout.tsx` ✓
- `src/app/campanhas/[id]/layout.tsx` ✓
- `src/app/campanhas/[id]/page.tsx` ✓
- `src/app/grupos/layout.tsx` ✓
- `src/app/grupos/page.tsx` ✓

TypeScript: passes with no errors

## Self-Check: PASSED
