Status: planned

# Phase 11 Verification

Date: 2026-03-07
Phase goal: Verify every shipped user flow and critical integration end-to-end, capture PASS/FAIL/BLOCKED evidence, and surface release-blocking gaps before milestone wrap-up.

## Execution rules

- Record reality, not intent.
- Every covered surface must end as `PASS`, `FAIL`, `BLOCKED`, or `N/A` with justification.
- If an external dependency prevents validation, capture the exact dependency and stop short of guessing.
- Any material failure should be routed into explicit follow-up work after the sweep.

## Environment Under Test

- Target environment: pending
- Auth/session state: pending
- Safe test dataset: pending
- External dependency notes: pending

## Coverage Matrix

| Area | Surface | Requirement | Status | Evidence / Notes |
|------|---------|-------------|--------|------------------|
| Access | `/login`, protected routes, logout | QA-01 | ⬜ pending | |
| Baseline | `/setup` | QA-01 | ⬜ pending | |
| Baseline | `/settings` | QA-01 | ⬜ pending | |
| Operational | `/chips` + `/api/chips` + `/api/chips/sync` | QA-02 | ⬜ pending | |
| Operational | `/contacts` + `/api/contacts` | QA-02 | ⬜ pending | |
| Operational | `/clusters` + `/api/clusters` | QA-02 | ⬜ pending | |
| Operational | `/history` + `/api/warming` + `/api/logs` | QA-02 | ⬜ pending | |
| Electoral | `/segmentacao/importar` + `/api/voters/import` | QA-03 | ⬜ pending | |
| Electoral | `/segmentacao` + `/api/segments` | QA-03 | ⬜ pending | |
| Electoral | `/crm` + `/api/voters` | QA-03 | ⬜ pending | |
| Electoral | `/crm/[id]` + CRM deep links | QA-03 | ⬜ pending | |
| Campaigns | `/campanhas` + `/api/campaigns` | QA-04 | ⬜ pending | |
| Campaigns | `/campanhas/nova` | QA-04 | ⬜ pending | |
| Campaigns | `/campanhas/[id]/editar` | QA-04 | ⬜ pending | |
| Campaigns | `/campanhas/[id]/agendar` + `/api/cron/campaigns` | QA-04 | ⬜ pending | |
| Campaigns | Scheduling UX parity (window, velocity, persisted behavior) | QA-04 | ⬜ pending | |
| Campaigns | `/campanhas/[id]/monitor` + `/api/campaigns/[id]/send` | QA-04 | ⬜ pending | |
| Campaigns | Monitor cancel/send-state coherence + chip routing | QA-04 | ⬜ pending | |
| Realtime | `/` dashboard KPI + `ChatQueuePanel` | QA-05 | ⬜ pending | |
| Realtime | `/conversas` | QA-05 | ⬜ pending | |
| Realtime | `/api/conversations/stream` auth + reconnect behavior | QA-05 | ⬜ pending | |
| Realtime | `/api/webhook` + `/api/conversations/[id]/messages` propagation | QA-05 | ⬜ pending | |
| Governance | `/compliance` + `/api/compliance` | QA-06 | ⬜ pending | |
| Governance | `/admin` + `/api/users` | QA-06 | ⬜ pending | |
| Governance | `/relatorios` | QA-06 | ⬜ pending | |
| Cross-cutting | Deep links, empty states, auth failures, responsive smoke | QA-07 | ⬜ pending | |
| Cross-cutting | KPI consistency across dashboard, monitor, and reports | QA-07 | ⬜ pending | |
| Outcome | Final verdict + routed gap list | QA-08 | ⬜ pending | |

## Blockers

- None recorded yet.

## Gap Routing

| Severity | Surface | Finding | Reproduction / Evidence | Proposed follow-up |
|----------|---------|---------|--------------------------|--------------------|
| pending | pending | pending | pending | pending |

## Final Verdict

- Verdict: pending
- Release blockers: pending
- Recommended next action: pending
