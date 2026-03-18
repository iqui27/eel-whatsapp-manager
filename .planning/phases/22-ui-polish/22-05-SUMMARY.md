---
phase: 22-ui-polish
plan: "05"
subsystem: conversas
tags: [conversas, hitl, mobile, shadcn-dialog, ux]
dependency_graph:
  requires: [22-03]
  provides: [22-08]
  affects: [conversas]
tech_stack:
  added: []
  patterns: [shadcn Dialog replacing custom overlay modal, mobile state toggle for single-column layout]
key_files:
  created: []
  modified:
    - src/app/conversas/page.tsx
decisions:
  - "mobileShowChat state controls single-column view toggle on mobile"
  - "NewConvDialog refactored to accept open prop for Dialog control"
metrics:
  duration: "20 min"
  completed: "2026-03-18"
  tasks: "2/2"
  files: "1"
---

# Phase 22 Plan 05: Conversas Page Polish Summary

**One-liner:** Widened right panel, removed emoji priority indicators, replaced custom overlay modal with shadcn Dialog, and added mobile responsive single-column layout

## What Was Built

### Task 1: Layout + Emoji + Mobile
- Right voter context panel: `w-[280px]` → `w-[320px]`, `hidden lg:flex`
- Priority buttons: `🔥` → "Crit", `Alta` → "Media", `Norm` → "Baixa" (text-only labels)
- Status select: raw `<select>` → shadcn Select
- Mobile: added `mobileShowChat` state, queue hides when chat selected (`hidden lg:flex`), back button in chat header

### Task 2: shadcn Dialog for NewConvDialog
- Replaced `fixed inset-0 z-50 bg-black/40` custom overlay with `<Dialog open={open}>`
- Added `open` prop to NewConvDialog component
- Chip selector: raw `<select>` → shadcn Select
- Added DialogHeader, DialogTitle, DialogDescription, DialogFooter
- Preserved all existing form logic and handlers

## Commits
- `45381b8` fix(22-05): polish conversas page

## Self-Check: PASSED
