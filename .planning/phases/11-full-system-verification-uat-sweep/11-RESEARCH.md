---
phase: 11-full-system-verification-uat-sweep
type: research
status: complete
created: 2026-03-07
---

# Phase 11 Research: Full-System Verification + UAT Sweep

## Executive Summary

Phase 11 should be executed as a structured verification/UAT sweep, not as a code-first phase. The repo does not contain a comprehensive automated end-to-end suite, and the highest risks live in authenticated flows, cross-page handoffs, real provider integrations, and the recent SSE rollout.

Prescriptive conclusion:
- use automated build gates only as safety rails (`tsc`, `npm run build`)
- organize execution into 3 plans aligned to product surface, not to code folders
- record PASS/FAIL/BLOCKED evidence in a single verification ledger as the source of truth
- treat anything that fails as explicit follow-up work instead of "testing while fixing"

Recommended phase split:
1. baseline, auth, setup, and legacy operational modules
2. electoral core flows from import to campaign lifecycle
3. realtime conversations, governance/reporting, and final regression sign-off

Confidence:
- **High** that this should be a verification/documentation phase
- **High** that manual authenticated testing is unavoidable for meaningful coverage
- **Medium** on fully validating external-provider behavior locally if the required services are not reachable

Build safety rails on current HEAD:
- `node_modules/.bin/tsc --noEmit` passes
- `npm run build` passes
- the remaining risk is behavioral/runtime, not compile-time

## Current State in This Repo

### User-facing pages

Access and shell:
- `src/app/login/page.tsx`
- `src/app/page.tsx`
- shared shell components in `src/components/`

Operational baseline:
- `src/app/setup/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/chips/page.tsx`
- `src/app/contacts/page.tsx`
- `src/app/clusters/page.tsx`
- `src/app/history/page.tsx`

Electoral core:
- `src/app/segmentacao/importar/page.tsx`
- `src/app/segmentacao/page.tsx`
- `src/app/crm/page.tsx`
- `src/app/crm/[id]/page.tsx`
- `src/app/campanhas/page.tsx`
- `src/app/campanhas/nova/page.tsx`
- `src/app/campanhas/[id]/editar/page.tsx`
- `src/app/campanhas/[id]/agendar/page.tsx`
- `src/app/campanhas/[id]/monitor/page.tsx`

Realtime and operator surfaces:
- `src/app/page.tsx` dashboard queue
- `src/components/ChatQueuePanel.tsx`
- `src/app/conversas/page.tsx`

Governance:
- `src/app/compliance/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/relatorios/page.tsx`

### API surface with high verification value

- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/setup/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/chips/route.ts`
- `src/app/api/chips/sync/route.ts`
- `src/app/api/contacts/route.ts`
- `src/app/api/clusters/route.ts`
- `src/app/api/warming/route.ts`
- `src/app/api/logs/route.ts`
- `src/app/api/voters/import/route.ts`
- `src/app/api/voters/route.ts`
- `src/app/api/segments/route.ts`
- `src/app/api/segments/from-voter/route.ts`
- `src/app/api/campaigns/route.ts`
- `src/app/api/campaigns/[id]/send/route.ts`
- `src/app/api/cron/campaigns/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[id]/messages/route.ts`
- `src/app/api/conversations/stream/route.ts`
- `src/app/api/webhook/route.ts`
- `src/app/api/compliance/route.ts`
- `src/app/api/users/route.ts`

## Planning Implications

- A green build is necessary but not sufficient; most of the important risk lives in runtime behavior.
- Several flows span multiple modules and must be verified end-to-end:
  - CRM profile -> conversations deep link
  - CRM profile -> campaign creation
  - segment materialization -> campaign audience resolution
  - schedule/send -> monitor -> reports
  - webhook ingress -> conversation queue -> agent reply -> realtime updates
- The phase must be strict about evidence because "it opened once" is not a durable verification result.

## High-Risk Regression Areas After Phases 09 and 10

### 1. Realtime chat regressions

Recent work moved `/conversas` and `ChatQueuePanel` from polling to SSE, followed by production hotfixes for React render loops.

Verification implication:
- `/conversas` needs explicit live-update, reconnect, and empty-queue testing
- dashboard queue needs explicit open-queue regression coverage
- unauthorized access to `/api/conversations/stream` must still reject with `401`

### 2. Real-data and orchestration regressions

Phase 09 replaced a large amount of mock or partial behavior with real data and scheduling flows.

Verification implication:
- import, segmentation, CRM, campaigns, scheduling, and monitor need a real chained pass
- reports and dashboard numbers should be checked against known source records or at least against internally consistent totals
- any destructive verification must stay tightly scoped to safe test records

Known risk details to target explicitly:
- scheduling UI may expose choices that do not map 1:1 to the persisted execution behavior
- monitor-side cancellation may not interrupt the underlying delivery loop the way operators expect
- KPI counters such as replies/reads may drift from real event history if they are not being updated through the full pipeline
- cron-backed scheduling only works if the `/api/cron/campaigns` runtime and secret are actually configured in the target environment

### 3. Governance and admin blind spots

Compliance, admin, and report export surfaces tend to be skipped because they are not part of the core happy path.

Verification implication:
- this phase must explicitly cover them, or they will remain unverified despite being shipped

### 4. Webhook and duplication risks

Webhook ingress is part of the operator critical path, but duplicate protection is process-local.

Verification implication:
- inbound webhook behavior should be checked with duplication awareness, especially if the target environment can restart or reconnect during the sweep
- if multi-instance or restart-proof deduplication cannot be proven in the current environment, the limitation should be logged as a residual risk rather than ignored

## Recommended Verification Strategy

### 1. Start with a baseline block

Verify auth, setup, and operational prerequisites first. This prevents later false negatives caused by missing sessions, disconnected chips, or broken settings.

### 2. Group by operator workflow

The most reliable ordering is:
- baseline/access
- data entry and targeting
- campaign execution
- realtime operator handling
- governance/reporting

This mirrors how the product is actually used and exposes broken handoffs between modules.

### 3. Mix UI checks with API smoke checks

Use the UI to verify actual operator behavior. Use lightweight API/curl checks only when the UI is ambiguous or to confirm auth/error behavior. Avoid turning this phase into framework work.

### 4. Maintain one ledger

Use one verification ledger (`11-VERIFICATION.md`) so no surface disappears into plan-specific notes. Summaries can stay per-plan, but the pass/fail matrix must remain centralized.

### 5. Route failures explicitly

If a requirement fails:
- record the failing surface
- record reproduction/evidence
- classify severity/blocker level
- route into follow-up gap work after the sweep

## Don't Hand-Roll

- Do not equate `npm run build` with product verification.
- Do not skip legacy operational pages just because the roadmap focus shifted to electoral features.
- Do not mass-send or schedule broad audience actions as part of verification.
- Do not silently fix discovered issues mid-sweep without first documenting the failure state.
- Do not mark provider-backed flows as passed when they were actually blocked by missing environment prerequisites.
