---
phase: 14-chip-health-reliability
plan: "01"
subsystem: evolution-api-wrapper, chip-health-monitoring, webhook
tags: [evolution-api, chip-health, webhook, cron, schema]
dependency_graph:
  requires: []
  provides: [evolution-v2-wrapper, chip-health-schema, chip-health-cron, webhook-hardened]
  affects: [src/lib/evolution.ts, src/db/schema.ts, src/lib/db-chips.ts, src/app/api/cron/chip-health/route.ts, src/app/api/webhook/route.ts]
tech_stack:
  added: []
  patterns: [7-state-health-model, webhook-event-tracking, auto-restart-with-quarantine]
key_files:
  created:
    - src/app/api/cron/chip-health/route.ts
    - drizzle/0005_chip_health_fields.sql
  modified:
    - src/lib/evolution.ts
    - src/db/schema.ts
    - src/lib/db-chips.ts
    - src/app/api/webhook/route.ts
decisions:
  - "healthStatus added as separate text field (not enum) to avoid Postgres ALTER TYPE migration complexity"
  - "Webhook updates lastWebhookEvent on EVERY event for accurate staleness detection"
  - "Quarantine threshold set at 3 consecutive failed restarts"
  - "sendText now returns SendTextResponse with message key for Phase 17 delivery tracking"
metrics:
  duration: "18 min"
  completed: "2026-03-17"
  tasks_completed: 2
  files_changed: 6
---

# Phase 14 Plan 01: Chip Health Reliability Foundation Summary

Evolution API v2 full wrapper (13 exported functions) + 7-state chip health schema + auto-restart cron + hardened webhook with statusReason handling.

## What Was Built

### Task 1: Evolution API v2 Wrapper Rewrite
Complete rewrite of `src/lib/evolution.ts` from 4 functions to 13+ exports:

**Instance Management:**
- `fetchInstances` — lists all instances
- `getConnectionState` — returns ConnectionStatus
- `restartInstance` (NEW) — PUT restart
- `connectInstance` (NEW) — GET QR code for reconnect

**Messaging:**
- `sendText` — now returns `SendTextResponse` with message key for delivery tracking
- `sendMedia` (NEW) — image/video/audio/document support

**Group Management (all NEW):**
- `createGroup`, `getInviteCode`, `revokeInviteCode`
- `fetchGroupParticipants`, `updateParticipant`, `fetchAllGroups`

**Exported TypeScript interfaces:** `SendTextResponse`, `GroupInfo`, `InviteCodeResponse`, `ParticipantInfo`

### Task 2: Schema Extension, Health Cron, Webhook Hardening

**Schema (`src/db/schema.ts`):**
Added 11 new fields to `chips` table:
- `healthStatus` — 7-state: healthy/degraded/cooldown/quarantined/banned/warming_up/disconnected
- `messagesSentToday`, `messagesSentThisHour` — rate tracking
- `dailyLimit` (200), `hourlyLimit` (25) — configurable per chip
- `lastHealthCheck`, `lastWebhookEvent` — freshness timestamps
- `cooldownUntil`, `bannedAt` — state lifecycle
- `errorCount`, `blockRate`, `assignedSegments` — diagnostics

**DB Helpers (`src/lib/db-chips.ts`):**
- `updateChipHealth(id, fields)` — partial health update
- `getHealthyChips()` — returns healthy/degraded chips with capacity
- `incrementChipCounter(id, field)` — atomic SQL increment
- `resetDailyCounters()` — daily reset for all chips

**Health Cron (`/api/cron/chip-health`):**
- CRON_SECRET auth (same pattern as warming cron)
- Polls every enabled chip with instanceName
- Logic: connected+fresh=healthy, connected+stale=degraded, disconnecting=restart attempt, 3 failures=quarantined
- Returns JSON summary: `{ checked, healthy, degraded, disconnected, quarantined }`

**Webhook Hardening (`/api/webhook/route.ts`):**
- `lastWebhookEvent` updated on EVERY event type (not just connection.update)
- `CONNECTION_UPDATE` statusReason handling:
  - 401 → mark disconnected (logged out, user must rescan)
  - 408/515 → warn + let cron handle restart
  - open without reason → mark healthy + reset errorCount
- Placeholder handlers for `messages.update` (Phase 17) and `group_participants.update` (Phase 16)

**Migration:** `drizzle/0005_chip_health_fields.sql` — idempotent ADD COLUMN IF NOT EXISTS

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ `src/lib/evolution.ts` — 13+ functions exported
- ✅ `src/db/schema.ts` — healthStatus + 10 other health fields added
- ✅ `src/lib/db-chips.ts` — 4 new health helpers added
- ✅ `src/app/api/cron/chip-health/route.ts` — created (48+ lines)
- ✅ `src/app/api/webhook/route.ts` — hardened with statusReason + lastWebhookEvent
- ✅ `drizzle/0005_chip_health_fields.sql` — idempotent migration
- ✅ TypeScript compiles cleanly (tsc --noEmit passes)
- ✅ Commits: 971856a (evolution.ts), e67207d (schema + cron + webhook)
