---
phase: 16-group-management
plan: "01"
subsystem: groups-schema, groups-db, group-sync, webhook
tags: [whatsapp-groups, schema, db-helper, webhook-handler]
dependency_graph:
  requires: [14, 15]
  provides: [whatsapp-groups-table, db-groups, group-sync, group-webhook]
  affects: [src/db/schema.ts, src/lib/db-groups.ts, src/lib/group-sync.ts, src/app/api/webhook/route.ts]
tech_stack:
  added: []
  patterns: [group-lifecycle, overflow-detection, webhook-sync]
key_files:
  created:
    - src/lib/db-groups.ts
    - src/lib/group-sync.ts
    - drizzle/0007_whatsapp_groups.sql
  modified:
    - src/db/schema.ts
    - src/app/api/webhook/route.ts
decisions:
  - "Groups table stores groupJid, name, invite link, capacity, status"
  - "Overflow detected at 90% capacity, groups marked full at 100%"
  - "Webhook handler updates group size on join/leave events"
  - "Group sync utility fetches all groups from Evolution API"
  - "Status enum: active, full, archived"
metrics:
  duration: "15 min"
  completed: "2026-03-17"
  tasks_completed: 6
  files_changed: 5
---

# Phase 16 Plan 01: Groups DB Schema + Evolution API + Webhook Handler Summary

Built the backend foundation for WhatsApp group management with database schema, CRUD operations, Evolution API synchronization, and webhook handler.

## What Was Built

### Task 1: whatsapp_groups Table

**Schema fields:**
- `groupJid` — unique WhatsApp group identifier
- `name`, `description` — group metadata
- `inviteUrl`, `inviteCode` — invite link management
- `campaignId`, `chipId` — associations
- `currentSize`, `maxSize` — capacity tracking (default 1024)
- `status` — active | full | archived
- `admins` — admin phone numbers array

### Task 2: db-groups.ts Helper

**CRUD functions:**
- `createGroupRecord()`, `getGroupById()`, `getGroupByJid()`
- `getGroupsByCampaign()`, `getActiveGroupsForChip()`
- `updateGroupSize()`, `updateGroupInvite()`, `setGroupStatus()`
- `listGroups()` with filters

**Overflow detection:**
- `getGroupsNeedingOverflow()` — finds groups at 90%+ capacity
- `checkGroupOverflowStatus()` — returns capacity status
- `createOverflowGroup()` — creates new group via Evolution API

### Task 3: group-sync.ts Utility

- `syncGroupsFromEvolution(chipId)` — syncs all groups for a chip
- `syncAllGroups()` — syncs groups for all connected chips
- Updates participant counts and invite codes

### Task 4: Webhook Handler

**GROUP_PARTICIPANTS_UPDATE events:**
- Parses action (add/remove/promote/demote)
- Updates group size
- Marks status as 'full' when capacity reached
- Logs warnings at 90% capacity

### Task 5: Migration SQL

- `drizzle/0007_whatsapp_groups.sql`
- Idempotent with IF NOT EXISTS
- Indexes on campaign, chip, status, groupJid

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ `src/db/schema.ts` — whatsappGroups table added
- ✅ `src/lib/db-groups.ts` — all functions exported
- ✅ `src/lib/group-sync.ts` — sync utility created
- ✅ `src/app/api/webhook/route.ts` — handler updated
- ✅ `drizzle/0007_whatsapp_groups.sql` — migration created
- ✅ TypeScript compiles cleanly
- ✅ Commit: b7a5c04