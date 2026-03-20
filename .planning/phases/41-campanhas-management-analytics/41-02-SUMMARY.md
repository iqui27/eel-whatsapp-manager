---
phase: 41-campanhas-management-analytics
plan: "02"
subsystem: campaigns
tags: [campaigns, analytics, gemini-ai, detail-page, client-component, kpi, auto-refresh]
dependency_graph:
  requires: ["41-01", "40-02"]
  provides: ["campaign-detail-ai-analysis", "campaign-kpi-cards", "campaign-auto-refresh"]
  affects:
    - src/app/campanhas/[id]/page.tsx
    - src/app/api/campaigns/[id]/analytics/route.ts
    - src/lib/gemini.ts
tech_stack:
  added: []
  patterns: ["client-component-with-sse-style-refresh", "ai-on-demand-cache", "kpi-color-indicators"]
key_files:
  created: []
  modified:
    - src/lib/gemini.ts
    - src/app/api/campaigns/[id]/analytics/route.ts
    - src/app/campanhas/[id]/page.tsx
decisions:
  - "Campaign detail page converted to client component — needed for interactive AI refresh button and 30s auto-refresh interval"
  - "AI analysis fetched on-demand via Refresh button (not on page load) — Gemini calls are slow and the user should opt in"
  - "In-memory cache key is campaignId:totalSent — invalidates naturally when campaign sends more messages, without needing Redis"
  - "totalBlocked hardcoded to 0 — no separate blocked counter in schema; circuit breaker uses failureRate as proxy"
metrics:
  duration: "4 min"
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 41 Plan 02: Campaign Detail Analytics + AI Insights Summary

Campaign detail page converted to a client component command center with KPI cards, AI-powered performance analysis (on-demand via Gemini), 30-second auto-refresh for active campaigns, and enriched campaign info cards.

## What Was Built

### Task 1: analyzeCampaignPerformance + AI analytics endpoint

Added `analyzeCampaignPerformance()` to `src/lib/gemini.ts`:
- Input: campaign name, totalSent/Delivered/Read/Replied/Failed/Blocked, messageTemplate, optional segment description + duration
- Output: `{ overallScore: 0-100, summary, insights[], recommendations[], riskFactors[] }`
- Portuguese system prompt with political WhatsApp benchmarks (delivery >95% good, read >70% good, reply >10% good, block <1% acceptable)
- syslog instrumentation on success and error paths

Updated `GET /api/campaigns/[id]/analytics`:
- New `?ai=true` query param triggers Gemini analysis
- In-memory cache `Map<string, { analysis, expiresAt }>` keyed by `${campaignId}:${totalSent}`
- 5-minute TTL — stale cache evicted on next request
- Cache invalidates automatically when totalSent changes (new messages delivered)
- Response extended: `{ stats, ..., ai?: CampaignPerformanceAnalysis }`

### Task 2: Enhanced campaign detail page

Converted `src/app/campanhas/[id]/page.tsx` from a server component to a client component (`'use client'`):

**Navigation:**
- Breadcrumb: Campanhas > {campaign name}
- Quick links: Editar, Mensagens, Lista

**Campaign header:**
- Name, status badge (colored pill), date range, created date
- "Atualizando..." indicator during refresh

**Campaign info cards (4-column grid):**
- Segmento — violet badge + audience count
- Chips — avatar pills with profile photo or initial fallback, +N overflow for 3+
- Configuracao — speed preset, delay range, time window, batch size
- Mensagem — template preview with "Ver completa" expand toggle

**KPI row (5 cards):**
- Total Enviados, Taxa Entrega, Taxa Leitura, Taxa Resposta, Taxa Falha
- Color coding: green/amber/red based on political WhatsApp benchmarks

**Analytics section:** Kept existing ConversionFunnel, DeliveryTimeline, ChipBreakdown components.

**AI Insights panel:**
- On-demand: user clicks "Atualizar analise" button
- Score gauge (0-100) with color-coded progress bar (red < 40, amber 40-70, green > 70)
- Summary, insights (blue dots), recommendations (green dots), risk factors (red dots)
- Loading skeleton while fetching

**Auto-refresh:**
- 30-second interval for `status === 'sending'` campaigns
- `document.visibilityState === 'visible'` guard — no API calls from backgrounded tabs
- "Atualizando..." label shown during background refreshes

**Anti-ban panel** and **Campaign Details** section preserved from the original page.

## Deviations from Plan

None — plan executed exactly as written.

The page structure matches all plan requirements: header, info cards, KPI row, analytics section, AI insights panel, breadcrumb navigation, auto-refresh.

## Self-Check: PASSED

- src/lib/gemini.ts — FOUND
- src/app/api/campaigns/[id]/analytics/route.ts — FOUND
- src/app/campanhas/[id]/page.tsx — FOUND
- Commit ca9202c (task 1) — FOUND
- Commit 6ea4172 (task 2) — FOUND
