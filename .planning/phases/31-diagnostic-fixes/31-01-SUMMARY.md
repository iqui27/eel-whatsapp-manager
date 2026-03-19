---
phase: 31-diagnostic-fixes
plan: 01
subsystem: crm
tags: [crm, inline-edit, ai-analysis, gemini, bug-fix]
dependency-graph:
  requires: []
  provides: [crm-inline-edit-fix, crm-ai-analysis-card, gemini-model-fix]
  affects: [crm-page, crm-detail-page, gemini-lib]
tech-stack:
  added: []
  patterns: [ai-analysis-display, inline-edit-with-id]
key-files:
  created: []
  modified:
    - src/app/crm/page.tsx
    - src/app/crm/[id]/page.tsx
    - src/lib/gemini.ts
decisions:
  - "Gemini model changed from gemini-2.5-flash-preview-04-17 (404) to gemini-2.5-flash (GA)"
  - "Inline edit PUT now includes { id: voter.id, ...editForm } in body as required by API"
  - "AI Analysis card shown on voter detail with tier/sentiment/summary/action/confidence"
metrics:
  duration: "~25 min"
  completed: "2026-03-19"
  tasks-completed: 3
  files-modified: 3
---

# Phase 31 Plan 01: CRM Inline Edit Fix + AI Analysis Card + Gemini Model Fix Summary

**One-liner:** Fixed CRM inline edit 400 error (missing id), added AI analysis card on voter detail, corrected Gemini model from preview to GA (gemini-2.5-flash).

## What Was Built

Three critical fixes to the CRM and Gemini integration:

1. **CRM inline edit PUT fix** — The PUT body was missing `voter.id`, causing a silent 400 error on every save. Fixed by sending `{ id: voter.id, ...editForm }` in the request body.

2. **AI Analysis card on voter detail** — Added a full AI analysis section to `/crm/[id]` showing tier badge (hot/warm/cold/dead with color coding), sentiment badge, AI summary text, recommended action (with human-readable labels), confidence %, and last analyzed timestamp. Empty state shown when no AI data exists.

3. **Gemini model name fix** — The hardcoded fallback model `gemini-2.5-flash-preview-04-17` returned 404 from the Google API (model deprecated/renamed). Fixed both `analyzeMessage()` and `profileVoter()` in `src/lib/gemini.ts` to use `gemini-2.5-flash` (GA, available in v1beta).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Gemini model name 404**
- **Found during:** Task 2 (profiling error in server logs)
- **Issue:** `gemini-2.5-flash-preview-04-17` returned `[404 Not Found] models/gemini-2.5-flash-preview-04-17 is not found for API version v1beta`
- **Fix:** Changed hardcoded fallback to `gemini-2.5-flash` in both function call sites in gemini.ts
- **Files modified:** `src/lib/gemini.ts`
- **Commit:** 84e1d16

## Self-Check: PASSED
- [x] `src/app/crm/page.tsx` — inline edit sends `{ id: voter.id, ...editForm }`
- [x] `src/app/crm/[id]/page.tsx` — AI Analysis card renders at lines 660-700
- [x] `src/lib/gemini.ts` — both model calls use `gemini-2.5-flash`
