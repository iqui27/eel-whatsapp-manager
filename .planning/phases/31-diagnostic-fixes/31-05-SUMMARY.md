---
phase: 31-diagnostic-fixes
plan: 05
subsystem: compliance-webhook
tags: [compliance, opt-in, opt-out, webhook, keyword-detection, lgpd]
dependency-graph:
  requires: []
  provides: [automatic-consent-keyword-detection, consent-confirmation-reply]
  affects: [webhook-handler, db-compliance]
tech-stack:
  added: []
  patterns: [keyword-detection, consent-logging, whatsapp-confirmation-reply]
key-files:
  created: []
  modified:
    - src/lib/db-compliance.ts
    - src/app/api/webhook/route.ts
decisions:
  - "Exact match + starts-with prefix detection covers 'SIM' and 'Sim, quero participar' cases"
  - "Only process known voters (voterId not null) — unknown contacts don't trigger consent flow"
  - "Confirmation reply failure is caught and logged but does not block consent logging"
  - "Consent block placed BEFORE AI analysis so consent is recorded even if AI is disabled"
metrics:
  duration: "~15 min"
  completed: "2026-03-18"
  tasks-completed: 2
  files-modified: 2
---

# Phase 31 Plan 05: Opt-in/out Keyword Detection Summary

**One-liner:** Automatic SIM/SAIR keyword detection in the webhook handler, logging consent via `logConsent()` and sending WhatsApp confirmation reply, closing the LGPD compliance automation gap.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add opt-in/out keyword constants + detectConsentKeyword() to db-compliance | `50247dc` | `src/lib/db-compliance.ts` |
| 2 | Wire keyword detection in webhook messages.upsert handler | `50247dc` | `src/app/api/webhook/route.ts` |

## Changes Made

### `src/lib/db-compliance.ts`
New exports added after existing imports:
- `OPT_IN_KEYWORDS = ['sim', 'aceito', 'concordo', 'quero', 'aceitar', 'ok']`
- `OPT_OUT_KEYWORDS = ['sair', 'parar', 'cancelar', 'remover', 'não quero', 'nao quero', 'pare']`
- `OPT_IN_CONFIRMATION` — user-facing Portuguese confirmation message with SAIR opt-out instruction
- `OPT_OUT_CONFIRMATION` — user-facing Portuguese removal confirmation with SIM re-opt-in instruction
- `detectConsentKeyword(text)` — case-insensitive detection: exact match + starts-with prefix patterns, returns `'opt_in' | 'revoke' | null`

### `src/app/api/webhook/route.ts`
- Added `sendText` to imports from `@/lib/evolution`
- Added `logConsent, detectConsentKeyword, OPT_IN_CONFIRMATION, OPT_OUT_CONFIRMATION` from `@/lib/db-compliance`
- Inserted consent detection block after reply correlation, before AI analysis:
  - Only runs when `voterId` is known (registered voter in DB)
  - Calls `detectConsentKeyword(messageText)` to detect opt_in or revoke
  - On match: calls `logConsent(voterId, action, 'whatsapp', metadata)` — automatically updates `voter.optInStatus`
  - Sends confirmation reply via `sendText()` with 2s delay
  - All errors wrapped in try/catch — failures logged, webhook flow not interrupted

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED
- `src/lib/db-compliance.ts` ✅
- `src/app/api/webhook/route.ts` ✅
- Commit `50247dc` ✅
- Build passes ✅
