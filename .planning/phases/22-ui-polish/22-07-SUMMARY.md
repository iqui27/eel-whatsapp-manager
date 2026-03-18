---
phase: 22-ui-polish
plan: "07"
subsystem: governance
tags: [relatorios, compliance, admin, error-handling, alert-dialog]
dependency_graph:
  requires: [22-04]
  provides: []
  affects: [relatorios, compliance, admin]
key_files:
  created: []
  modified:
    - src/app/relatorios/page.tsx
    - src/app/compliance/page.tsx
    - src/app/admin/page.tsx
metrics:
  duration: "20 min"
  completed: "2026-03-18"
  tasks: "2/2"
  files: "3"
---

# Phase 22 Plan 07: Governance Pages Polish Summary

**One-liner:** Added comprehensive toast feedback and AlertDialog confirmation dialogs to Reports, Compliance, and Admin pages

## What Was Built

### Relatorios
- toast import + AlertDialog import added
- `loadCampaigns`: added try/catch with `toast.error`
- `loadSchedules`: added try/catch with `toast.error`, `isLoadingSchedules` state
- `downloadReport`: wrapped in try/catch with `toast.error`
- `createSchedule`: added success/error toasts
- `toggleSchedule`: added success/error toasts
- `removeSchedule`: added success/error toasts
- Loading skeleton for schedules section (2 animated rows)
- AlertDialog for schedule removal confirmation

### Compliance
- toast + AlertDialog imports added
- `load`: added catch with `toast.error('Erro ao carregar dados de compliance')`
- `revokeVoter`: wrapped in try/catch with success/error toasts
- `anonymizeVoter`: wrapped in try/catch with success/error toasts
- Revoke button now opens AlertDialog (state: `voterToRevoke`) instead of calling directly

### Admin
- toast + AlertDialog imports added
- `handleInvite`: added success/error toasts
- `updateRole`: added success/error toasts + try/catch
- `toggleEnabled`: added success/error toasts + try/catch
- `removeUser`: added success/error toasts + try/catch
- `savePermissions`: added success/error toasts + try/catch
- "Confirmar remoção" Dialog converted to AlertDialog with destructive styling

## Commits
- `89ddbdc` fix(22-07): polish relatorios, compliance, and admin pages

## Self-Check: PASSED
