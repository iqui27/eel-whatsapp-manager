---
phase: 17-delivery-tracking
plan: "02"
subsystem: funnel-ui, analytics-api, campaign-detail
tags: [conversion-funnel, delivery-timeline, chip-breakdown, analytics]
dependency_graph:
  requires: [17-01]
  provides: [funnel-api, funnel-component, timeline-component, chip-breakdown, campaign-detail-page]
  affects: [src/app/api/campaigns, src/app/campanhas, src/components]
tech_stack:
  added: []
  patterns: [data-visualization, funnel-chart, alerts]
key_files:
  created:
    - src/app/api/campaigns/[id]/funnel/route.ts
    - src/app/api/campaigns/[id]/analytics/route.ts
    - src/app/campanhas/[id]/page.tsx
    - src/components/conversion-funnel.tsx
    - src/components/delivery-timeline.tsx
    - src/components/chip-breakdown.tsx
  modified: []
decisions:
  - "Funnel shows: Total → Sent → Delivered → Read → Replied → Joined Group"
  - "Timeline grouped by hour for readability"
  - "Chip breakdown highlights high failure rates (>10%)"
  - "Alerts generated for failures, low delivery, stalled campaigns"
  - "Campaign detail page at /campanhas/[id]"
metrics:
  duration: "15 min"
  completed: "2026-03-17"
  tasks_completed: 7
  files_changed: 6
---

# Phase 17 Plan 02: Conversion Funnel UI + Campaign Analytics Summary

Built the visualization layer for delivery tracking with funnel component, timeline, chip breakdown, and campaign detail page.

## What Was Built

### Task 1: Funnel API Endpoint

**`GET /api/campaigns/[id]/funnel`:**
- Queries message_queue for accurate counts
- Calculates percentages for each stage
- Returns: total, sent, delivered, read, replied, clicked, joinedGroup, failed

### Task 2: ConversionFunnel Component

**Visual display:**
- Horizontal progress bars for each stage
- Color-coded stages (blue→green→purple→orange→emerald)
- Percentage labels
- Summary KPI cards (delivery rate, read rate, conversion rate)

**Props:** data (FunnelData), compact (boolean for inline display)

### Task 3: DeliveryTimeline Component

**Features:**
- Events grouped by hour
- Color-coded by type (sent/delivered/read/failed)
- Icons for quick visual scanning
- Max 50 events displayed

### Task 4: ChipBreakdown Component

**Display:**
- Per-chip stats: sent, delivered, failed
- Progress bar with delivery/failure split
- Warning banner for high failure rates (>10%)

### Task 5: Analytics API Endpoint

**`GET /api/campaigns/[id]/analytics`:**
- Aggregates funnel + timeline + chip breakdown
- Generates alerts:
  - High failure rate (>10%)
  - Elevated failure rate (>5%)
  - Low delivery rate (<80%)
  - Stalled campaign (>1 hour without events)

### Task 6: Campaign Detail Page

**`/campanhas/[id]` sections:**
1. Header with status badge
2. Alerts panel (if any)
3. Conversion funnel (full width)
4. Two columns: Timeline + Chip Breakdown
5. Campaign details (template, schedule, window)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- ✅ Funnel API returns correct data
- ✅ ConversionFunnel renders correctly
- ✅ DeliveryTimeline groups by hour
- ✅ ChipBreakdown shows performance
- ✅ Analytics API generates alerts
- ✅ Campaign detail page loads
- ✅ TypeScript compiles cleanly
- ✅ Commit: 4ece11b