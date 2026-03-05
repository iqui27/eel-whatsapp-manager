# Phase 04 Plan 02: A/B Test + Scheduling + Send + Monitor Summary

**One-liner:** Full campaign send flow — A/B variant editor with split slider, time-window scheduler, simulated send API with status transitions, and auto-refreshing delivery monitor.

## What Was Built

### A/B Test Panel (in `/campanhas/nova/page.tsx` — enhanced)
- Switch toggle "Ativar teste A/B"
- Split percentage slider (10–90%, step 5) with visual split bar
- Variant B textarea with variable insertion toolbar + QualityChecks
- State saved to campaign record (`abEnabled`, `abVariantB`, `abSplitPercent`)

### `src/app/campanhas/[id]/agendar/page.tsx` (NEW — 290 lines)
Scheduling wizard with summary → date → time windows → send rate:
- Campaign summary card (name, segment + audience count, A/B split if enabled)
- Date picker (`<input type="date">`, min = today)
- Time window selector: Manhã/Tarde/Noite toggle buttons (multi-select, min 1)
- Send rate radio: Lento (15/min) / Normal (30/min) / Rápido (60/min + amber warning)
- "Agendar campanha" → PUT `/api/campaigns` (status=scheduled) → POST `/api/campaigns/[id]/send` → redirect to monitor

### `src/app/campanhas/[id]/monitor/page.tsx` (NEW — 240 lines)
Real-time delivery monitor:
- Header: campaign name + animated status badge (Loader2 spinner while sending)
- Progress bar: amber while sending, green when sent, with CSS shimmer animation
- Stats row (4 cards): Enviadas / Entregues / Falhas / Respostas
- Delivery log table: 5 mock rows (phone masked ***-XXXX, status badge, timestamp)
- Auto-refresh via `setInterval(3000)` while `status === 'sending'`; stops on `sent` / `cancelled`
- Manual refresh button + "Cancelar envio" (PUT status=cancelled)

### `src/app/api/campaigns/[id]/send/route.ts` (NEW)
Simulated send API:
- POST: validates auth, sets status=sending + zeroes stats
- `setTimeout(3000)`: updates status=sent with mock stats (88% delivered, 5% failed, 12% reply rate)
- Async fire-and-forget pattern (swallows background errors)

### `src/app/campanhas/[id]/editar/page.tsx` (NEW — MVP stub)
Redirects to `/campanhas` for now; full edit-in-place deferred.

### `src/app/api/campaigns/route.ts` (UPDATED)
- GET: added `?id=` filter returning `[campaign]` array (consistent with client usage)
- POST: template no longer required (empty string default) — allows saving name-only drafts

## Commits

| Hash | Description |
|------|-------------|
| `15a1104` | feat(04-02): A/B test + scheduling wizard + send API + monitor page |

## Key Decisions

- **Simulated send with setTimeout** — Real Evolution API integration deferred (Phase hotfix). setTimeout pattern on serverless is best-effort; for production use a queue (Bull/Inngest)
- **Monitor auto-refresh every 3s** — Simple polling vs WebSocket; adequate for MVP campaign volumes
- **Time windows stored as UI state only** — `windowStart`/`windowEnd` in schema covers this; the multi-select windows set the scheduled time
- **Edit page MVP stub** — Full pre-populate of editor with existing campaign data is Phase 04 enhancement; redirect keeps UX working

## Deviations from Plan

- **`requireAuth` doesn't exist** — Used `validateSession` + cookie pattern from existing API routes (Rule 1 — Bug fix)
- **Template field not required in POST** — Relaxed validation so name-only drafts save cleanly (Rule 2 — Missing critical functionality)

## Self-Check

- [x] All files exist
- [x] TypeScript: 0 errors
- [x] Build: 31 pages, 0 errors
- [x] Commit `15a1104` exists
