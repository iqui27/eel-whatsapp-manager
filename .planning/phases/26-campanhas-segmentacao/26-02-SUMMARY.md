---
phase: 26-campanhas-segmentacao
plan: "02"
subsystem: segmentacao
tags: [segmentacao, accents, onboarding, usage-stats, ux]
key_files:
  modified:
    - src/app/segmentacao/page.tsx
metrics:
  duration: "20 min"
  completed: "2026-03-19"
  tasks: "2/2"
  files: "1"
---

# Phase 26 Plan 02: Segmentação UX Summary

**One-liner:** Prominent "Novo Segmento" button added to header, all Portuguese accents fixed, campaign usage count and last-used date added to segments table, dismissible onboarding guide

## What Was Built

### Task 1: Button + Accents + Onboarding
- Primary "Novo Segmento" button in page header → resets form + scrolls to filter builder
- `filterBuilderRef` + `handleNewSegment()` handler
- Accent fixes: `Geográfico`, `Demográfico`, `Seção` (×2), `Mínimo/Máximo`, `minúsculas/números`, `alterações`, `começar`
- pageTitle + h1: `Segmentação`
- Dismissible onboarding guide (3 cards: Filtros, Pré-visualização, Campanhas)

### Task 2: Campaign Usage Stats
- `setCampaigns` state for campaign usage data
- `loadSegments` now also fetches `/api/campaigns`
- `segmentUsage` useMemo: builds Map<segmentId, { count, lastUsed }>
- Replaced segment names list in "Campanhas" column with numeric count from segmentUsage
- Added "Último uso" column showing last campaign use date formatted as `dd mmm`
- "Ações" column header fixed (was "Acoes")

## Commits
- `dfcda4a` feat(26-02): segmentacao - prominent button, accents, usage stats, onboarding

## Self-Check: PASSED
