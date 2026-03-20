---
phase: 41-campanhas-management-analytics
plan: "01"
subsystem: campaigns
tags: [campaigns, list, ui, status-transitions, optimistic-ui]
dependency_graph:
  requires: ["39-02"]
  provides: ["rich-campaign-list", "activate-pause-controls", "campaign-detail-navigation"]
  affects: ["src/app/campanhas/page.tsx", "src/app/api/campaigns/route.ts", "src/lib/db-campaigns.ts"]
tech_stack:
  added: []
  patterns: ["optimistic-ui", "status-transition-guard", "chip-avatars", "progress-bar"]
key_files:
  created: []
  modified:
    - src/app/campanhas/page.tsx
    - src/app/api/campaigns/route.ts
    - src/lib/db-campaigns.ts
decisions:
  - "Status-only PUT requests bypass template validation and go through the transition guard — keeps concerns separate"
  - "Resume from paused always goes to scheduled (not back to sending) — safest choice, cron picks it up"
  - "Chip data fetched from /api/chips client-side and joined in component — simpler than enriching campaigns API"
  - "Progress bar shown only for sending/sent campaigns using totalSent + totalFailed fields"
metrics:
  duration: "3 min"
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 41 Plan 01: Campaign List Enrichment + Activate/Pause Controls Summary

Enriched campaign list with segment chips, chip avatar pills, date range column, progress bar, and activate/pause/resume controls backed by validated status transitions on the backend.

## What Was Built

### Task 1: Enrich campaign list

The campaign list table now has 7 columns instead of 6:
- **Nome** — clickable link to `/campanhas/[id]` detail page
- **Status** — colored badge (unchanged)
- **Segmento** — violet chip/badge (SegmentChip component)
- **Chips** — up to 2 ChipAvatar pills with profile photo or initials fallback; "+N" overflow badge for 3+
- **Periodo** — date range "15 Mar - 30 Mar" if startDate/endDate set; falls back to scheduledAt; shows "—" otherwise
- **Progresso** — mini progress bar with percentage for sending/sent campaigns using totalSent/totalFailed
- **Acoes** — activate/pause/resume + existing monitor/edit/duplicate/delete

Chips data fetched in parallel with campaigns and segments from `/api/chips`, joined client-side.

### Task 2: Activate/Pause controls + backend transitions

Three button states:
- **draft** -> Ativar (Play icon, green) -> `scheduled`
- **scheduled/sending** -> Pausar (Pause icon, orange) -> `paused` (with AlertDialog confirmation)
- **paused** -> Retomar (RotateCcw icon, green) -> `scheduled`
- **sent/cancelled** -> no button (terminal states)

Optimistic UI: status updated immediately, rolled back with toast.error if API fails.

`updateCampaignStatus()` added to `db-campaigns.ts`:
- VALID_TRANSITIONS map defines all legal transitions
- Returns 400 with descriptive error on invalid transitions
- Terminal states (sent, cancelled) have empty allowed arrays

PUT `/api/campaigns`: status-only updates (single-key body) routed through `updateCampaignStatus()` and skip template validation. All other updates use the existing full-update path.

`syslogInfo('campaign', 'Campaign status changed', ...)` and `syslogError` on transitions.

## Deviations from Plan

None — plan executed exactly as written. The two tasks are committed in a single commit since they share the same page file and are functionally inseparable.

## Self-Check: PASSED

- src/app/campanhas/page.tsx — FOUND
- src/app/api/campaigns/route.ts — FOUND
- src/lib/db-campaigns.ts — FOUND
- Commit fea9948 — FOUND
