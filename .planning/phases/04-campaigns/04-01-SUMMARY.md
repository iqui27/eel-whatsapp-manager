# Phase 04 Plan 01: Campaign Editor + WhatsApp Preview Summary

**One-liner:** Split-pane campaign editor with live WhatsApp bubble preview, cursor-aware variable insertion, and heuristic CTA score checker.

## What Was Built

### `src/app/campanhas/page.tsx` (NEW — 232 lines)
Campaign list page:
- DataGrid-style table: Name, Status badge, Segment, Message preview (60 chars), Scheduled At, Actions
- Status badges mapped from English schema values (draft/scheduled/sending/sent/paused/cancelled) to Portuguese labels
- Actions: Monitor link (scheduled/sending/sent), Edit link (draft), Duplicate (POST copy), Delete (AlertDialog confirm)
- Empty state with icon + "Criar primeira campanha" CTA
- Loading state while fetching

### `src/app/campanhas/nova/page.tsx` (NEW — ~320 lines)
Campaign editor page with 3 zones:
- **Metadata bar**: campaign name input (inline, no border), segment selector with audience count badge
- **Split pane**: `grid-cols-[1fr_380px]` — left editor, right sticky WhatsApp preview
- **Bottom action bar**: Cancel | Save draft | Continue →

**Left pane (MessageEditor):**
- Variable toolbar: 5 pill buttons (`{nome}`, `{bairro}`, `{interesse}`, `{data}`, `{candidato}`) — insert at cursor via `setSelectionRange`
- Auto-grow textarea (min 160px, expands via `scrollHeight`)
- Word counter with 3-color threshold (green/amber/red at 80/120)
- QualityChecks component with CTA score badge + 4-item checklist

**Right pane (WhatsAppPreview):**
- Full WhatsApp UI mock: green `#128C7E` header bar, `#ECE5DD` chat area, white bubble with double-check icon, lock footer
- Live variable substitution with preview values (João/Centro/Saúde/today/Dr. Silva)
- Empty state prompt when no message typed

### `src/lib/cta-score.ts` (NEW — 70 lines)
Pure function `calculateCtaScore(message: string): CtaScoreResult`:
- Checks: action verb (+20), variables (+15 each, max 2), word limit (+15), no ALL CAPS (+10), no punct spam (+10), has candidate (+10), base 10
- Returns `{score, checks, wordCount}`
- `scoreColor()` and `scoreBg()` helpers for badge coloring

### `src/components/ui/alert-dialog.tsx` (NEW — shadcn install)
Used in campaign list delete confirmation.

## Deviation: Schema field names

**Found:** Schema uses `template` (not `message`) for the message body, and English status enums (`draft`, `scheduled`, `sending`, `sent`, `paused`, `cancelled`).

**Fix:** Updated all POST bodies and comparison strings to use English schema values. Status label display mapped via `STATUS_LABELS` record.

**Rule applied:** Rule 1 (Bug fix — TypeScript errors from wrong field names)

## Commits

| Hash | Description |
|------|-------------|
| `33c9fa5` | feat(04-01): campaign list + editor with WhatsApp preview + CTA score |

## Key Decisions

- **CTA score is a pure function** — `src/lib/cta-score.ts` has zero React imports, fully unit-testable
- **Variable insertion uses `setSelectionRange`** — preserves cursor position for UX; `requestAnimationFrame` ensures post-React-rerender focus
- **WhatsApp preview is pure CSS mock** — no external library, uses exact WA brand colors
- **Schema field: `template` not `message`** — matches existing DB schema from Phase 02

## Self-Check

- [x] `src/app/campanhas/page.tsx` exists
- [x] `src/app/campanhas/nova/page.tsx` exists
- [x] `src/lib/cta-score.ts` exists
- [x] TypeScript: 0 errors
- [x] Commit `33c9fa5` exists
