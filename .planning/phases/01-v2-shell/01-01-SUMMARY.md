---
phase: 01-v2-shell
plan: 01
subsystem: shell
tags: [design-tokens, sidebar, navigation, electoral]
completed: 2026-03-04

dependency-graph:
  requires: []
  provides: [v2-design-tokens, electoral-sidebar]
  affects: [all pages using SidebarLayout]

tech-stack:
  added: []
  patterns: [CSS custom properties, Tailwind v4 tokens, Framer Motion animations]

key-files:
  created: []
  modified:
    - src/app/globals.css
    - src/components/SidebarLayout.tsx

decisions:
  - Kept dark mode tokens unchanged — V2 is a light-mode editorial direction
  - Used AlertTriangle icon (success green) for block risk in footer — matches Paper wireframe
  - Legacy section header hidden when sidebar is collapsed (no space for label)
  - Mobile bottom nav uses 5 of the 8 electoral items (Dashboard, Campanhas, Conversas, CRM, Relatorios)

metrics:
  duration: "18 minutes"
  tasks-completed: 2
  files-changed: 2
---

# Phase 01 Plan 01: V2 Design Tokens + Electoral Sidebar Summary

**One-liner:** Warm-white V2 Editorial Light tokens and 8-item electoral sidebar replacing WhatsApp Manager shell.

## What Was Built

### Task 1 — V2 Design Tokens (globals.css)
Updated light mode CSS custom properties to V2 Editorial Light direction:

| Token | Before | After |
|-------|--------|-------|
| `--background` | `#FAFAFA` | `#F8F6F1` (warm white) |
| `--sidebar` | `#FFFFFF` | `#F2F0EB` (warm sidebar tint) |
| `--sidebar-accent` | `#EFF6FF` | `#E8E5DE` (warm active state) |
| `--sidebar-accent-foreground` | `#2563EB` | `#1A1A1A` (dark text) |
| `--border` | `#E5E7EB` | `#E2DFD8` (warm border) |
| `--sidebar-border` | `#E5E7EB` | `#DDD9D1` (warm sidebar border) |

Added V2 utility classes: `.v2-headline` (Georgia serif, -0.02em tracking) and `.v2-density-compact` (compact spacing vars).

### Task 2 — Electoral Sidebar Navigation (SidebarLayout.tsx)
- **8 primary electoral nav items:** Dashboard, Campanhas, Segmentacao, Conversas, CRM, Compliance, Relatorios, Admin
- **Legacy "Operacional" section:** Chips, Contatos, Clusters, Historico, Configuracoes (smaller 12px text)
- **Brand:** "EEL Eleicao" / "Operacao WhatsApp"  
- **Footer:** API status + "Risco de bloqueio: Baixo" in success green
- **Mobile bottom nav:** 5 electoral items (Dashboard, Campanhas, Conversas, CRM, Relatorios)
- All Framer Motion animations preserved: collapse, active bar indicator, mobile drawer

## Commits

| Hash | Message |
|------|---------|
| `6534d65` | feat(01-01): update design tokens to V2 Editorial Light |
| `e98564b` | feat(01-01): rebuild sidebar with V2 electoral navigation |

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- ✅ `grep -q "F8F6F1" src/app/globals.css && grep -q "v2-headline" src/app/globals.css` → PASS
- ✅ `grep -q "Campanhas" && grep -q "EEL Eleicao" && grep -q "Risco de bloqueio"` → PASS
- ✅ Build: `npm run build` → Compiled successfully, 23 static pages generated
- ✅ TypeScript: `tsc --noEmit` → No errors

## Self-Check: PASSED

Files exist:
- ✅ `src/app/globals.css` — contains F8F6F1, v2-headline
- ✅ `src/components/SidebarLayout.tsx` — contains Campanhas, EEL Eleicao, Risco de bloqueio

Commits exist:
- ✅ `6534d65` — feat(01-01): update design tokens to V2 Editorial Light
- ✅ `e98564b` — feat(01-01): rebuild sidebar with V2 electoral navigation
