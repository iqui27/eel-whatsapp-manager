---
phase: 33-performance-optimization
plan: 04
subsystem: db-pagination
tags: [performance, database, drizzle, indexes, pagination]
dependency_graph:
  requires: [33-03]
  provides: [db-indexes, sql-pagination]
  affects: [schema.ts, db-voters.ts, api-voters-route]
tech_stack:
  added: []
  patterns: [SQL-LIMIT-OFFSET, count-query, drizzle-index]
key_files:
  created: [drizzle/0003_high_pretty_boy.sql]
  modified: [src/db/schema.ts, src/lib/db-voters.ts, src/app/api/voters/route.ts]
decisions:
  - "Keep filterVoters() unchanged for callers needing all results (compliance, export)"
  - "filterVotersPaginated() is a new additive export — no breaking changes"
  - "Scope filter applied after SQL pagination (on small page set) — acceptable for single-user MVP"
  - "drizzle-kit push requires DATABASE_URL — migration applied in production via npm run db:migrate"
metrics:
  duration: "5 min"
  completed: "2026-03-20"
  tasks: 2
  files: 6
---

# Phase 33 Plan 04: DB Indexes + SQL Pagination Summary

**One-liner:** 3 missing DB indexes added (voters.createdAt, conversations.updatedAt, composite) + voter API converted from JS-slice to SQL LIMIT/OFFSET pagination

## What Was Built

### Task 1: Missing database indexes

Added to `src/db/schema.ts`:
1. `idx_voters_created_at` on `voters.createdAt` — eliminates full table scan for `ORDER BY desc(voters.createdAt)` in all voter queries
2. `idx_conversations_updated_at` on `conversations.updatedAt` — eliminates full table scan for SSE delta queries (`getConversationDeltas` filters by `since` timestamp)
3. `idx_conversations_status_updated` composite on `conversations(status, updatedAt)` — covers common SSE filter pattern combining status + timestamp

Migration generated: `drizzle/0003_high_pretty_boy.sql` — includes the 3 new indexes plus prior schema drift (system_logs table, config fields, user invite fields, voter address fields) accumulated since last migration.

**Note:** `drizzle-kit push` requires `DATABASE_URL` env var — migration will be applied in production via `npm run db:migrate`. Adding indexes is non-destructive and safe for production.

### Task 2: SQL-level voter pagination

**src/lib/db-voters.ts:**
- Added `PaginatedResult<T>` interface
- Added `filterVotersPaginated(filters, { limit, offset })` — runs COUNT(*) + SELECT with SQL LIMIT/OFFSET, returns `{ data, total }`
- Updated `loadVoters(limit?)` to accept optional limit parameter
- Existing `filterVoters()` preserved unchanged for compliance/export callers

**src/app/api/voters/route.ts:**
- Replaced `await filterVoters(...)` + JS `.slice(offset, offset + limit)` with `await filterVotersPaginated(..., { limit, offset })`
- Scope filter now applies to the small paginated set (not full table)
- Response shape unchanged — still `{ data, total, page, limit }`

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- `idx_voters_created_at` in schema.ts ✓
- `idx_conversations_updated_at` in schema.ts ✓
- `idx_conversations_status_updated` in schema.ts ✓
- Migration file `drizzle/0003_high_pretty_boy.sql` generated ✓
- `filterVotersPaginated` exported from db-voters.ts ✓
- `api/voters/route.ts` uses `filterVotersPaginated` ✓
- `loadVoters()` accepts optional limit ✓
- Build passes ✓
