---
phase: 23-critical-layout
plan: "02"
subsystem: layout
tags: [setup, conversas, theme, dark-mode, height]
dependency_graph:
  requires: []
  provides: [24-01, 25-01]
  affects: [setup, conversas, wizard]
tech_stack:
  added: []
  patterns: [Tailwind theme token system, CSS calc viewport height with bottom nav offset]
key_files:
  created: []
  modified:
    - src/app/setup/page.tsx
    - src/app/conversas/page.tsx
decisions:
  - "Used sed batch replacement for all 46 hex instances — faster and less error-prone than manual edits"
  - "pb-16 md:pb-0 approach for mobile bottom nav offset instead of complex calc"
  - "Wizard page already had SidebarLayout from Phase 21-05 — no changes needed"
metrics:
  duration: "10 min"
  completed: "2026-03-18"
  tasks: "2/2"
  files: "2"
---

# Phase 23 Plan 02: Theme & Height Fix Summary

**One-liner:** Setup page now uses Tailwind theme tokens (zero hex colors) rendering correctly in both light/dark mode; conversas height calculation corrected for actual topbar height and mobile nav

## What Was Built

### Task 1: Setup Page Theme Tokens
Replaced all 46 hardcoded hex color instances with Tailwind theme classes:

| Hex | → | Token |
|-----|---|-------|
| `#0B1220` bg | → | `bg-background` |
| `#111827` bg | → | `bg-card` |
| `#1F2937` bg | → | `bg-muted` |
| `#0F172A` bg | → | `bg-muted/50` |
| `#374151` border | → | `border-input` |
| `#1F2937` border | → | `border-border` |
| `#3B82F6` color | → | `primary` |
| `#22C55E` color | → | `green-600` |
| `text-white` | → | `text-foreground` |
| `text-[#A1A1AA]` | → | `text-muted-foreground` |
| `text-[#71717A]` | → | `text-muted-foreground/70` |
| `text-[#EF4444]` | → | `text-destructive` |
| `text-[14px]` | → | `text-sm` |
| `text-[13px]` | → | `text-xs` |
| `text-[28px]` | → | `text-2xl` |

Zero hex color references remain (`grep -c '#[0-9A-Fa-f]' = 0`).

### Task 2: Conversas Height + Wizard Verification
- `h-[calc(100vh-4rem)]` → `h-[calc(100vh-74px)]` (actual topbar height 74px vs 64px assumed)
- Added `pb-16 md:pb-0` for mobile bottom nav (64px) overlap prevention
- Wizard page: already wrapped in `<SidebarLayout currentPage="wizard">` from Phase 21-05 ✓

## Commits
- `2944f4c` fix(23-02): replace hex colors in setup page and fix conversas height

## Self-Check: PASSED
