---
phase: 37-operacoes-layout-data
plan: "01"
subsystem: operacoes-ui
tags: [ui-polish, data-verification, layout, operacoes]
dependency_graph:
  requires: []
  provides: [polished-operacoes-page, verified-api-connections]
  affects: [src/app/operacoes/page.tsx, src/components/message-feed.tsx, src/components/chip-health-grid.tsx]
tech_stack:
  added: []
  patterns: [V2 Editorial Light tokens, visibility guard auto-refresh, direction badges]
key_files:
  created: []
  modified:
    - src/components/chip-health-grid.tsx
    - src/components/message-feed.tsx
    - src/components/quick-actions-panel.tsx
    - src/components/help-panel.tsx
decisions:
  - "MessageFeed direction indicators changed from bare icons to labeled badges (Env/Rec) for readability"
  - "QuickActionsPanel /settings corrected to /configuracoes (V2 electoral nav route)"
  - "HelpPanel supportEmail marked as configurable via env var comment (no real email configured)"
  - "MessageFeed auto-refresh was polling non-existent /api/operations/messages — fixed to /api/dashboard/messages"
metrics:
  duration: "4 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_modified: 4
---

# Phase 37 Plan 01: Operações Layout & Data Verification Summary

**One-liner:** Fixed MessageFeed broken API endpoint, direction badges, chip header accent, route fixes, and verified all 5 API endpoints return real DB data with no hardcoded values.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Audit and fix layout/styling of all Operações sub-components | df60257 | chip-health-grid.tsx, message-feed.tsx |
| 2 | Verify all Operações components use real data from APIs | 5455f53 | quick-actions-panel.tsx, help-panel.tsx |

## What Was Built

### Task 1: Layout and Styling Fixes

Audited all 8 Operações sub-components for layout issues, text truncation, and emoji usage:

- **ChipHealthGrid**: Fixed "Ultimo Check" → "Último Check" (missing accent). Already uses colored dots (not emoji), flexible minmax column widths.
- **MessageFeed (critical bug fix)**: Auto-refresh was polling `/api/operations/messages` which does not exist — fixed to `/api/dashboard/messages`. Also fixed response parsing to handle `{messages:[]}` envelope. Added `title` tooltips on chip/lead columns for overflow readability. Replaced bare direction icons with labeled badges ("Env"/"Rec").
- **CampaignProgressBars**: Already uses `line-clamp-1` + title tooltip on campaign name. Status badges properly styled.
- **AlertsPanel**: Already uses Lucide icons (not emoji), proper spacing, max-h-48 scroll.
- **GroupCapacityGrid**: Already uses status badges and capacity bars with proper color coding.
- **ConversionKPIs**: Already uses TrendingUp/Down icons with colored text (no emoji). Responsive grid.
- **SystemStatusCard**: Already uses modern flex CSS for TrafficLightIndicator (no floats). Status uses colored dots.
- **operacoes/page.tsx**: Layout is clean — Cards with consistent padding, gap-6 grid, proper headings.

### Task 2: Real Data Verification

Audited all 5 API endpoints and all panel components:

- `/api/dashboard/operations` — real DB queries: chips table + campaigns table + messageQueue aggregates + whatsappGroups near-capacity check + in-memory failover logs
- `/api/dashboard/kpis` — real SQL aggregates from campaigns table (totalSent/Delivered/Read/Replied/JoinedGroup)
- `/api/dashboard/messages` — real outbound (messageQueue) + inbound (conversationMessages) merged and sorted
- `/api/dashboard/groups` — real whatsappGroups with active/full status filter
- `/api/voters?limit=1` — real voter total from paginated API response

**NextActionsPanel**: Derives suggestions from `getActionSuggestions(systemState)` — systemState is computed from real API data in the parent page. No hardcoded suggestions.

**QuickActionsPanel**: Fixed `/settings` → `/configuracoes` route. All 8 action links verified as pointing to valid routes.

**HelpPanel**: Support email `suporte@eel.app` marked as configurable placeholder (comment added referencing `NEXT_PUBLIC_SUPPORT_EMAIL` env var). FAQ content is relevant to electoral campaign context.

**Auto-refresh**: Confirmed working — `useEffect` with `setInterval(10s)` + `visibilitychange` listener that stops polling when tab is hidden and resumes on visibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MessageFeed polling non-existent API endpoint**
- **Found during:** Task 1
- **Issue:** `MessageFeed` auto-refresh was fetching `/api/operations/messages` which does not exist (404). The correct endpoint is `/api/dashboard/messages` which returns `{messages: [...]}`.
- **Fix:** Updated endpoint URL and response parsing to handle the `{messages:[]}` envelope.
- **Files modified:** `src/components/message-feed.tsx`
- **Commit:** df60257

**2. [Rule 2 - Missing functionality] Direction indicators too subtle**
- **Found during:** Task 1
- **Issue:** MessageFeed used bare arrow icons for direction with no text label — hard to read in small feed rows.
- **Fix:** Added labeled badges ("Env"/"Rec") with color-coded borders (blue/green) for clear inbound/outbound distinction.
- **Files modified:** `src/components/message-feed.tsx`
- **Commit:** df60257

**3. [Rule 1 - Bug] QuickActionsPanel pointed to legacy /settings route**
- **Found during:** Task 2
- **Issue:** The Configurações link in QuickActionsPanel used `/settings` (legacy V1 settings page) instead of `/configuracoes` (V2 electoral config page).
- **Fix:** Updated href to `/configuracoes`.
- **Files modified:** `src/components/quick-actions-panel.tsx`
- **Commit:** 5455f53

## API Endpoints Status

| Endpoint | Data Source | Real Data? |
|----------|-------------|-----------|
| `/api/dashboard/operations` | chips + campaigns + messageQueue + whatsappGroups | Yes |
| `/api/dashboard/kpis` | campaigns aggregate SQL | Yes |
| `/api/dashboard/messages` | messageQueue + conversationMessages | Yes |
| `/api/dashboard/groups` | whatsappGroups | Yes |
| `/api/voters?limit=1` | voters (paginated) | Yes |

## Self-Check: PASSED

- src/components/chip-health-grid.tsx — FOUND
- src/components/message-feed.tsx — FOUND
- src/components/quick-actions-panel.tsx — FOUND
- src/components/help-panel.tsx — FOUND
- Commit df60257 — FOUND
- Commit 5455f53 — FOUND
