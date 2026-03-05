# Phase 05 Plan 01: Dashboard V2 — KPI Row + Operations Table + Command Panel Summary

**One-liner:** Electoral operations dashboard with animated KPI row, campaign operations table with delivery rate bars, command panel with quick-actions and system status, and 3-step onboarding wizard.

## What Was Built

### `src/app/page.tsx` (REPLACED — 430 lines)
Complete rebuild of the dashboard. Removed chip-warming layout; added:

**KPI Row (4 cards):**
| Metric | Source | Color |
|--------|--------|-------|
| Mensagens Entregues | sum `totalDelivered` across campaigns | blue |
| Taxa de abertura | mock 62% (no DB read-tracking yet) | green |
| Respostas | sum `totalReplied` | purple |
| Bloqueios | sum `totalFailed` | red |

All use `useCountUp` for animated number entry.

**Operations Table:**
- Fetches all campaigns, renders up to 8 rows
- Columns: Campaign name, Status badge, Segment name, Delivered/Total with inline progress bar, Rate % (color-coded ≥80 green / 50-79 amber / <50 red), Actions (Monitor / Edit)
- Empty state with "Nova campanha" CTA

**Command Panel (280px sticky right column):**
- 4 quick-action buttons: Aquecer chips, Nova campanha, Importar eleitores, Ver compliance
- System status block: chips ativos, eleitores, segmentos (live counts)

**Onboarding Wizard:**
- Shows when `campaigns.length === 0` and not dismissed (`localStorage` key `eel_onboarding_dismissed`)
- 3 steps: Import → Segment → Campaign; each checks completion (voters/segments/campaigns counts)
- Progress dots + completion check icons per step
- Dismiss on "Fechar" once all 3 done

### `src/lib/use-count-up.ts` (NEW — extracted hook)
- `useCountUp(target, duration, delay)` — ease-out cubic animation
- `'use client'` directive — safe for RSC tree
- Reusable across any page that needs animated numbers

## Commits

| Hash | Description |
|------|-------------|
| `e79736d` | feat(05-01): Dashboard V2 electoral KPIs + operations table + command panel + onboarding |

## Key Decisions

- **Recharts/framer-motion removed from dashboard page** — not uninstalled (legacy pages), but not imported in new dashboard; reduces bundle for this route
- **Taxa de abertura mocked at 62%** — no WhatsApp read-tracking in DB; labeled "(sem rastreio)" so operators know
- **Onboarding dismissed via localStorage** — simpler than DB column; acceptable for MVP single-user context

## Self-Check

- [x] `src/app/page.tsx` rebuilt (430 lines)
- [x] `src/lib/use-count-up.ts` created
- [x] TypeScript: 0 errors
- [x] Commit `e79736d` exists
