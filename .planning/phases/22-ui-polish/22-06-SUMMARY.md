---
phase: 22-ui-polish
plan: "06"
subsystem: crm
tags: [crm, error-handling, alert-dialog, props]
dependency_graph:
  requires: [22-04]
  provides: []
  affects: [crm]
key_files:
  created: []
  modified:
    - src/app/crm/page.tsx
metrics:
  duration: "8 min"
  completed: "2026-03-18"
  tasks: "1/1"
  files: "1"
---

# Phase 22 Plan 06: CRM Page Polish Summary

**One-liner:** Fixed silent error handling, invalid AlertDialog props, and tags column overflow in CRM voter list

## What Was Built
- Added `toast.error('Erro ao carregar eleitores')` on load failure (was `/* silent */`)
- Removed invalid `size="sm"` prop from `<AlertDialogContent>` — replaced with `className="sm:max-w-[425px]"`
- Removed invalid `variant="destructive"` prop from `<AlertDialogAction>` — replaced with `className="bg-destructive..."`
- Tags column: `max-w-[140px]` → `max-w-[200px]` with `flex-wrap gap-1` + `title` tooltip showing all tags

## Commits
- `fc956a9` fix(22-06): polish CRM page

## Self-Check: PASSED
