---
phase: 11
slug: full-system-verification-uat-sweep
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-07
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for a full verification/UAT sweep.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual UAT + targeted API smoke + Next.js/TypeScript build verification |
| **Config file** | `tsconfig.json` / `package.json` |
| **Quick run command** | `node_modules/.bin/tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~45-90 minutes manual sweep + build gates |

---

## Sampling Rate

- **After every verification block:** Run `node_modules/.bin/tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before final sign-off:** Full suite plus targeted auth/API smoke checks must be green
- **Max feedback latency:** 15 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | QA-01 | build + manual | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 11-01-02 | 01 | 1 | QA-02 | manual + build | `npm run build` | ✅ | ⬜ pending |
| 11-02-01 | 02 | 2 | QA-03 | manual + API smoke | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 11-02-02 | 02 | 2 | QA-04 | manual + build | `npm run build` | ✅ | ⬜ pending |
| 11-03-01 | 03 | 3 | QA-05 | manual + API smoke | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 11-03-02 | 03 | 3 | QA-06, QA-07, QA-08 | manual + build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⛔ blocked*

---

## Wave 0 Requirements

Execution depends on the following prerequisites:

- an authenticated operator session
- safe verification data or a clearly bounded test tenant/dataset
- setup/settings/chip connectivity sufficient to exercise provider-backed flows
- a writable verification ledger at `.planning/phases/11-full-system-verification-uat-sweep/11-VERIFICATION.md`

If any prerequisite is missing, execution must mark the affected checks as `⛔ blocked` with the exact reason. Do not infer pass/fail without evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Login, protected-route redirect, and logout behavior | QA-01 | Requires live session flow | Open `/login`, verify invalid vs valid auth behavior, then confirm protected pages redirect or load correctly and logout clears access |
| Setup/settings persistence and chip baseline | QA-01 | Depends on current environment and provider config | Save/read setup or settings values and confirm chip-related surfaces still reflect expected connectivity/state |
| Legacy operational modules still function | QA-02 | User-facing UI behavior matters more than raw response codes | Visit `/chips`, `/contacts`, `/clusters`, `/history` and related actions; confirm tables/forms/states load without regressions |
| Voter import and segmentation materialization | QA-03 | Multi-step UI and real data interactions | Execute a small safe CSV import, validate mapping/preview, save a segment, and confirm audience/materialized results remain coherent |
| CRM profile flow and deep links | QA-03 | Cross-page navigation and contextual state | Open `/crm`, create or find a voter, inspect `/crm/[id]`, then verify links into `/conversas` and campaign creation preserve context |
| Campaign lifecycle | QA-04 | Scheduling/send/monitor are workflow-driven | Create or edit a safe test campaign, validate segment selection/chip selection, schedule or send within safe bounds, then inspect monitor behavior |
| Dashboard queue and `/conversas` realtime behavior | QA-05 | Requires live stream lifecycle | Confirm dashboard queue updates, `/conversas` queue/thread behavior, empty states, reconnect handling, and no obvious render-loop regressions |
| Webhook ingress and agent reply persistence | QA-05 | Cross-request/event timing cannot be proven by static inspection | Trigger or simulate inbound activity and outbound reply, then verify persisted records appear in queue/thread and via stream updates |
| Compliance/admin/reporting | QA-06 | Includes exports and destructive safeguards | Exercise `/compliance`, `/admin`, and `/relatorios`, including export paths and confirmation flows |
| Responsive/empty/error states and final sign-off | QA-07, QA-08 | Release readiness is experiential | Smoke the main pages on narrower widths, verify empty states and auth failures, then classify final verdict and follow-up gaps |

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual-only coverage
- [x] Sampling continuity preserved across the 3 plans
- [x] Wave 0 prerequisites documented
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
