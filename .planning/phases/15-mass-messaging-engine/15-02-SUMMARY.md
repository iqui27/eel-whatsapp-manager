---
phase: 15-mass-messaging-engine
plan: "02"
subsystem: message-variation, campaign-hydration
tags: [spintax, greeting-rotation, emoji-variation, hydration]
dependency_graph:
  requires: [15-01]
  provides: [message-variation-engine, campaign-hydration-pipeline]
  affects: [src/lib/message-variation.ts, src/lib/db-campaigns.ts, src/app/api/campaigns/[id]/hydrate/route.ts, src/app/api/cron/campaigns/route.ts]
tech_stack:
  added: []
  patterns: [spintax-resolution, time-aware-greetings, strategic-emoji, batch-hydration]
key_files:
  created:
    - src/lib/message-variation.ts
    - src/app/api/campaigns/[id]/hydrate/route.ts
  modified:
    - src/lib/db-campaigns.ts
    - src/app/api/cron/campaigns/route.ts
decisions:
  - "Spintax resolves randomly from {option1|option2|option3}"
  - "Greetings are time-aware: morning (5-12), afternoon (12-18), evening (18-5)"
  - "Emoji added at 30% chance per strategic position (sentence ends, CTAs, thank yous)"
  - "Structural variation off by default (may change meaning)"
  - "Campaign cron hydrates to queue; send-queue cron delivers (separation of concerns)"
metrics:
  duration: "15 min"
  completed: "2026-03-17"
  tasks_completed: 3
  files_changed: 4
---

# Phase 15 Plan 02: Campaign Hydration + Message Variation Summary

Built the campaign hydration pipeline that resolves templates for each voter, applies message variations to avoid WhatsApp detection, and enqueues messages for the queue processor.

## What Was Built

### Task 1: Message Variation Engine

**src/lib/message-variation.ts:**

**Spintax Resolution:**
- `{Olá|Oi|E aí|Fala}` → random selection
- Supports nested patterns
- `hasSpintax()` for detection

**Greeting Variation:**
- Time-aware: morning/afternoon/evening
- 4 variations per time slot
- Only adds if no existing greeting

**Emoji Variation:**
- Strategic positions: sentence ends, CTAs, thank yous
- 30% chance per position
- 8+ emojis per category

**Structural Variation:**
- Punctuation changes (optional, off by default)

**Full Pipeline:**
- `applyVariations(text, options)` — applies all enabled variations
- `getMessageBaseHash()` — for WhatsApp detection analysis

### Task 2: Campaign Hydration Pipeline

**src/lib/db-campaigns.ts:**

- `hydrateCampaignToQueue(campaignId, options)`:
  1. Loads campaign and segment
  2. Gets voter IDs from segment
  3. Loads voter data in batches (100 per batch)
  4. For each voter:
     - Resolves template variables
     - Applies message variations
     - Creates queue entry
  5. Batch inserts into message_queue

- `getCampaignHydrationStatus(campaignId)`:
  - Returns counts by status

**API Endpoint:**
- `POST /api/campaigns/[id]/hydrate`
- Manual hydration for draft/scheduled/paused campaigns
- Accepts `variationOptions` in body

### Task 3: Campaign Cron Update

**src/app/api/cron/campaigns/route.ts:**

**New Flow:**
1. Find scheduled campaigns where scheduledAt has passed
2. For each campaign:
   - Claim (atomic status change)
   - Hydrate to queue
   - Update status to 'sending'
3. Return summary with hydrated/failed counts

**Separation of Concerns:**
- Campaign cron: hydration + status management
- Send-queue cron: actual delivery with rate limiting

**Event Logging:**
- `scheduled_claimed` — campaign claimed
- `hydrated` — messages enqueued
- `hydration_failed` — error with details

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ `src/lib/message-variation.ts` — all variation functions
- ✅ `src/lib/db-campaigns.ts` — hydrateCampaignToQueue added
- ✅ `src/app/api/campaigns/[id]/hydrate/route.ts` — API endpoint
- ✅ `src/app/api/cron/campaigns/route.ts` — uses hydration
- ✅ TypeScript compiles cleanly
- ✅ Commits: e194bb7, 0d15201, 6719bbb