---
phase: 35
plan: 6
subsystem: campaign-detail
tags: [anti-ban, chip-warmup, circuit-breaker, dashboard]
dependency_graph:
  requires: [35-02, 35-04, 35-05]
  provides: [anti-ban-dashboard]
  affects: [campaigns/route.ts, campanhas/[id]/page.tsx]
tech_stack:
  added: []
  patterns: [server-component-data-enrichment, sql-aggregate-groupby]
key_files:
  created: []
  modified:
    - src/app/api/campaigns/route.ts
    - src/app/campanhas/[id]/page.tsx
decisions:
  - "Warm-up stages derived from chip.createdAt: 0-3d (20/day), 4-7d (50/day), 8-30d (200/day), 31-90d (350/day), 90+d (500/day)"
  - "Circuit breaker status inferred from campaign.status === 'paused' + circuitBreakerThreshold presence (no new DB field)"
  - "buildChipStats uses raw SQL with GROUP BY for efficiency — avoids N+1 per chip"
  - "AntiBanPanel is a server component — zero client JS overhead for the dashboard"
metrics:
  duration: 15 min
  completed: 2026-03-20
  tasks: 2/2
  files: 2
---

# Phase 35 Plan 06: Anti-Ban Dashboard Summary

**One-liner:** Per-chip warm-up stages + error rates + circuit breaker status on campaign detail page, backed by SQL aggregate enrichment in GET /api/campaigns?id=

## What Was Built

### Task 1 — API enrichment (`src/app/api/campaigns/route.ts`)

Added `getWarmupStage(createdAt)` — 5-phase warm-up model:
- Phase 1 (0-3 days): 20 msgs/day max
- Phase 2 (4-7 days): 50 msgs/day max
- Phase 3 (8-30 days): 200 msgs/day max
- Phase 4 (31-90 days): 350 msgs/day max
- Phase 5 (90+ days): 500 msgs/day max

Added `buildChipStats(campaign)` — async function that:
1. Resolves chip list from `campaign.selectedChipIds` (or all enabled chips as fallback)
2. Runs a single SQL aggregate query on `message_queue` grouped by `chip_id` to get total/failed/sent counts per chip
3. Computes `errorRate = failed/total * 100` per chip
4. Determines `circuitBreakerStatus` from campaign status + threshold presence

`GET /api/campaigns?id=` now returns `[{ ...campaign, chipStats: ChipStat[], circuitBreakerStatus }]`

### Task 2 — Campaign detail page (`src/app/campanhas/[id]/page.tsx`)

Added `getAntiBanStats(id)` — server-side fetcher calling `GET /api/campaigns?id=`.

Added `AntiBanPanel` server component rendering:
- **Circuit breaker status bar** — green/red dot + "Disparado — Envio Pausado" badge when tripped
- **Per-chip table** — chip name, health dot, warm-up stage, daily usage progress bar (color-coded at 70%/90%), error rate (red >3%, yellow >1%), proxy indicator
- **Smart recommendations** — auto-generated from chipStats: high-error chips, near-limit chips, proxy suggestion, all-healthy confirmation
- **Send config summary** — speed preset, delay range, time window, rest pause interval, batch size

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Duplicate function declarations in page.tsx**
- **Found during:** Task 2
- **Issue:** Previous edit tool invocation appended new content without removing the original — resulting in a 611-line file with two `interface CampaignDetailPageProps`, two `getStatusBadge`, two `formatDate`, two `getCampaignAnalytics`, and two `export default` declarations
- **Fix:** Removed lines 444-611 (the old duplicate block), keeping only lines 1-443 (the correct new content)
- **Files modified:** `src/app/campanhas/[id]/page.tsx`
- **Commit:** b2ac491

## Self-Check: PASSED

- [x] `src/app/api/campaigns/route.ts` — modified, contains `errorRate`, `buildChipStats`, `getWarmupStage` ✅
- [x] `src/app/campanhas/[id]/page.tsx` — modified, contains `"warm-up"`, `AntiBanPanel`, `circuitBreakerStatus` ✅
- [x] TypeScript: `npx tsc --noEmit` — 0 errors ✅
- [x] Commit b2ac491 exists ✅
- [x] File is 442 lines (no duplicates) ✅
