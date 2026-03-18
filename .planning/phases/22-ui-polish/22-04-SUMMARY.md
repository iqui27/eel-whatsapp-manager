---
phase: 22-ui-polish
plan: "04"
subsystem: campanhas-segmentacao
tags: [campanhas, segmentacao, ux, alert-dialog, shadcn-select]
dependency_graph:
  requires: [22-03]
  provides: [22-06, 22-07]
  affects: [campanhas, segmentacao]
tech_stack:
  added: []
  patterns: [AlertDialog for destructive confirmations, shadcn Select replacing raw HTML select]
key_files:
  created: []
  modified:
    - src/app/campanhas/page.tsx
    - src/app/segmentacao/page.tsx
decisions:
  - "window.confirm replaced with AlertDialog per shadcn UX patterns"
  - "shadcn Select used for filter dropdowns, maintaining category groupings via div labels"
metrics:
  duration: "15 min"
  completed: "2026-03-18"
  tasks: "2/2"
  files: "2"
---

# Phase 22 Plan 04: Campanhas + Segmentacao Polish Summary

**One-liner:** Added toast.error on load failure, replaced window.confirm with AlertDialog and raw selects with shadcn Select in both campaign and segmentation pages

## What Was Built

### Task 1: Campanhas page
- Added `toast.error('Erro ao carregar campanhas')` in catch block (was silent)
- Changed template preview from manual slice+truncate to `line-clamp-1` + `title` tooltip
- Added `title` attributes to all 4 action buttons (Monitorar, Editar, Duplicar, Excluir)

### Task 2: Segmentacao page
- Replaced `window.confirm()` with shadcn AlertDialog (state: `segmentToDelete`)
- Replaced `<select>` in FilterRow with shadcn Select component
- Replaced `<select>` in "add filter" row with shadcn Select (category groups via div labels)
- Added `isLoadingSegments` state with loading skeleton (3 animated rows)
- Added `line-clamp-1` + `title` on filter summary column

## Commits
- `6fafbe2` fix(22-04): polish campanhas and segmentacao pages

## Self-Check: PASSED
