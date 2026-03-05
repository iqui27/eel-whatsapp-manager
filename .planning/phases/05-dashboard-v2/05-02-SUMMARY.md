# Phase 05 Plan 02: Dashboard V2 — Chat Queue Panel Summary

**One-liner:** Conversations API route (GET/POST/PUT with status filter) and live chat queue panel in the dashboard right column with 15-second auto-refresh and priority status dots.

## What Was Built

### `src/app/api/conversations/route.ts` (NEW)
- GET: list all conversations (optionally `?status=open`), or single by `?id=`
- POST: create new conversation
- PUT: update status (`id` + `status` required)
- Auth-protected via `validateSession` cookie pattern

### `src/components/ChatQueuePanel.tsx` (NEW — 160 lines)
- Fetches `/api/conversations?status=open`
- Priority status dots: red (open) / amber (assigned) / yellow (waiting) / green (resolved) / blue (bot)
- Each row: voter name, status badge, phone + handoff reason, time-ago
- Shows up to 6 rows, "+N conversas" link if more
- Empty state: MessageSquare icon + "Nenhuma conversa ativa"
- Loading skeleton: 3 animated placeholder rows
- Auto-refreshes every 15 seconds via `setInterval`

### `src/app/page.tsx` (UPDATED)
- `<ChatQueuePanel />` added below `<CommandPanel />` in the right sticky column

## Commits

| Hash | Description |
|------|-------------|
| `2fa86e1` | feat(05-02): conversations API route + chat queue panel in dashboard right column |

## Key Decisions

- **Polling every 15s** — simple and reliable for MVP; SSE/WebSocket deferred to Phase 06
- **Status filter `?status=open`** — only urgent conversations shown in dashboard panel; full queue in /conversas
- **Non-critical panel** — fetch errors are swallowed silently so panel failure doesn't break dashboard

## Build Verification

- 32 pages, 0 TypeScript errors, `npm run build` passes

## Self-Check

- [x] `src/app/api/conversations/route.ts` exists
- [x] `src/components/ChatQueuePanel.tsx` exists
- [x] TypeScript: 0 errors
- [x] Build: 32 pages, 0 errors
- [x] Commit `2fa86e1` exists
