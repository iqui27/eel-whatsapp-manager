---
phase: 38-chip-profile-management
plan: "01"
subsystem: chips
tags: [evolution-api, profile-management, chip-health, database, cron]
dependency_graph:
  requires: []
  provides: [chip-profile-backend, evolution-profile-api, profile-sync-cron]
  affects: [phase-39-whatsapp-preview, phase-40-campaign-editor]
tech_stack:
  added: []
  patterns: [evolution-api-v2-chat-endpoints, drizzle-nullable-columns, cron-profile-sync]
key_files:
  created:
    - drizzle/0015_chip_profile_fields.sql
  modified:
    - src/lib/evolution.ts
    - src/db/schema.ts
    - src/lib/db-chips.ts
    - src/app/api/chips/route.ts
    - src/app/api/cron/chip-health/route.ts
key_decisions:
  - "Evolution API profile endpoints use /chat/ namespace: fetchProfilePictureUrl (POST), updateProfileName (POST), updateProfilePicture (POST), fetchProfile (GET)"
  - "getProfilePicture and getProfileStatus return null on any error (non-throwing) — callers treat null as 'not available'"
  - "Profile sync in health cron is rate-limited via chip.updatedAt — skips chips updated within last hour to avoid excessive Evolution API calls"
  - "updateProfile action added to existing PUT /api/chips handler (not a new endpoint) — consistent with restart action pattern from Phase 14"
  - "updateChipProfile() helper added to db-chips.ts alongside updateChipHealth() — separates concerns cleanly"
metrics:
  duration: "~3 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_modified: 5
  files_created: 1
---

# Phase 38 Plan 01: Chip Profile Management Backend Summary

**One-liner:** Evolution API v2 profile wrappers (getProfilePicture, setProfileName, setProfilePicture, getProfileStatus), three nullable DB columns on chips, migration 0015, and automatic profile sync in the chip-health cron.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Evolution API profile functions, DB columns, migration | fc9831a | evolution.ts, schema.ts, db-chips.ts, 0015_chip_profile_fields.sql |
| 2 | Chip profile update API action and health cron sync | 9a02177 | chips/route.ts, chip-health/route.ts |

## What Was Built

### Evolution API Profile Functions (`src/lib/evolution.ts`)
Four new exported functions in the Profile Management section:
- `getProfilePicture(apiUrl, apiKey, instanceName)` — POST /chat/fetchProfilePictureUrl, returns URL or null
- `setProfileName(apiUrl, apiKey, instanceName, name)` — POST /chat/updateProfileName
- `setProfilePicture(apiUrl, apiKey, instanceName, pictureUrl)` — POST /chat/updateProfilePicture, accepts URL or base64
- `getProfileStatus(apiUrl, apiKey, instanceName)` — GET /chat/fetchProfile, returns status text or null

### DB Schema (`src/db/schema.ts`)
Three nullable text columns added to the `chips` table:
- `profileName` / `profile_name` — WhatsApp display name
- `profilePictureUrl` / `profile_picture_url` — URL to profile picture
- `profileStatus` / `profile_status` — WhatsApp status/about text

### Migration (`drizzle/0015_chip_profile_fields.sql`)
Three ALTER TABLE statements adding the new nullable columns with no defaults.

### db-chips.ts
Added `ChipProfileFields` type and `updateChipProfile()` function — mirrors the `updateChipHealth()` pattern for clean separation of concerns.

### PUT /api/chips — `action='updateProfile'` (`src/app/api/chips/route.ts`)
Accepts `{ id, action: 'updateProfile', profileName?, profilePictureUrl? }`:
1. Validates chip exists and has instanceName
2. Calls `setProfileName` / `setProfilePicture` via Evolution API (conditionally)
3. Persists to DB via `updateChipProfile`
4. Logs success via `syslog`
5. Returns updated chip record

### Chip-Health Cron — Profile Sync (`src/app/api/cron/chip-health/route.ts`)
After determining health status for connected chips (healthy + degraded):
- Calls `syncChipProfilePicture()` helper
- Rate-limited: skips if chip.updatedAt within last hour
- Compares fetched URL to stored URL — only writes on change
- All errors caught with `console.warn` — never crashes the cron

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Created
- [x] `drizzle/0015_chip_profile_fields.sql` exists

### Functions Exported
- [x] `evolution.ts` exports `getProfilePicture`, `setProfileName`, `setProfilePicture`, `getProfileStatus`
- [x] `schema.ts` chips table has `profileName`, `profilePictureUrl`, `profileStatus`
- [x] `db-chips.ts` exports `updateChipProfile`

### Commits
- [x] fc9831a — Task 1 commit
- [x] 9a02177 — Task 2 commit

### Build
- [x] `npx next build` succeeded after both tasks
