---
phase: 01-v2-shell
plan: 02
subsystem: shell
tags: [topbar, search, alerts, profile, layout]
completed: 2026-03-04

dependency-graph:
  requires: [01-01]
  provides: [v2-topbar, v2-shell-complete]
  affects: [all pages using SidebarLayout]

tech-stack:
  added: []
  patterns: [React controlled input, CSS Flexbox, Tailwind v4 tokens]

key-files:
  created:
    - src/components/topbar.tsx
  modified:
    - src/components/SidebarLayout.tsx

decisions:
  - ThemeToggle moved into Topbar (5th section) for desktop — keeps toggle accessible without dedicating space in header
  - CommandTrigger removed from layout (visual role replaced by search input in Topbar); CommandPalette portal kept for Cmd+K
  - Mobile header stays at h-14 (not Topbar) — Topbar is too wide for mobile viewport
  - Period selector and alerts are visual-only with hardcoded values — real data binding deferred to feature phases

metrics:
  duration: "12 minutes"
  tasks-completed: 2
  files-changed: 2
  files-created: 1
---

# Phase 01 Plan 02: V2 Topbar Summary

**One-liner:** V2 Topbar with search, period selector, alerts badge, and user profile integrated into shell; desktop-only with simplified mobile header.

## What Was Built

### Task 1 — V2 Topbar Component (src/components/topbar.tsx)
New client component with 5 sections in a 74px-height horizontal flex row:

| Section | Content | Width |
|---------|---------|-------|
| Search | Input with Search icon, placeholder "Buscar campanha, eleitor ou tag..." | flex-1, max-w-[420px] |
| Period | Button with Calendar + ChevronDown icons, "Periodo: ultimos 7 dias" | w-[180px] |
| Alerts | AlertTriangle + "2 alertas de bloqueio", amber warning style | w-[220px] |
| Profile | CS initials avatar + "Coord. Sul" role text | w-[120px] |
| Theme | ThemeToggle (moved from layout) | auto |

All props optional with sensible defaults for visual prototype.

### Task 2 — Topbar Integration (src/components/SidebarLayout.tsx)
- Desktop: `<header className="hidden md:block">` rendering `<Topbar />`
- Mobile: separate `<header className="md:hidden">` with hamburger + title + ThemeToggle at h-14
- Removed CommandTrigger import (no longer in layout)
- CommandPalette portal retained (Cmd+K still works)

## Commits

| Hash | Message |
|------|---------|
| `0deddcc` | feat(01-02): create V2 Topbar component |
| `cf720b2` | feat(01-02): integrate V2 Topbar into SidebarLayout |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- ✅ `test -f src/components/topbar.tsx && grep -q "Buscar campanha" && grep -q "export function Topbar"` → PASS
- ✅ `grep -q "import.*Topbar" src/components/SidebarLayout.tsx` → PASS
- ✅ Build: `npm run build` → Compiled successfully, 23 static pages, no TypeScript errors

## Self-Check: PASSED

Files exist:
- ✅ `src/components/topbar.tsx` — contains Buscar campanha, export function Topbar
- ✅ `src/components/SidebarLayout.tsx` — contains import Topbar

Commits exist:
- ✅ `0deddcc` — feat(01-02): create V2 Topbar component
- ✅ `cf720b2` — feat(01-02): integrate V2 Topbar into SidebarLayout
