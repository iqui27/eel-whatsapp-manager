---
phase: 21
plan: 01
subsystem: campaign-integration
tags: [schema, segments, mapping, groups, chips]
dependencies:
  requires: []
  provides: [segmentTag, segment-mapping]
  affects: [segments, chips, whatsapp_groups]
tech-stack:
  added:
    - src/lib/segment-mapping.ts
    - drizzle/0010_segment_tag.sql
  patterns:
    - Slug-based tag generation
    - Auto-assignment via segment tags
key-files:
  created:
    - drizzle/0010_segment_tag.sql
    - src/lib/segment-mapping.ts
  modified:
    - src/db/schema.ts
    - src/lib/db-segments.ts
    - src/app/api/segments/route.ts
    - src/app/segmentacao/page.tsx
    - src/app/chips/page.tsx
    - src/components/create-group-dialog.tsx
    - src/app/grupos/page.tsx
decisions:
  - segmentTag is unique, nullable for backwards compatibility
  - Tags auto-generated from segment names via slugify
  - Tag format: lowercase, alphanumeric + underscore, starts with letter
  - Chips can have multiple assignedSegments (array)
  - Groups linked to segments via segmentTag
  - Mapping function includes chip health and group capacity
metrics:
  duration: 15 min
  tasks: 8
  files: 8
---

# Phase 21 Plan 01: Schema Enhancement & Segment-Group Mapping Summary

## One-liner
Added `segmentTag` field to segments with full CRUD, API, and UI support, plus segment-to-chip-to-group mapping helpers for campaign hydration.

## Changes Made

### Task 1: Add segmentTag to segments table
- Added `segmentTag` field to `segments` table in schema.ts
- Field is unique, nullable for backwards compatibility
- Added index for efficient tag lookups
- Commit: `df1eb12`

### Task 2: Create database migration
- Created `drizzle/0010_segment_tag.sql`
- Adds `segment_tag` column with unique constraint
- Creates index for performance
- Commit: `cc7a3cd`

### Task 3: Update segment CRUD
- Added `validateSegmentTag()` for format validation (lowercase, alphanumeric + underscore)
- Added `generateTagFromName()` for auto-generating tags from segment names
- Added `getSegmentByTag()` to query segments by tag
- Added `getSegmentsWithTags()` for segments without tags
- Updated `addSegment()` and `updateSegment()` with tag validation
- Commit: `2b7b616`

### Task 4: Update segments API
- Added `GET /api/segments?tag=xxx` endpoint for tag queries
- Added tag validation and duplicate detection in POST
- Auto-generates unique tags from segment names
- Returns 400 error for duplicate tags
- Commit: `534cd26`

### Task 5: Update segment UI forms
- Added tag input field with validation feedback
- Auto-generates tag from segment name (slugify)
- Shows tag column in segments table
- Displays validation errors for invalid tags
- Commit: `b6b46a5`

### Task 6: Add segment selection to chip form
- Added `assignedSegments` array to Chip interface
- Added segment multi-select in chip creation form
- Displays assigned segments on chip cards
- Loads segments from API for selection
- Commit: `660b3c5`

### Task 7: Add segment selection to group form
- Added segment dropdown to CreateGroupDialog
- Auto-selects chip based on segment's assigned chip
- Passes segmentTag when creating groups
- Commit: `d10cc0a`

### Task 8: Create segment mapping helper
- Created `src/lib/segment-mapping.ts`
- `getSegmentGroupMapping(segmentTag)` - single segment lookup
- `getAllSegmentMappings()` - all segment mappings
- `getChipForSegment(segmentTag)` - find assigned chip with capacity
- `getGroupForSegmentTag(segmentTag)` - find available group with capacity
- Commit: `b02d671`

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compilation: PASSED
- All 8 tasks completed
- 8 commits created
- No runtime errors

## Key Types

```typescript
// src/lib/segment-mapping.ts
interface SegmentMapping {
  segmentId: string;
  segmentName: string;
  segmentTag: string | null;
  chip: {
    id: string;
    name: string;
    healthStatus: string;
    availableCapacity: { daily: number; hourly: number };
  } | null;
  group: {
    id: string;
    name: string;
    inviteUrl: string | null;
    capacity: { current: number; max: number; percent: number };
    status: string;
  } | null;
}
```

## Next Steps

1. Run migration on production database
2. Test segment creation with auto-generated tags
3. Verify segment-to-chip assignment works
4. Test group creation with segment selection
5. Verify mapping function returns correct data

## Self-Check: PASSED

- All created files exist
- All commits verified in git log
- TypeScript compiles without errors