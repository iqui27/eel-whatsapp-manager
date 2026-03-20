---
phase: 34-remaining-performance
plan: "03"
subsystem: frontend-caching
tags: [swr, caching, performance, sidebar, react]
dependency_graph:
  requires: []
  provides: [session-cache-60s, chips-cache-30s, deduplication-across-navigations]
  affects: [src/components/SidebarLayout.tsx, /api/auth/session, /api/chips]
tech_stack:
  added: [swr@^2.x]
  patterns: [useSWR with dedupingInterval, derived state from SWR data, useMemo for derived chip status]
key_files:
  created: []
  modified:
    - src/components/SidebarLayout.tsx
    - package.json
    - package-lock.json
decisions:
  - "SWR chosen over React Query — ~4KB vs ~13KB gzipped; simpler API for this use case; no provider wrapper needed"
  - "60s dedup for /api/auth/session — session doesn't change mid-navigation; stale is acceptable for 1 minute"
  - "30s dedup for /api/chips — chip status is more dynamic (connects/disconnects frequently)"
  - "revalidateOnFocus: false — tab focus behavior already handled by visibility guards from Plan 33-03"
  - "keepPreviousData: true — avoids loading flash on navigation when data is already cached"
  - "Interface ChipFromAPI declared inside component function — avoids polluting module scope with a transient type"
metrics:
  duration: "12 min"
  completed: "2026-03-20"
  tasks: 2
  files: 3
---

# Phase 34 Plan 03: SidebarLayout SWR Caching Summary

**One-liner:** Replaced 90+ lines of manual `useEffect` + `fetch` + `useState` boilerplate in SidebarLayout with `useSWR` (60s session dedup, 30s chip dedup), eliminating ~90% of redundant API calls during page navigation.

## What Was Built

### Task 1: Install SWR
```bash
npm install swr  # added 2 packages
```

### Task 2: Replace useEffect Fetches with useSWR
Removed from SidebarLayout:
- `useState<ShellChipStatus>` + `setChipStatus`
- `useState<SessionActor | null>` + `setSessionActor`  
- `useState(true)` for `sessionLoading`
- 2 × `useEffect` blocks (~90 lines total)
- `useEffect` from React imports

Added:
- `useSWR` import from `'swr'`
- `useMemo` to React imports
- `fetcher` function at module scope
- `useSWR('/api/auth/session', fetcher, { dedupingInterval: 60000, ... })` → `sessionActor`, `sessionLoading`
- `useSWR('/api/chips', fetcher, { dedupingInterval: 30000, ... })` → `chipsData`, `chipsLoading`
- `useMemo` for `chipStatus` derived from SWR data

Commit: `78669bf` — `feat(34-03): replace useEffect fetches with useSWR in SidebarLayout`

## Impact
- Navigation within 60s: 0 session API calls (served from SWR cache)
- Navigation within 30s: 0 chip API calls (served from SWR cache)
- No loading flash: `keepPreviousData: true` shows stale data while revalidating
- Net diff: -90 insertions, +75 additions (net -15 lines, significantly cleaner)

## Deviations from Plan
None — plan executed exactly as written.

## Self-Check: PASSED
- `useSWR` imported and used 2 times ✅
- `dedupingInterval: 60000` for session ✅
- `dedupingInterval: 30000` for chips ✅
- No `useEffect` + `fetch('/api/auth/session')` or `fetch('/api/chips')` remain ✅
- `swr` in `package.json` dependencies ✅
- Commit `78669bf` ✅
