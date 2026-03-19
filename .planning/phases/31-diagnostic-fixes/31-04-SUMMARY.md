---
phase: 31-diagnostic-fixes
plan: 04
subsystem: message-history
tags: [history, inbound, direction-filter, empty-state, ux]
dependency-graph:
  requires: []
  provides: [inbound-message-history, direction-filter-ui, contextual-empty-state]
  affects: [historico-page, history-api]
tech-stack:
  added: []
  patterns: [merged-query-pagination, direction-param-filtering]
key-files:
  created: []
  modified:
    - src/app/historico/page.tsx
    - src/app/api/messages/history/route.ts
    - src/components/message-history-table.tsx
decisions:
  - "Merge outbound + inbound in memory before paginating (simpler than SQL UNION for cross-table sort)"
  - "Inbound rows use status='received' to differentiate from outbound statuses"
  - "Direction filter hides table + shows empty state (not just empty table) when no results"
metrics:
  duration: "~20 min"
  completed: "2026-03-18"
  tasks-completed: 2
  files-modified: 3
---

# Phase 31 Plan 04: Message History — Inbound Support & Empty State Summary

**One-liner:** Direction filter (Todas/Enviadas/Recebidas) + inbound messages from `conversationMessages`, with contextual empty state guiding users to create their first campaign.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Improve empty state + add direction filter to historico page | `213bbf2` | `src/app/historico/page.tsx`, `src/components/message-history-table.tsx` |
| 2 | Add inbound message support to history API | `213bbf2` | `src/app/api/messages/history/route.ts` |

## Changes Made

### `src/app/historico/page.tsx`
- Added `direction` state (`'all' | 'outbound' | 'inbound'`, default `'all'`)
- Added segmented control (Todas / Enviadas / Recebidas) with icon badges
- Added `direction` to fetch params and `useCallback` dependency array
- Added contextual empty state:
  - **No messages at all:** Icon + title + description + CTA button to `/campanhas/nova` + link to `/segmentacao`
  - **No results for active filters:** "Nenhum resultado encontrado" + "Limpar filtros" button
- Table only renders when loading or data.length > 0 (avoids double empty state)
- Added `MessageSquare`, `Send`, `Inbox` icons from lucide-react

### `src/app/api/messages/history/route.ts`
- Added `direction` query param (`all | outbound | inbound`, default `all`)
- Imports `conversationMessages`, `conversations` from `@/db/schema`
- When `direction` is `all` or `inbound`: queries `conversationMessages` JOIN `conversations` WHERE sender = 'voter'
- Inbound rows mapped to unified `MessageHistoryRow` shape with `direction: 'inbound'`, `status: 'received'`
- Outbound rows tagged with `direction: 'outbound'`
- All rows merged and sorted by `createdAt` (respects `sortOrder` param)
- Pagination applied after merge (correct total counts)
- Campaign/chip/status filters only apply to outbound (semantically correct)
- Search applies to both outbound (phone/name/message) and inbound (voterPhone/voterName/content)

### `src/components/message-history-table.tsx`
- Added optional `direction?: 'outbound' | 'inbound'` to `MessageHistoryRow` interface

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- `src/app/historico/page.tsx` ✅
- `src/app/api/messages/history/route.ts` ✅
- `src/components/message-history-table.tsx` ✅
- Commit `213bbf2` ✅
- Build passes ✅
