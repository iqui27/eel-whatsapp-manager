---
phase: 34-remaining-performance
plan: "02"
subsystem: sse-infrastructure
tags: [sse, connection-limits, rate-limiting, performance]
dependency_graph:
  requires: [src/lib/api-auth.ts, src/lib/conversation-stream.ts]
  provides: [sse-connection-limits, per-user-cap, global-cap, max-lifetime]
  affects: [src/app/api/conversations/stream/route.ts, DB connection pool]
tech_stack:
  added: []
  patterns: [in-memory connection tracking, module-scoped Map, 429 rate limiting]
key_files:
  created: []
  modified:
    - src/app/api/conversations/stream/route.ts
decisions:
  - "In-memory Map chosen over Redis/DB — module-scoped state is sufficient for single-process Next.js; horizontal scaling not needed for this deployment"
  - "3 connections per user — balances multi-tab usage (conversas + operacoes dashboard) with DB pool safety"
  - "50 global — at 12 DB queries/min per connection (5s poll), 50 connections = 600 queries/min which is safe for Supabase pooler"
  - "5-minute max lifetime forces client reconnect — client hook already has reconnect logic so this is seamless"
  - "Stale cleanup every 60 cycles (5 min) as safety valve for connections that didn't clean up properly"
metrics:
  duration: "10 min"
  completed: "2026-03-20"
  tasks: 1
  files: 1
---

# Phase 34 Plan 02: SSE Connection Limits Summary

**One-liner:** In-memory `activeConnections` Map in the SSE route enforces 3 connections per user and 50 globally with 429 responses, plus 5-minute server-side max lifetime.

## What Was Built

### Task 1: Add Connection Tracker + Limits
Added module-scoped tracking constants and Map to `src/app/api/conversations/stream/route.ts`:

```
MAX_CONNECTIONS_GLOBAL = 50
MAX_CONNECTIONS_PER_USER = 3
MAX_CONNECTION_LIFETIME_MS = 5 * 60 * 1000  // 5 minutes
activeConnections = new Map<string, ActiveConnection>()
connectionCounter = 0
```

**GET handler changes:**
1. Extract `userId` from `auth.actor.userId`
2. Check global limit → 429 if `activeConnections.size >= 50`
3. Check per-user limit → 429 if user has >= 3 connections
4. Register connection on entry, delete on close (in `close()` function)
5. Max lifetime check after each poll cycle — closes stream after 5 minutes
6. Stale cleanup safety valve every 60 cycles

Commit: `f2dea8c` — `feat(34-02): add SSE connection limits (3/user, 50 global, 5min lifetime)`

## Verification
- `npx tsc --noEmit` passes
- `grep -c "MAX_CONNECTIONS"` returns 6 (3 declarations + 3 usages)
- 2 × 429 status responses present

## Deviations from Plan
None — plan executed exactly as written.

## Self-Check: PASSED
- `activeConnections` Map in `src/app/api/conversations/stream/route.ts` ✅
- Per-user (3) and global (50) caps with 429 responses ✅
- 5-minute max lifetime with close() + break ✅
- Stale cleanup safety valve ✅
- Commit `f2dea8c` ✅
