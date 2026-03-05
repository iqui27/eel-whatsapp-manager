---
phase: 09-real-data
plan: "01"
subsystem: webhook-pipeline
tags: [webhook, drizzle, evolution-api, conversations, inbound]
dependency_graph:
  requires: [db-conversations, db-chips, db-voters, db/schema]
  provides: [inbound-message-storage, chip-status-sync]
  affects: [/conversas, HITL-chat-queue]
tech_stack:
  added: []
  patterns: [drizzle-db-access, per-handler-try-catch, in-memory-dedup-cache]
key_files:
  created: []
  modified:
    - src/app/api/webhook/route.ts
decisions:
  - "Use status 'open' for new conversations from inbound (not 'pending' which doesn't exist in schema enum)"
  - "Skip group chats (@g.us) — only handle 1:1 conversations"
  - "In-memory Set dedup cache (max 2000 entries) for Evolution API duplicate webhooks"
  - "searchVoters + phone normalization for voter lookup from inbound phone number"
  - "Conversations status query: ['open', 'bot', 'waiting', 'assigned'] — covers all non-resolved states"
metrics:
  duration: "3 min"
  completed: "2026-03-05"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 09 Plan 01: Webhook Inbound Pipeline Summary

**One-liner:** Replaced legacy JSON-file webhook imports with Drizzle DB access — inbound WhatsApp messages now stored as conversations via addConversation + addMessage, with chip status sync via updateChip.

## What Was Built

Rewrote `src/app/api/webhook/route.ts` to use the Drizzle-based DB libraries introduced in Phase 02, eliminating the broken legacy imports (`@/lib/config`, `@/lib/chips`).

### Task 1: Replace webhook JSON imports with Drizzle DB

**`connection.update` handler:**
- Loads chips via `loadChips()` from `db-chips.ts`
- Matches by `chip.name` or `chip.instanceName` 
- Updates status via `updateChip(chip.id, { status })` — 'connected' for `state=open`, 'disconnected' otherwise

**`messages.upsert` handler:**
- Iterates messages array, filters to `fromMe === false` (inbound only)
- Skips group chats (`@g.us` suffix)
- Strips phone to digits via `remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')`
- Looks up voter via `searchVoters(phone)` + phone normalization
- Queries for existing open conversations: `voterPhone = phone AND status IN ['open', 'bot', 'waiting', 'assigned']`
- If exists: `addMessage(conversationId, 'voter', messageText)`
- If not: `addConversation({ voterId, voterName, voterPhone, status: 'open' })` then `addMessage`

### Task 2: Defensive edge case handling

- **Per-event try/catch** — connection.update failure doesn't stop messages.upsert processing
- **Per-message try/catch** — one bad message doesn't break the batch
- **Group chat skip** — `@g.us` JIDs silently ignored
- **Missing message body skip** — protocol messages, reactions skipped silently
- **Empty text skip** — media-only messages skipped
- **In-memory dedup cache** — Set of processed `msg.key?.id` values (max 2000) prevents storing Evolution API duplicate deliveries
- **Meaningful logging** — `[webhook] Stored inbound from {phone} on {instance} → conv {id}`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Schema has no 'pending' conversation status**
- **Found during:** Task 1 — plan specified `status: 'pending'` for new conversations
- **Issue:** conversations.status enum is `['open', 'assigned', 'waiting', 'resolved', 'bot']` — no 'pending'
- **Fix:** Used `status: 'open'` for new conversations (semantically correct — voter reached out, needs attention)
- **Files modified:** src/app/api/webhook/route.ts
- **Commit:** 6622302

**2. [Rule 1 - Bug] Schema query for 'pending' status invalid**
- **Found during:** Task 1 — plan had `status IN ('open', 'pending')`
- **Fix:** Changed to `inArray(conversations.status, ['open', 'bot', 'waiting', 'assigned'])` to cover all non-resolved states
- **Files modified:** src/app/api/webhook/route.ts
- **Commit:** 6622302

**3. [Rule 1 - Bug] conversations table has no chipId column**
- **Found during:** Task 1 — plan mentioned `chipId: instanceName` in addConversation
- **Fix:** Omitted chipId field (not in schema), only logs instanceName in console for tracing
- **Files modified:** src/app/api/webhook/route.ts
- **Commit:** 6622302

## Verification

- [x] `tsc --noEmit` — passes with zero errors
- [x] `npm run build` — compiled successfully, all 39 pages generated
- [x] No imports from `@/lib/config` or `@/lib/chips` (old JSON files)
- [x] All inbound messages route through `addConversation` + `addMessage`

## Self-Check: PASSED

- Modified file exists: `src/app/api/webhook/route.ts` ✅
- Task 1 commit: 6622302 ✅
- Task 2 commit: 9008319 ✅
- No old JSON imports remaining ✅
- Build passes cleanly ✅
