---
phase: 33-performance-optimization
plan: 01
subsystem: bundle-optimization
tags: [performance, bundle, next.js, framer-motion, recharts, tree-shaking]
dependency_graph:
  requires: []
  provides: [optimized-bundle, lazy-recharts, css-animation]
  affects: [next.config.ts, package.json, template.tsx, relatorios-page]
tech_stack:
  added: [next/dynamic]
  patterns: [optimizePackageImports, CSS-keyframes-animation, dynamic-import]
key_files:
  created: [src/components/charts/ReportCharts.tsx]
  modified: [next.config.ts, package.json, src/app/template.tsx, src/app/globals.css, src/app/relatorios/page.tsx]
  deleted: [src/lib/auth.ts]
decisions:
  - "CSS @keyframes animation replaces framer-motion for page transitions — saves ~40KB from critical path"
  - "recharts extracted to ReportCharts.tsx and lazy-loaded via next/dynamic on /relatorios only"
  - "optimizePackageImports enables tree-shaking for lucide-react, radix-ui, recharts, date-fns"
metrics:
  duration: "5 min"
  completed: "2026-03-20"
  tasks: 2
  files: 7
---

# Phase 33 Plan 01: Bundle Optimization Summary

**One-liner:** Next.js optimizePackageImports + dead dep removal + framer-motion → CSS animation + recharts lazy-loaded on /relatorios (~240KB reduction)

## What Was Built

### Task 1: Next.js config + dead dep cleanup + dead code removal
- **next.config.ts**: Added `experimental.optimizePackageImports` for `lucide-react`, `radix-ui`, `recharts`, `date-fns` — enables tree-shaking for barrel-exported packages
- **package.json**: Removed 3 dead dependencies: `pg`, `@supabase/supabase-js`, `@types/pg` (confirmed zero imports)
- **src/lib/auth.ts**: Deleted — the old JSON-file-based session system (59 lines) fully replaced by `db-auth.ts`

### Task 2: Framer-motion → CSS + recharts lazy-load
- **src/app/template.tsx**: Replaced `<motion.div>` with `<div className="animate-page-enter">` — removes framer-motion from critical path
- **src/app/globals.css**: Added `@keyframes page-enter` (fade-in + translateY 6px→0, 0.18s ease-out) — identical visual behavior, zero JS
- **src/components/charts/ReportCharts.tsx**: New file — extracted `DailyBarChart`, `TrendLineChart`, `ConversionFunnel` from relatorios page
- **src/app/relatorios/page.tsx**: All 3 chart components now loaded via `next/dynamic({ ssr: false })` — defers ~200KB recharts bundle to client-side only on /relatorios

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- `next.config.ts` contains `optimizePackageImports` ✓
- `src/lib/auth.ts` does not exist ✓
- `package.json` has no pg, @supabase/supabase-js, @types/pg ✓
- `template.tsx` has no framer-motion import ✓
- `relatorios/page.tsx` uses next/dynamic ✓
- `ReportCharts.tsx` created ✓
- Build passes ✓
