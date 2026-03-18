---
phase: 22-ui-polish
plan: "03"
subsystem: operacoes
tags: [operacoes, ux, loading-states, truncation, voter-count]
dependency_graph:
  requires: [22-02]
  provides: []
  affects: [operacoes, campaign-progress-bars, group-capacity-grid]
tech_stack:
  added: []
  patterns: [line-clamp-1 + title tooltip for text overflow, isLoading flag for loading vs empty state differentiation]
key_files:
  created: []
  modified:
    - src/components/campaign-progress-bars.tsx
    - src/components/group-capacity-grid.tsx
    - src/app/operacoes/page.tsx
decisions:
  - "Used line-clamp-1 with title attribute instead of truncate + max-w for better accessibility and full-width utilization"
  - "Error toasts for API failures only shown on manual refresh (showRefreshing check) to avoid spamming on auto-refresh"
metrics:
  duration: "10 min"
  completed: "2026-03-18"
  tasks: "2/2"
  files: "3"
---

# Phase 22 Plan 03: Operacoes Polish Summary

**One-liner:** Removed artificial text truncation in campaign/group components, fixed perpetual loading spinners with isLoading flag, and populated real voter count in NextActionsPanel

## What Was Built

### Task 1: Fix Text Truncation
- `campaign-progress-bars.tsx`: Replaced `truncate max-w-[200px]` with `line-clamp-1` + `title={campaign.name}` — campaign name now uses full available width
- `group-capacity-grid.tsx`: Replaced `truncate max-w-[120px]` with `line-clamp-1` + `title={group.name}` for group name
- `group-capacity-grid.tsx`: Replaced `truncate max-w-[80px]` with `line-clamp-1` + `title={group.chipInstanceName}` for chip instance name

### Task 2: Fix Loading States + Voter Count + Error Toasts
- Fixed `GroupCapacityGrid loading={isLoading}` — was `groupsData.length === 0` (shows perpetual skeleton when empty)
- Fixed `MessageFeed loading={isLoading}` — was `messagesData.length === 0` (same issue)
- Added `voterTotal` state + fetch to `/api/voters?limit=1` in `fetchOperations`
- Updated `systemState.voters.total` to use `voterTotal` instead of hardcoded `0`
- Added per-endpoint error toasts (only on manual refresh): operacoes, KPIs, mensagens, grupos
- Imported `toast` from `sonner`

## Commits
- `b9e24e2` fix(22-03): remove artificial text truncation in campaign and group components
- `7f2eb24` fix(22-03): fix loading vs empty state and populate voter count in Operacoes

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
