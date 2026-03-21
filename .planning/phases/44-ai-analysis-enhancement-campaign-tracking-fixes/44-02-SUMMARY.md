---
phase: 44-ai-analysis-enhancement-campaign-tracking-fixes
plan: "02"
subsystem: campaigns
tags: [campaigns, legacy, fallback, webhook, observability]
dependency_graph:
  requires: [44-01]
  provides: [legacy-campaign-messages-display, webhook-debug-observability]
  affects: [campaigns-messages-tab, messages-update-webhook]
tech_stack:
  added: []
  patterns: [drizzle-fallback-query, console-debug-observability]
key_files:
  created: []
  modified:
    - src/app/api/campaigns/[id]/messages/route.ts
    - src/app/api/webhook/route.ts
decisions:
  - "Use console.debug (not console.warn) for the missing evolutionMessageId log — missing rows are expected for legacy campaigns and are not error conditions"
  - "Legacy campaigns always show status: 'sent' with null delivered/read timestamps — limitation documented in code comment"
  - "Fallback only activates when messageQueue count === 0 for the campaign — queue-based campaigns are completely unaffected"
metrics:
  duration: "70s"
  completed_date: "2026-03-21T16:25:02Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 44 Plan 02: Campaign Messages Legacy Fallback + Webhook Observability Summary

Legacy campaign message display fixed via campaignDeliveryEvents fallback in the messages API, plus console.debug observability added to the messages.update webhook handler when evolutionMessageId is not found in messageQueue.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add campaignDeliveryEvents fallback in messages route | 25046c6 | src/app/api/campaigns/[id]/messages/route.ts |
| 2 | Add debug log in messages.update webhook when evolutionMessageId not found | 20bdb6a | src/app/api/webhook/route.ts |

## What Was Built

### Task 1: Legacy Campaign Messages Fallback

The GET `/api/campaigns/[id]/messages` route previously returned `messages: []` for any campaign sent via the legacy direct-send path (`campaign-delivery.ts`) because it exclusively queried `messageQueue`. Legacy campaigns only recorded delivery data in `campaignDeliveryEvents` with `eventType='message_sent'`.

The fix adds a fallback path that activates only when `messageQueue` count is 0 for a campaign:

1. Queries `campaignDeliveryEvents WHERE campaignId = X AND eventType = 'message_sent'` for a count
2. If count is also 0, returns empty response (truly empty campaign)
3. If count > 0, fetches the legacy events paginated and maps them to `MessageRow` shape
4. Legacy rows have `status: 'sent'`, `sentAt` from `createdAt`, and all delivery timestamps set to null

Queue-based campaigns (db-campaigns.ts path) are entirely unaffected — the fallback only fires when messageQueue is empty.

### Task 2: Webhook Debug Observability

In the `messages.update` handler, added an `else` branch to the `if (result.updated)` check:

```typescript
} else {
  console.debug('[webhook] messages.update: no messageQueue row for evolutionMessageId', msgId, '(likely legacy campaign or non-campaign message)');
}
```

This makes previously silent no-ops visible in system logs. `console.debug` is used because missing rows are expected for legacy campaigns — this is not an error condition.

## Decisions Made

1. **console.debug over console.warn** — Missing rows are expected behavior for legacy campaigns. Using `warn` would produce false noise in monitoring. `debug` is visible only when debug logging is enabled.

2. **status: 'sent' for all legacy rows** — Legacy campaigns sent via `campaign-delivery.ts` have no delivery status lifecycle. Using 'sent' is correct and the limitation is documented in a code comment.

3. **Fallback condition: messages.length === 0** — The fallback checks array length (post-query), not the count. This is consistent with the existing query pattern and handles the status filter edge case naturally (a status filter for a legacy campaign would yield empty messageQueue results and still trigger the fallback correctly).

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- [x] GET `/api/campaigns/[id]/messages` returns messages for legacy campaigns from `campaignDeliveryEvents` when `messageQueue` has 0 rows
- [x] Legacy rows shaped as `MessageRow` with `status: 'sent'`, `sentAt` from `createdAt`, other timestamps null
- [x] When both tables are empty, API still returns `messages: []` with `total: 0`
- [x] Queue-based campaigns unaffected — fallback only activates when `messageQueue` count is 0
- [x] `messages.update` webhook logs `console.debug` when `evolutionMessageId` not found
- [x] TypeScript compiles clean: `npx tsc --noEmit` exits 0

## Self-Check: PASSED

Files verified present:
- FOUND: src/app/api/campaigns/[id]/messages/route.ts (modified)
- FOUND: src/app/api/webhook/route.ts (modified)

Commits verified:
- FOUND: 25046c6 feat(44-02): add campaignDeliveryEvents fallback for legacy campaigns in messages API
- FOUND: 20bdb6a feat(44-02): add debug log in messages.update webhook when evolutionMessageId not found
