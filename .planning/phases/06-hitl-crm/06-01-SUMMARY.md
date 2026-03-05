# Phase 06 Plan 01: HITL Conversations UI Summary

**Phase:** 06-hitl-crm
**Plan:** 06-01
**Subsystem:** Conversations / HITL
**Tags:** conversations, hitl, chat, messages-api, three-column-ui
**Commit:** 05c9ceb

## One-liner

Three-column HITL conversations UI (queue / live-chat / voter-context) with messages API (GET+POST per conversation).

## What Was Built

- `src/app/api/conversations/[id]/messages/route.ts`: GET (load all messages for conversation) + POST (add message, sets direction + timestamp)
- `src/app/api/conversations/route.ts`: updated PUT to handle `handoffReason`, `priority`, `assignedAgent` via raw Drizzle `db.update()`; added `?voterId=` filter to GET
- `src/app/conversas/page.tsx`: three-column layout:
  - **Column 1 (Queue)**: conversation list filtered by status tabs (waiting/in_progress/resolved), priority dot, voter name, last message preview, 15s polling
  - **Column 2 (Chat)**: message bubble thread, send input, agent reply, marks conversation as in_progress on first reply
  - **Column 3 (Context)**: voter header card, handoff reason, priority selector, assign-to-agent dropdown, close/escalate actions
- `src/components/ui/scroll-area.tsx`: installed shadcn component for chat scroll

## Key Decisions

- updateConversationStatus helper insufficient for priority/handoffReason — used raw db.update() in API route directly
- Three-column layout chosen for operational efficiency (queue + chat + context visible simultaneously)
- Polling at 15s for queue refresh (consistent with ChatQueuePanel approach)

## Deviations from Plan

None — plan executed exactly as written.

## Files Created/Modified

**Created:**
- src/app/api/conversations/[id]/messages/route.ts
- src/app/conversas/page.tsx
- src/components/ui/scroll-area.tsx

**Modified:**
- src/app/api/conversations/route.ts
