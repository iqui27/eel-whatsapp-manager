---
phase: 15-mass-messaging-engine
plan: "01"
subsystem: message-queue, chip-router, send-queue-cron
tags: [mass-messaging, queue, rate-limiting, anti-ban]
dependency_graph:
  requires: [14]
  provides: [message-queue-table, chip-router, send-queue-cron]
  affects: [src/db/schema.ts, src/lib/db-message-queue.ts, src/lib/chip-router.ts, src/app/api/cron/send-queue/route.ts]
tech_stack:
  added: []
  patterns: [message-queue, chip-selection-scoring, anti-ban-delays, time-windows]
key_files:
  created:
    - src/lib/db-message-queue.ts
    - src/lib/chip-router.ts
    - src/app/api/cron/send-queue/route.ts
    - drizzle/0006_message_queue.sql
  modified:
    - src/db/schema.ts
decisions:
  - "Message queue uses 8-state lifecycle: queued→assigned→sending→sent→delivered→read→failed→retry"
  - "Chip scoring: health(100/50) + capacity(50) + affinity(50) - errors + freshness"
  - "Time window defaults to 8:00-20:00, configurable per deployment"
  - "Random delay 15-60s between messages for anti-ban protection"
metrics:
  duration: "20 min"
  completed: "2026-03-17"
  tasks_completed: 3
  files_changed: 5
---

# Phase 15 Plan 01: Message Queue Foundation Summary

Built the foundation for mass messaging: a message queue table with full lifecycle tracking, an intelligent chip router, and a queue processor cron with anti-ban protections.

## What Was Built

### Task 1: Message Queue Table + DB Helper

**Schema (src/db/schema.ts):**
- `messageQueue` table with 8-state lifecycle
- Tracking: campaignId, chipId, voterId, voterPhone, message, resolvedMessage
- Status timestamps: assignedAt, sentAt, deliveredAt, readAt, failedAt
- Retry support: retryCount, failReason
- Priority and segment affinity for chip selection

**DB Helper (src/lib/db-message-queue.ts):**
- `enqueueMessages()` — batch insert
- `getNextQueuedMessages()` — priority-ordered fetch
- Status transitions: assignMessageToChip, markMessageSending/Sent/Delivered/Read/Failed
- `resetFailedMessagesForRetry()` — with max retry limit
- `reassignMessagesFromChip()` — for failover
- `getQueueStats()`, `deleteCampaignMessages()`

### Task 2: Chip Router

**src/lib/chip-router.ts:**
- `selectBestChip(segmentId?)` — returns best chip with reason
- `canChipSend()` — validates health, capacity, config
- `getAvailableChips()` — all chips that can send now
- `getTotalAvailableCapacity()` — sum across all chips

**Scoring Algorithm:**
| Factor | Points |
|--------|--------|
| Health: healthy | +100 |
| Health: degraded | +50 |
| Daily capacity remaining | up to +30 |
| Hourly capacity remaining | up to +20 |
| Segment affinity match | +50 |
| Error count penalty | -10 per error |
| Fresh (recently checked) | +10 |

### Task 3: Queue Processor Cron

**src/app/api/cron/send-queue/route.ts:**

**Configuration:**
- BATCH_SIZE: 10 messages per run
- MIN_DELAY_MS: 15000 (15s)
- MAX_DELAY_MS: 60000 (60s)
- TIME_WINDOW: 8:00-20:00
- TYPING_DELAY: 2-5s

**Flow:**
1. Auth check (CRON_SECRET or loopback)
2. Time window enforcement
3. Load next batch of queued messages
4. For each message:
   - Select best chip
   - Assign → Sending → Send → Sent/Failed
   - Increment chip counters
5. Return summary with sent/failed/errors

**Migration SQL:**
- `drizzle/0006_message_queue.sql`
- Idempotent with IF NOT EXISTS

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ `src/db/schema.ts` — messageQueue table added
- ✅ `src/lib/db-message-queue.ts` — all queue operations
- ✅ `src/lib/chip-router.ts` — chip selection with scoring
- ✅ `src/app/api/cron/send-queue/route.ts` — queue processor
- ✅ `drizzle/0006_message_queue.sql` — migration SQL
- ✅ TypeScript compiles cleanly
- ✅ Commits: 163c6d5, 84a9989, f704df3