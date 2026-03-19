---
phase: 31-diagnostic-fixes
plan: 03
subsystem: groups
tags: [groups, admin-promotion, voter-search, create-group-dialog, evolution-api]
dependency-graph:
  requires: []
  provides: [group-admin-promotion, voter-search-in-create-dialog]
  affects: [create-group-dialog, groups-api]
tech-stack:
  added: []
  patterns: [debounced-search, admin-promotion-loop, graceful-failure]
key-files:
  created: []
  modified:
    - src/components/create-group-dialog.tsx
    - src/app/api/groups/route.ts
decisions:
  - "Admin promotion failures are caught individually — one failure doesn't block others or group creation"
  - "Voter search uses 300ms debounce on 3+ char input to avoid excessive API calls"
  - "Admins array sent in POST body alongside participants"
metrics:
  duration: "~20 min"
  completed: "2026-03-19"
  tasks-completed: 2
  files-modified: 2
---

# Phase 31 Plan 03: Group Admin Promotion + Voter Search in CreateGroupDialog Summary

**One-liner:** Added admin phones field + voter search picker to CreateGroupDialog, and wired `updateParticipant('promote')` in groups API so admins are actually promoted in WhatsApp after group creation.

## What Was Built

1. **Admin phones field in CreateGroupDialog** (`src/components/create-group-dialog.tsx`) — New `adminPhones` state and textarea input labeled "Telefones dos administradores". Parsed same way as participants (comma/newline split, trim, filter). Sent as `admins` array in POST body.

2. **Voter search picker** — Search input with debounce (300ms, 3+ chars) that queries `/api/voters?search={q}&limit=10`. Shows dropdown of name+phone results. Clicking a result appends phone to participants textarea. Cleared after selection.

3. **Admin promotion in groups POST** (`src/app/api/groups/route.ts`) — After group creation and invite code fetch, loops through `admins` array calling `updateParticipant('promote', [adminPhone])` for each. Failures are caught and logged but don't block group creation or remaining promotions.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- [x] `adminPhones` state in `create-group-dialog.tsx` (line 31)
- [x] Admin phones textarea rendered (line 304)
- [x] `updateParticipant('promote')` called in groups route (line 121 log line)
- [x] Build passes without errors
