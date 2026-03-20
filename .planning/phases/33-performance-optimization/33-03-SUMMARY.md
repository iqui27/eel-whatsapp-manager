---
phase: 33-performance-optimization
plan: 03
subsystem: polling-optimization
tags: [performance, polling, visibility, SSE, db-optimization]
dependency_graph:
  requires: []
  provides: [visibility-aware-polling, optimized-sse]
  affects: [operacoes-page, chips-page, logs-page, campanhas-monitor, topbar, message-feed, sse-stream]
tech_stack:
  added: []
  patterns: [visibilitychange-API, document.hidden, SSE-voter-cache, bounded-set]
key_files:
  created: []
  modified:
    - src/app/operacoes/page.tsx
    - src/components/message-feed.tsx
    - src/app/campanhas/[id]/monitor/page.tsx
    - src/app/chips/page.tsx
    - src/app/logs/page.tsx
    - src/components/topbar.tsx
    - src/app/api/conversations/stream/route.ts
decisions:
  - "Visibility guard pattern: startPolling/stopPolling + handleVisibilityChange event listener"
  - "On tab refocus: immediate fetch before restarting interval (no stale UX)"
  - "SSE interval increased 1.5s -> 5s — chat still responsive, DB load cut ~70%"
  - "Voter cache in SSE clears every 12 cycles (~60s) to avoid stale data accumulation"
  - "MAX_TRACKED_CONVERSATIONS=200 cap prevents memory leak on long-running SSE connections"
metrics:
  duration: "7 min"
  completed: "2026-03-20"
  tasks: 2
  files: 7
---

# Phase 33 Plan 03: Polling Visibility Guards + SSE Optimization Summary

**One-liner:** All 6 polling intervals pause on tab hide + SSE poll 1.5s→5s with voter cache — eliminates useless background API calls

## What Was Built

### Task 1: Visibility guards for 6 polling files

Pattern applied to all 6 files:
```ts
document.addEventListener('visibilitychange', handleVisibilityChange);
if (document.hidden) stopPolling(); else { fetchFn(); startPolling(); }
```

1. **operacoes/page.tsx** (10s, 5 endpoints) — highest-impact fix; all dashboard endpoints pause on tab hide
2. **message-feed.tsx** (configurable, default 10s) — `document.hidden` guard alongside existing `autoRefresh`/`isPaused` checks
3. **campanhas/[id]/monitor/page.tsx** (3s) — monitor pauses when user switches away while campaign sends
4. **chips/page.tsx** (15s) — chip health polling pauses in background
5. **logs/page.tsx** (10s) — visibility guard alongside existing user-toggle; still respects `autoRefresh` state
6. **topbar.tsx** (60s) — alert count polling pauses when tab hidden

### Task 2: SSE conversation stream optimizations

- **POLL_INTERVAL_MS**: 1500 → 5000 (DB queries ~40/min → ~12/min per connection)
- **voterCache**: Map<string, Voter> within `run()` function — `getCachedVoter()` helper eliminates N+1 voter lookups per cycle
- Cache cleared every 12 cycles (~60s) to avoid stale voter data
- **MAX_TRACKED_CONVERSATIONS = 200**: Cap on `trackedConversationIds` Set to prevent memory growth on long-running connections

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- All 6 polling files have `visibilitychange` listener ✓
- SSE `POLL_INTERVAL_MS = 5000` ✓
- SSE `voterCache` Map exists (4 occurrences) ✓
- SSE `MAX_TRACKED_CONVERSATIONS = 200` ✓
- Build passes ✓
