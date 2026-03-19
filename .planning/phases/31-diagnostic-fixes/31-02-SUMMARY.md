---
phase: 31-diagnostic-fixes
plan: 02
subsystem: crm
tags: [crm, segments, bulk-query, voter-segments]
dependency-graph:
  requires: [31-01]
  provides: [voter-segments-in-crm, segments-api-enrichment, bulk-segment-query]
  affects: [crm-page, crm-detail-page, db-voters, voters-api]
tech-stack:
  added: []
  patterns: [bulk-join-query, map-enrichment, drizzle-inarray]
key-files:
  created: []
  modified:
    - src/lib/db-voters.ts
    - src/app/api/voters/route.ts
    - src/app/crm/page.tsx
    - src/app/crm/[id]/page.tsx
decisions:
  - "Single bulk JOIN query with Map<voterId, segments[]> avoids N+1 per voter"
  - "inArray() used to scope query to current page's voter IDs only"
  - "Segments shown as outline badges in CRM table and as links on detail page"
metrics:
  duration: "~20 min"
  completed: "2026-03-19"
  tasks-completed: 2
  files-modified: 4
---

# Phase 31 Plan 02: CRM Segment Visibility Summary

**One-liner:** Added segment associations to CRM list and voter detail — bulk JOIN query with Map enrichment avoids N+1, segments shown as badges with links.

## What Was Built

1. **`getSegmentsForVoterIds()` in db-voters.ts** — Bulk query joining `segmentVoters` → `segments`, returning `Map<voterId, {id, name}[]>`. Empty array input handled (returns empty Map). Uses `inArray()` from drizzle-orm.

2. **GET /api/voters enriched response** — After fetching paginated voters, calls `getSegmentsForVoterIds()` with current page's IDs and attaches `segments` array to each voter object. Single-voter `?id=` path also includes segments.

3. **"Segmentos" column in CRM table** (`src/app/crm/page.tsx`) — New column after "Tags" showing segment names as outline Badges. `whitespace-normal` class prevents clip. Empty state shows "—" dash.

4. **Segments card on voter detail page** (`src/app/crm/[id]/page.tsx`) — Lists segments voter belongs to with links to `/segmentacao`. Empty state "Este eleitor não pertence a nenhum segmento" with CTA.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- [x] `getSegmentsForVoterIds` exported from `src/lib/db-voters.ts` (line 171)
- [x] `/api/voters` GET returns `segments` array per voter
- [x] CRM table has Segmentos column
- [x] Voter detail page has Segments card
