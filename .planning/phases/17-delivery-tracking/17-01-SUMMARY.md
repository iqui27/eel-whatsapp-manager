---
phase: 17-delivery-tracking
plan: "01"
subsystem: conversion-tracking, webhook-handlers
tags: [delivery-tracking, conversion-events, webhook, reply-correlation]
dependency_graph:
  requires: [15, 16]
  provides: [conversion-events, delivery-status-updates, reply-tracking, group-join-conversion]
  affects: [src/db/schema.ts, src/lib/conversion-tracking.ts, src/app/api/webhook/route.ts]
tech_stack:
  added: []
  patterns: [conversion-funnel, event-tracking, webhook-processing]
key_files:
  created:
    - src/lib/conversion-tracking.ts
    - drizzle/0008_conversion_events.sql
  modified:
    - src/db/schema.ts
    - src/app/api/webhook/route.ts
decisions:
  - "Conversion events stored separately for flexible querying"
  - "MESSAGES_UPDATE status codes: 0=error, 1=pending, 2=sent, 3=delivered, 4=read, 5=played"
  - "Reply correlation looks back 7 days for campaign messages"
  - "Group join tracked via GROUP_PARTICIPANTS_UPDATE action=add"
  - "Campaign counters incremented on delivery status changes"
metrics:
  duration: "18 min"
  completed: "2026-03-17"
  tasks_completed: 6
  files_changed: 5
---

# Phase 17 Plan 01: Webhook Handlers for Delivery Tracking Summary

Implemented complete delivery lifecycle tracking via webhook handlers and conversion tracking infrastructure.

## What Was Built

### Task 1: Conversion Tracking Schema

**Added to campaigns table:**
- `totalClicked` — link click counter
- `totalJoinedGroup` — group join counter

**New conversion_events table:**
- `campaignId`, `voterId`, `voterPhone` — associations
- `eventType` — reply | click | group_join | conversion
- `groupJid` — for group join events
- `metadata` — flexible JSON for additional data

### Task 2: MESSAGES_UPDATE Webhook Handler

**Status code processing:**
- 0 → failed (with error message)
- 3 → delivered
- 4, 5 → read (also implies delivered)

**Updates:**
- Message queue status and timestamps
- Campaign delivery counters

### Task 3: Reply Correlation

**In messages.upsert handler:**
- When inbound message received, check for recent campaign sends
- If found within 7 days, record as reply
- Increment campaign.totalReplied
- Create conversion_event

### Task 4: Group Join Conversion Tracking

**In group_participants.update handler:**
- When action='add', extract participant phones
- Look up group's campaignId
- Record group join conversion
- Increment campaign.totalJoinedGroup

### Task 5: conversion-tracking.ts Helper

**Functions:**
- `recordConversion()` — generic event creation
- `recordReply()` — reply-specific with dedup
- `recordGroupJoin()` — join-specific with dedup
- `recordClick()` — click tracking (placeholder)
- `getConversionStats()` — aggregate metrics
- `updateMessageDeliveryStatus()` — queue status updates
- `findRecentMessageToPhone()` — reply correlation lookup

### Task 6: Migration SQL

- `drizzle/0008_conversion_events.sql`
- Adds columns to campaigns
- Creates conversion_events table with indexes

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ `src/db/schema.ts` — conversion events table added
- ✅ `src/lib/conversion-tracking.ts` — all functions exported
- ✅ `src/app/api/webhook/route.ts` — handlers updated
- ✅ `drizzle/0008_conversion_events.sql` — migration created
- ✅ TypeScript compiles cleanly
- ✅ Commit: 018a645