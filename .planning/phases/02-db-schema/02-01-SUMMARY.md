---
phase: 02-db-schema
plan: 01
subsystem: database
tags: [schema, drizzle, voters, campaigns, segments, crud]
completed: 2026-03-04

dependency-graph:
  requires: []
  provides: [voters-table, campaigns-table, segments-table, segment-voters-junction, voter-crud, campaign-crud, segment-crud]
  affects: [Phase 03 Import, Phase 04 Campaigns, Phase 05 Segmentation]

tech-stack:
  added: []
  patterns: [Drizzle ORM, PostgreSQL enums, junction tables, transactional operations, ilike search]

key-files:
  created:
    - src/lib/db-voters.ts
    - src/lib/db-campaigns.ts
    - src/lib/db-segments.ts
  modified:
    - src/db/schema.ts

decisions:
  - segments declared before campaigns in schema.ts to satisfy FK reference (Drizzle requires forward-referenceable order)
  - CampaignStatus = NonNullable<Campaign['status']> type alias needed for eq() comparison — nullable enum columns cause TS2769
  - setSegmentVoters uses db.transaction() for atomic replace (delete-then-insert)
  - bulkInsertVoters handles empty array gracefully (returns [] early)
  - searchVoters joins name + phone with OR ilike, limited to 50, sorted by engagement_score desc

metrics:
  duration: "20 minutes"
  tasks-completed: 2
  files-changed: 4
  files-created: 3
---

# Phase 02 Plan 01: Electoral Schema (Voters, Campaigns, Segments) Summary

**One-liner:** Drizzle schema extended with 4 electoral tables (voters, campaigns, segments, segmentVoters) plus 3 typed CRUD libraries.

## What Was Built

### Task 1 — Schema Tables (src/db/schema.ts)

| Table | Key Columns | Indexes |
|-------|-------------|---------|
| `voters` | cpf, phone, zone, section, tags[], engagement_score, opt_in_status | phone, zone, opt_in, engagement |
| `segments` | name, filters (JSON), audience_count | — |
| `campaigns` | template, variables[], status enum, segment_id FK, A/B fields, denorm stats | status, segment_id |
| `segment_voters` | (segment_id, voter_id) composite PK | cascade deletes |

Exported types: `Voter`, `NewVoter`, `Campaign`, `NewCampaign`, `Segment`, `NewSegment`

### Task 2 — CRUD Libraries

**db-voters.ts:** `loadVoters`, `getVoter`, `addVoter`, `updateVoter`, `deleteVoter`, `bulkInsertVoters`, `searchVoters` (ilike name+phone), `getVotersBySegment` (join via segmentVoters)

**db-campaigns.ts:** `loadCampaigns`, `getCampaign`, `addCampaign`, `updateCampaign`, `deleteCampaign`, `getCampaignsByStatus`

**db-segments.ts:** `loadSegments`, `getSegment`, `addSegment`, `updateSegment`, `deleteSegment`, `getSegmentVoterIds`, `setSegmentVoters` (transactional), `updateSegmentCount` (SQL count + update)

## Commits

| Hash | Message |
|------|---------|
| `4a3d91d` | feat(02-01): add electoral tables to Drizzle schema |
| `c5825db` | feat(02-01): create CRUD libraries for voters, campaigns, segments |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript error in getCampaignsByStatus**
- **Found during:** Task 2 TypeScript check
- **Issue:** `eq(campaigns.status, status as Campaign['status'])` fails — nullable enum column, `null` not assignable to overloads
- **Fix:** `type CampaignStatus = NonNullable<Campaign['status']>` — function accepts typed non-null enum, eq() resolves correctly
- **Files modified:** `src/lib/db-campaigns.ts`
- **Commit:** `c5825db` (included in Task 2 commit)

## Verification

- ✅ Schema grep checks for all 4 tables → PASS
- ✅ `tsc --noEmit` → No errors
- ✅ CRUD library grep checks → PASS

## Self-Check: PASSED

Files exist:
- ✅ `src/db/schema.ts` — contains voters, campaigns, segments, segmentVoters, Voter type
- ✅ `src/lib/db-voters.ts` — contains bulkInsertVoters
- ✅ `src/lib/db-campaigns.ts` — contains getCampaignsByStatus
- ✅ `src/lib/db-segments.ts` — contains setSegmentVoters

Commits exist:
- ✅ `4a3d91d` — feat(02-01): add electoral tables to Drizzle schema
- ✅ `c5825db` — feat(02-01): create CRUD libraries for voters, campaigns, segments
