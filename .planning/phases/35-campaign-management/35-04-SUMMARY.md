---
phase: 35-campaign-management
plan: "04"
subsystem: send-queue
tags: [cron, send-queue, chip-router, circuit-breaker, anti-ban]
dependency_graph:
  requires: [35-02, 35-03]
  provides: [per-campaign-send-config, circuit-breaker, rest-pauses, chip-strategy]
  affects: [send-queue-cron, chip-router]
tech_stack:
  added: []
  patterns: [per-campaign-config, circuit-breaker, round-robin-distribution, least-loaded-selection]
key_files:
  created: []
  modified:
    - src/app/api/cron/send-queue/route.ts
    - src/lib/chip-router.ts
decisions:
  - "send-queue groups messages by campaignId and processes each campaign with its own config — enables per-campaign batch size, delays, time windows in a single cron run"
  - "Circuit breaker trips at configurable error rate threshold (default 5%) after minimum 5 attempts — pauses campaign immediately to prevent mass failures"
  - "Rest pauses are intra-batch counters (per-run): for typical batchSize=10 with restPauseEvery=20, pauses never trigger in a single run — inter-run gap acts as natural rest"
  - "Chip round-robin index is module-level (reset per cron run via resetRoundRobinIndex) — distributes load across available chips within a single run"
  - "selectBestChip now accepts optional CampaignChipConstraints — backward compatible (no constraints = existing affinity scoring behavior)"
  - "Typing delay sleep is BEFORE chip selection to simulate human pre-compose behavior; Evolution API delay option also passed for recipient-visible typing indicator"
metrics:
  duration: "~20 min"
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 2
---

# Phase 35 Plan 04: Send Queue Intelligence Summary

**One-liner:** Queue processor now reads per-campaign config for batch size, delays, time windows, chip selection strategy, rest pauses, and circuit breaker instead of hardcoded constants.

## What Was Built

### `send-queue/route.ts` — Full Refactor

**Removed:** 7 hardcoded constants (`BATCH_SIZE`, `MIN_DELAY_MS`, `MAX_DELAY_MS`, `TIME_WINDOW_START`, `TIME_WINDOW_END`, `TYPING_DELAY_MIN`, `TYPING_DELAY_MAX`)

**Added:**
- `isInCampaignTimeWindow(windowStart, windowEnd)` — parses "HH:MM" or "HH:MM:SS" strings (Postgres time type), defaults to 08:00–20:00
- `buildChipConstraints(campaign)` — converts campaign record into `CampaignChipConstraints` for chip router
- **Message grouping by `campaignId`** — processes up to 100 messages total, grouped per campaign
- **Per-campaign config loading** — `getCampaign(campaignId)` for each campaign group, safe defaults that match previous hardcoded values
- **Time window enforcement** — campaigns outside their configured window are skipped (not globally gated as before)
- **Campaign batch size** — each campaign processes up to `campaign.batchSize` messages (default 10)
- **Typing presence simulation** — `sleep(typingDelayMin–typingDelayMax)` before chip selection + Evolution API `{ delay }` option for WhatsApp "typing..." indicator
- **Rest pauses** — every `restPauseEvery` messages → sleep `restPauseDurationMs`; every `longBreakEvery` → sleep `longBreakDurationMs` (intra-batch counters)
- **Circuit breaker** — tracks `campaignFailed / campaignAttempted`; if ≥ `circuitBreakerThreshold`% after ≥5 attempts → `updateCampaign(id, { status: 'paused' })` + syslog warn
- **Per-campaign summary** in response JSON with `skipped` field when circuit-broken

### `chip-router.ts` — `CampaignChipConstraints` + Strategy Selection

**Added:**
- `CampaignChipConstraints` interface (`selectedChipIds`, `chipStrategy`, `maxDailyPerChip`, `maxHourlyPerChip`, `pauseOnChipDegraded`)
- `roundRobinIndex` module-level variable + `resetRoundRobinIndex()` export
- Updated `selectBestChip(segmentId?, constraints?)` — backward compatible optional second param

**Filtering pipeline** (before strategy):
1. Filter to `selectedChipIds` if provided and non-empty
2. Exclude degraded chips if `pauseOnChipDegraded` is true
3. Apply campaign-level `maxDailyPerChip` / `maxHourlyPerChip` limits

**Strategy selection:**
- `round_robin` → `chips[roundRobinIndex++ % chips.length]` (distributes evenly within run)
- `least_loaded` → sort by daily remaining capacity descending, pick top
- `affinity` → existing scoring algorithm (unchanged default)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor send-queue to read per-campaign config | 3d68872 | 1 file |
| 2 | Update chip router for campaign chip selection | 3d68872 | 1 file |

## Verification

- ✅ `npx tsc --noEmit` — no errors
- ✅ `npx next build` — all routes compile

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- `src/app/api/cron/send-queue/route.ts` — MODIFIED ✅ (grep: `campaign.batchSize`, `circuitBreakerThreshold`, `restPauseEvery`, `selectedChipIds`)
- `src/lib/chip-router.ts` — MODIFIED ✅ (grep: `CampaignChipConstraints`, `round_robin`, `least_loaded`)
- Commit 3d68872 — FOUND ✅
