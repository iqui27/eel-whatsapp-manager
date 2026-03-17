---
phase: 16-group-management
plan: "02"
subsystem: groups-api, groups-ui, campaign-integration
tags: [groups-api, groups-page, campaign-groups, invite-links]
dependency_graph:
  requires: [16-01]
  provides: [groups-api-routes, grupos-page, campaign-groups-integration]
  affects: [src/app/api/groups, src/app/grupos, src/components, src/lib/campaign-groups.ts, src/lib/campaign-variables.ts]
tech_stack:
  added: []
  patterns: [group-crud-api, capacity-visualization, variable-resolution]
key_files:
  created:
    - src/app/api/groups/route.ts
    - src/app/api/groups/[id]/route.ts
    - src/app/api/groups/[id]/invite/route.ts
    - src/app/api/groups/[id]/sync/route.ts
    - src/app/grupos/page.tsx
    - src/components/group-card.tsx
    - src/components/create-group-dialog.tsx
    - src/lib/campaign-groups.ts
  modified:
    - src/lib/campaign-variables.ts
    - src/lib/db-campaigns.ts
decisions:
  - "Groups listed with status filter (active/full/archived)"
  - "Invite links copied with one click"
  - "Groups visualized with capacity progress bars"
  - "{link_grupo} variable resolves to active group invite link"
  - "Campaign hydration fetches group invite link if template contains variable"
  - "Overflow group auto-created when all existing groups are full"
metrics:
  duration: "20 min"
  completed: "2026-03-17"
  tasks_completed: 8
  files_changed: 10
---

# Phase 16 Plan 02: Groups Management Page + Campaign Integration Summary

Built the groups management UI and campaign integration for automatic invite link inclusion in messages.

## What Was Built

### Tasks 1-2: Groups API Routes

**`/api/groups`:**
- `GET` — List groups with optional status/campaign/chip filters
- `POST` — Create group via Evolution API and store in DB

**`/api/groups/[id]`:**
- `GET` — Get group by ID
- `PUT` — Update metadata, status, size, or invite
- `DELETE` — Archive (soft) or permanently delete

### Task 3: Invite Management

**`/api/groups/[id]/invite`:**
- `GET` — Get current invite link (fetches from Evolution if needed)
- `POST` — Revoke and regenerate invite link

**`/api/groups/[id]/sync`:**
- `POST` — Sync group from Evolution API

### Tasks 4-5: Groups Page UI

**`/grupos` page:**
- Header with "Novo Grupo" button
- Status filter tabs (Todos/Ativos/Cheios/Arquivados)
- Groups grid with cards

**GroupCard component:**
- Status badge (🟢 active, 🔴 full, 📁 archived)
- Capacity progress bar with color coding
- Invite link with copy button
- Sync and Archive actions

**CreateGroupDialog:**
- Group name (required)
- Description (optional)
- Chip/Instance selector (connected chips only)
- Initial participants (optional, comma-separated numbers)

### Tasks 6-7: Campaign Integration

**`src/lib/campaign-groups.ts`:**
- `getActiveInviteLink(campaignId)` — returns best available group invite
- `getCampaignGroupsWithCapacity()` — all groups with capacity info
- `assignGroupToCampaign()` — link group to campaign
- `findOrCreateGroupForCampaign()` — auto-creates overflow when needed
- `resolveGroupInviteVariable()` — for template resolution

**Variable resolution:**
- Added `{link_grupo}` to campaign variables
- Updated `buildCampaignRuntimeContext()` to accept `groupInviteLink`
- Updated `hydrateCampaignToQueue()` to resolve group invite if template contains variable

### Task 8: Overflow Detection in Send Queue

- Soft estimate of group size after sending invites
- Overflow warning logged when near capacity
- Full status update when capacity reached

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ All API routes created and functional
- ✅ `/grupos` page renders
- ✅ GroupCard displays correctly
- ✅ CreateGroupDialog works
- ✅ `{link_grupo}` variable defined
- ✅ Campaign hydration resolves group invite
- ✅ TypeScript compiles cleanly
- ✅ Commit: 940a079