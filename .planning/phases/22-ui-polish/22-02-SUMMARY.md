---
phase: 22-ui-polish
plan: "02"
subsystem: dashboard
tags: [dashboard, layout, error-handling, ux]
dependency_graph:
  requires: [22-01]
  provides: [22-03]
  affects: [dashboard]
tech_stack:
  added: []
  patterns: [Per-endpoint error toasts via sonner, CSS grid fractional units]
key_files:
  created: []
  modified:
    - src/app/page.tsx
decisions:
  - "Right column widened to 320px (from 280px) for ChatQueuePanel comfort"
  - "Per-endpoint error toasts show specific failure context rather than generic message"
metrics:
  duration: "5 min"
  completed: "2026-03-18"
  tasks: "1/1"
  files: "1"
---

# Phase 22 Plan 02: Dashboard Layout Polish Summary

**One-liner:** Dashboard right column widened to 320px with per-endpoint specific error toasts for all API failures

## What Was Built

### Task 1: Widen Right Column + Error Toasts
- Changed `lg:grid-cols-[1fr_280px]` to `lg:grid-cols-[1fr_320px]` — 40px more for ChatQueuePanel
- Added individual `toast.error()` calls for each API endpoint failure:
  - `if (!campRes.ok) toast.error('Erro ao carregar campanhas')`
  - `if (!segRes.ok) toast.error('Erro ao carregar segmentos')`
  - `if (!voterRes.ok) toast.error('Erro ao carregar eleitores')`
  - `if (!chipRes.ok) toast.error('Erro ao carregar chips')`
- Preserved 401 redirect for unauthenticated requests
- Kept existing outer catch for network-level failures

## Commits
- `1850e11` feat(22-02): widen dashboard right column and add per-endpoint error toasts

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
