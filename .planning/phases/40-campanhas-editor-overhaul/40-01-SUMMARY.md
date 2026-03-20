---
phase: 40-campanhas-editor-overhaul
plan: "01"
subsystem: ai-messaging
tags: [gemini, ai, campaign-editor, message-generation, ui-component]
dependency_graph:
  requires: [39-01]
  provides: [gemini-message-assistant, api-gemini-generate]
  affects: [campaign-editor, gemini-lib]
tech_stack:
  added: []
  patterns: [gemini-flash-generation, rate-limit-in-memory, tabs-ui, result-history]
key_files:
  created:
    - src/app/api/gemini/generate/route.ts
    - src/components/gemini-message-assistant.tsx
  modified:
    - src/lib/gemini.ts
decisions:
  - "generateMessage/improveMessage/rewriteMessage added to gemini.ts alongside existing analyzeMessage/profileLead"
  - "Rate limiting uses in-memory Map keyed by session cookie — no Redis needed, acceptable for per-instance rate limiting"
  - "Generation history stored in component state (last 3) — no persistence needed for short-lived editor sessions"
  - "GeminiMessageAssistant is fully self-contained — no context/provider needed, receives currentMessage as prop"
metrics:
  duration: "3 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_changed: 3
---

# Phase 40 Plan 01: Gemini AI Message Writing Assistant Summary

Gemini message generation functions and AI writing assistant UI with generate/improve/rewrite modes using Gemini Flash.

## Tasks Completed

### Task 1: Add Gemini message generation functions and API endpoint
**Commit:** ef55f21

Added three new exported functions to `src/lib/gemini.ts`:
- `generateMessage()` — generates campaign messages from a prompt with tone, length, and personalization controls
- `improveMessage()` — improves existing messages with optional custom instruction
- `rewriteMessage()` — rewrites messages in a different style (shorter/longer/more_formal/more_casual/more_persuasive)

All functions use the Portuguese political marketing system prompt, log via syslog, and handle errors gracefully returning null on failure.

Created `src/app/api/gemini/generate/route.ts`:
- POST endpoint handling `action: generate | improve | rewrite`
- Authentication via `requireRequestActor` (401 if not logged in)
- Input validation per action (prompt required for generate, message required for improve/rewrite)
- Rate limit: 10 calls/min per session using in-memory Map
- Syslog instrumentation: `syslog.info('gemini', 'Message generation requested', { action })`

### Task 2: Create GeminiMessageAssistant UI component
**Commit:** 912ba5c

Created `src/components/gemini-message-assistant.tsx` — a collapsible AI writing assistant panel:

**Gerar tab:** Textarea prompt input, 4-button tone selector (Formal/Informal/Amigável/Urgente), generate button, result card with "Usar esta mensagem" + "Gerar outra", suggestion chips, generation history pills (last 3).

**Melhorar tab:** Current message preview (120 char truncated), 4 quick action buttons (Mais persuasivo/Mais curto/Corrigir gramática/Adicionar urgência), custom instruction input, result card with "Aplicar" + changes list.

**Reescrever tab:** 5-style selector (Mais curta/Mais longa/Mais formal/Mais casual/Mais persuasiva), rewrite button, result card with "Usar esta versão".

All tabs: loading skeleton, error banner with retry, disabled state when currentMessage is empty (improve/rewrite).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: src/lib/gemini.ts (modified)
- FOUND: src/app/api/gemini/generate/route.ts (created)
- FOUND: src/components/gemini-message-assistant.tsx (created)
- FOUND commit ef55f21 (Task 1)
- FOUND commit 912ba5c (Task 2)
