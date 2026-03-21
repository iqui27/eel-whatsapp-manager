---
phase: 42-groups-polish-conversion-tracking
plan: "01"
subsystem: groups
tags: [groups, cache, ui, chips, proxy, evolution-api]
dependency_graph:
  requires: []
  provides:
    - "POST /api/groups busts segment cache on creation"
    - "Group card actions row layout fixed for narrow viewports"
    - "Chip sync pulls proxy and profile from Evolution API"
  affects:
    - "src/app/api/groups/route.ts"
    - "src/components/group-card.tsx"
    - "src/lib/evolution.ts"
    - "src/app/api/chips/sync/route.ts"
tech_stack:
  added: []
  patterns:
    - "Cache invalidation on mutation (invalidateGroupCache after createGroupRecord)"
    - "One-time bulk fetch before loop (fetchInstances outside chip loop)"
    - "One-directional sync: Evolution API -> DB"
key_files:
  created: []
  modified:
    - "src/app/api/groups/route.ts"
    - "src/components/group-card.tsx"
    - "src/lib/evolution.ts"
    - "src/app/api/chips/sync/route.ts"
decisions:
  - "Guard invalidateGroupCache with if (group.segmentTag) since not all groups have a segment"
  - "fetchInstances called once outside the chip loop to avoid N+1 API calls"
  - "Proxy sync is one-directional (Evolution -> DB only) — we do not push DB proxy back to Evolution in sync"
  - "Pre-existing TypeScript errors in conversion-tracking.ts (from 42-02) are out of scope and not fixed here"
metrics:
  duration: "~15 minutes"
  completed_date: "2026-03-21"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 4
---

# Phase 42 Plan 01: Groups Polish — Cache Fix, Card Layout, Chip Proxy Sync Summary

**One-liner:** Cache invalidation on group creation, flex-wrap fix for card actions overflow, and Evolution-to-DB proxy sync via fetchInstances in chip sync.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Wire invalidateGroupCache into POST /api/groups | bffb51a | src/app/api/groups/route.ts |
| 2 | Fix group card actions row flex layout | 4188641 | src/components/group-card.tsx |
| 3 | Extend EvolutionInstance + sync proxy/profile in chip sync | eac9330 | src/lib/evolution.ts, src/app/api/chips/sync/route.ts |

## What Was Built

### Task 1 — Cache Invalidation on Group Creation
`POST /api/groups` now calls `invalidateGroupCache(group.segmentTag)` immediately after `createGroupRecord` succeeds. This busts all campaign-scoped cache entries for the segment, so the next campaign rotation picks up the newly created group instead of waiting for the 5-minute TTL to expire.

- Import added: `import { invalidateGroupCache } from '@/lib/group-link-cache'`
- Guard: `if (group.segmentTag)` — not all groups have a segment tag
- Placed after `createGroupRecord` returns but before `NextResponse.json` return

### Task 2 — Group Card Actions Row Overflow Fix
Two targeted Tailwind class changes prevent the "Ver detalhes" button from overflowing or clipping on narrower grid layouts:

1. Actions row container (`div` with `border-t`): added `flex-wrap` so left-side buttons (Sincronizar, Arquivar) redistribute when space is tight
2. Right cluster (`ml-auto div`): added `shrink-0` so the edit dialog + "Ver detalhes" group never shrinks or wraps behind the card edge

### Task 3 — Chip Sync Pulls Proxy/Profile from Evolution API
Two changes across two files:

**`src/lib/evolution.ts`** — Extended `EvolutionInstance` interface with optional `proxy` field covering `host`, `port`, `protocol`, `username`, `password`. This reflects what Evolution API actually returns from `/instance/fetchInstances` when proxy is configured in the Evolution UI.

**`src/app/api/chips/sync/route.ts`** — Before the chip loop, calls `fetchInstances` once and builds a `Map<name, EvolutionInstance>`. Inside the loop, after health status is updated, syncs Evolution proxy config to DB when the values differ, and syncs `profileName` when the DB record is empty. The `fetchInstances` call is non-fatal — failures log a warning and the sync continues without detail enrichment.

## Decisions Made

1. **Guard on segmentTag:** Not all groups have a segmentTag (e.g., ad-hoc groups not tied to a campaign segment). The guard prevents calling `invalidateGroupCache` with `undefined`.

2. **fetchInstances outside the loop:** A single bulk call for all instances avoids N API calls (one per chip). The resulting Map gives O(1) lookup per chip inside the loop.

3. **One-directional sync (Evolution → DB):** The chip sync does not push DB proxy config back to Evolution. This is intentional — the sync reads what Evolution knows and updates our DB to match. The reverse direction (DB → Evolution) happens at instance creation time via `createInstance`.

4. **Pre-existing conversion-tracking.ts errors:** TypeScript errors in `src/lib/conversion-tracking.ts` (`sql` not imported) are from Plan 42-02's incomplete work. They are pre-existing, out of scope for this plan, and logged to deferred-items.

## Deviations from Plan

None — plan executed exactly as written. The TypeScript errors that appear in the overall `tsc --noEmit` run are pre-existing in `conversion-tracking.ts` and unrelated to this plan's modified files.

## Self-Check

- [x] `src/app/api/groups/route.ts` — modified, committed bffb51a
- [x] `src/components/group-card.tsx` — modified, committed 4188641
- [x] `src/lib/evolution.ts` — modified, committed eac9330
- [x] `src/app/api/chips/sync/route.ts` — modified, committed eac9330
- [x] All grep checks pass (invalidateGroupCache, flex-wrap/shrink-0, fetchInstances/evolutionInstanceMap)
- [x] TypeScript errors on plan's modified files: 0

## Self-Check: PASSED
