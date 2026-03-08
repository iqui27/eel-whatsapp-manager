Status: complete

# Phase 11 Verification

Date: 2026-03-08
Phase goal: Verify every shipped user flow and critical integration end-to-end, capture PASS/FAIL/BLOCKED evidence, and surface release-blocking gaps before milestone wrap-up.

## Execution rules

- Record reality, not intent.
- Every covered surface must end as `PASS`, `FAIL`, `BLOCKED`, or `N/A` with justification.
- If an external dependency prevents validation, capture the exact dependency and stop short of guessing.
- Any material failure should be routed into explicit follow-up work after the sweep.
- This file is the single verification ledger for Phase 11; plan summaries reference it instead of duplicating evidence.

## Environment And Assumptions

- Target environment: production deployment at `https://zap.iqui27.app`
- Runtime mode: live production app behind Cloudflare/nginx with PM2 runtime on `193.187.129.114`
- Auth/session state at start: no valid cookie in this shell; authentication must be established and proven during this sweep
- Safe test dataset constraints: no broad sends, no config mutations without necessity, no destructive edits outside tightly scoped verification actions, and no assumptions about provider-backed flows until observed
- External dependency notes: production config exists in Supabase; provider-backed flows use Evolution API and may have real side effects when exercised
- Existing unrelated worktree changes intentionally left untouched: `src/app/chips/page.tsx` plus prior untracked `.planning` artifacts

## Auth / Session Baseline

Goal: prove `/login`, protected-route behavior, and logout semantics before any deeper UAT work.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| `/login` page load | Renders without prior session and exposes login flow | ✅ PASS | Playwright load on `https://zap.iqui27.app/login` returned title `EEL - WhatsApp Manager` and one password field. |
| Invalid login | Rejects bad credentials without creating a session | ✅ PASS | `POST /api/auth/login` with `0000` returned `401` and `{\"error\":\"Senha incorreta\"}`. |
| Valid login | Creates a session and unlocks protected routes | ✅ PASS | `POST /api/auth/login` with production password returned `200` plus `Set-Cookie: auth=...`; authenticated `GET /` returned `200`. |
| Protected route redirect | Anonymous access redirects to `/login` | ✅ PASS | Anonymous `GET /` and `GET /settings` returned `307`; anonymous `GET /api/settings` and `GET /api/chips` returned `401`. |
| Logout | Clears session and re-locks protected routes | ✅ PASS | `POST /api/auth/logout` returned `200`, cleared `auth` cookie, and subsequent `GET /api/settings` returned `401`. |

## Setup / Settings Baseline

Goal: prove the prerequisites that later plans depend on.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| `/setup` | Loads and can persist baseline environment config safely enough for later flows | ✅ PASS | `GET /api/setup` returned `{\"configured\":true}` and `POST /api/setup` returned `403 Sistema já configurado`; authenticated `/setup` page still renders the wizard copy even on a configured instance. |
| `/settings` | Loads current settings and persists edits or returns a precise blocker | ⛔ BLOCKED | `/settings` page loads, `GET /api/settings` returns masked key, and `POST /api/settings` test-connection returned `200` with `6 instância(s)`; `PUT /api/settings` was intentionally not exercised to avoid mutating live production config. |
| Chip/session prerequisite state | Any required readiness for provider-backed flows is explicit | ✅ PASS | `GET /api/chips` returned live chips and settings connection test succeeded against Evolution API; provider-backed flows can be attempted in later plans. |

## Legacy Operational Modules

Goal: account for every legacy operational surface still shipped in the shell.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| `/chips` + `/api/chips` + `/api/chips/sync` | Loads chip state and surfaces auth/provider failures clearly | ⛔ BLOCKED | `/chips` page loads and `GET /api/chips` returns live records; `POST /api/chips/sync` was not exercised to avoid mutating live chip statuses during baseline verification. |
| `/contacts` + `/api/contacts` | Loads contact list and auth behavior cleanly | ✅ PASS | `/contacts` page loads and authenticated `GET /api/contacts` returned `200 []`. |
| `/clusters` + `/api/clusters` | Loads clusters and supports baseline CRUD affordances or reports blockers clearly | ✅ PASS | `/clusters` page loads and authenticated `GET /api/clusters` returned `200 []`. |
| `/history` + `/api/warming` + `/api/logs` | Loads warming/log history or reports missing prerequisites explicitly | ❌ FAIL | `/history` page loads and `GET /api/logs` returned `200 []`, but authenticated `GET /api/warming` immediately returned warming `results` and triggered live warming actions during what should have been a read-safe baseline smoke. |

## Electoral Core UAT

Goal: validate the connected operator workflow from import and segmentation through CRM handoffs and the start of the campaign lifecycle.

Environment note:

- Production deploy at `https://zap.iqui27.app` is behind the current repository head for core electoral routes.
- To verify the current code, local HEAD was run on `http://127.0.0.1:3005` against the same target Supabase database.
- This exposed both deploy-drift findings and target-database schema blockers; both are part of the product reality and are recorded below.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| `/segmentacao/importar` + `/api/voters/import` | Small safe CSV import completes with coherent preview/process results | ✅ PASS | On local HEAD, imported one voter tagged `phase11-local-1772938674029`; `POST /api/voters/import` returned `201 {"imported":1,"duplicates":0,"total":1}` and the browser page rendered `Importar Eleitores`. |
| `/segmentacao` + `/api/segments` | Filter options, preview, save, edit, and materialized audience counts work coherently | ✅ PASS | Local HEAD returned live filter options, `POST /api/segments?action=preview` returned `200 {"count":2}`, segment create returned `201`, update returned `200`, and `/segmentacao` rendered the edited segment with the expected audience. |
| `/crm` + `/api/voters` | Search, pagination, create, and edit actions work against real data | ✅ PASS | Local HEAD `POST /api/voters` created a manual voter, `PUT /api/voters` updated it, `GET /api/voters?search=PHASE11...` returned paginated `{data,total,page,limit}`, and `/crm` rendered both imported/manual Phase 11 entries. |
| `/crm/[id]` profile rendering | Profile page loads the voter and related compliance data without crashing | ✅ PASS | Local HEAD `/crm/c3650546-375a-468b-95ba-1ad3a0553fd8` rendered the profile header and `GET /api/voters?id=...` plus `GET /api/compliance?voterId=...` both returned `200`. |
| CRM deep links (`/conversas?voterId=...`, CRM → campaign creation, single-voter segment) | Contextual handoffs preserve voter context and land in working downstream flows | ❌ FAIL | Local HEAD preserved CRM → `/campanhas/nova` context and `POST /api/segments/from-voter` returned `201` with a single-voter segment, but `/api/conversations?voterId=...` returned `500` because target DB table `conversations` is missing `chip_id`; production deploy also returned HTML `404` for `/api/segments/from-voter`, proving parity drift. |
| `/campanhas` + `/api/campaigns` | Campaign list renders with real data and segment-name resolution | ❌ FAIL | On local HEAD, `GET /api/campaigns` returned `500 {"error":"Erro ao carregar campanhas"}` and server logs showed `PostgresError: column "chip_id" does not exist` on table `campaigns`; browser `/campanhas` loaded shell chrome but the data API failed. |
| `/campanhas/nova` | Campaign creation honors chip/segment/voter context and persists safely scoped draft data | ❌ FAIL | Local HEAD `/campanhas/nova?...source=crm` rendered `Nova Campanha`, but `POST /api/campaigns` returned `500 {"error":"Erro ao adicionar campanha"}` due to missing `campaigns.chip_id` in the target DB. |
| `/campanhas/[id]/editar` | Existing campaign can be loaded and edited, subject to read-only guards | ⛔ BLOCKED | No campaign could be created on local HEAD because the target DB schema is behind; edit flow could not be reached with a valid current-head campaign ID. |
| `/campanhas/[id]/agendar` + `/api/cron/campaigns` | Schedule persistence and operator intent can be verified with safe test data | ⛔ BLOCKED | Scheduling could not be exercised because current-head campaign creation failed before any campaign ID existed. |
| Scheduling UX parity (window, velocity, persisted behavior) | Visible scheduling controls match the stored behavior | ⛔ BLOCKED | Same upstream blocker as above: no current-head campaign record could be persisted on the target DB. |
| `/campanhas/[id]/monitor` + `/api/campaigns/[id]/send` | Monitor and send checkpoints can be validated without uncontrolled audience impact | ⛔ BLOCKED | Monitor/send path remained unreachable because campaign creation failed at the DB layer; safe send was intentionally not forced against real audiences. |
| Monitor cancel/send-state coherence + chip routing | Monitor state, cancellation semantics, and selected chip stay consistent | ⛔ BLOCKED | Could not validate because no campaign could be persisted on current HEAD and the production deploy is behind the campaign context changes. |

## Realtime Operator Flows

Goal: re-verify dashboard/chat behavior after the SSE rollout and recent hotfixes.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| `/` dashboard KPI + `ChatQueuePanel` | Dashboard loads, KPIs render, and queue panel reflects live open conversations coherently | ❌ FAIL | Production dashboard page loaded without browser errors, but current HEAD against the target DB issued `GET /api/campaigns 500` and `GET /api/conversations?status=open 500`; the dashboard shell still rendered, but realtime queue data was not healthy on the release candidate. |
| `/conversas` | Queue, empty state, and active-thread area render without destabilizing the UI | ❌ FAIL | Current HEAD browser smoke rendered the page shell plus empty states, but showed `Reconectando tempo real (1)` while server logs showed `GET /api/conversations?status=open 500` and stream bootstrap failure on missing `conversations.chip_id`. Production `/conversas` page now opens without the earlier React depth crash, but that deploy is behind current code. |
| `/api/conversations/stream` auth + reconnect behavior | Anonymous access returns `401`; authenticated stream emits initial frames and remains stable | ❌ FAIL | Anonymous stream access returned `401` on both production and local HEAD. Production authenticated stream emitted `connected` and `snapshot.ready` frames. Current HEAD local stream returned HTTP `200` but emitted no frames because the initial delta query failed on missing `conversations.chip_id`; server log recorded `[GET /api/conversations/stream] ... column "chip_id" does not exist`. |
| `/api/webhook` + `/api/conversations/[id]/messages` propagation | Inbound webhook and outbound reply behavior can be observed against persisted operator views | ⛔ BLOCKED | `GET /api/webhook` returned `{"status":"ok","message":"Webhook endpoint"}`, but end-to-end propagation was not safely re-proven after the target-db conversation schema blocker surfaced. Current HEAD conversation reads and stream bootstrap already fail before propagation can be trusted. |

## Governance And Reporting

Goal: verify shipped governance/reporting surfaces, including destructive safeguards where safe test data makes that possible.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| `/compliance` + `/api/compliance` | Consent cards, history, revoke/anonymize paths, and audit timeline behave coherently | ❌ FAIL | Current HEAD `/compliance` crashed in the browser with `TypeError: voters.filter is not a function`, because the page assumes `/api/voters` returns an array while the API now returns paginated data. The APIs themselves worked on safe test data: `GET /api/compliance?stats=1` returned `200`, `GET /api/compliance?all=1` returned `200 []`, `POST /api/compliance` recorded a revoke, and `/api/voters` `PUT` anonymized the Phase 11 voter. Production `/compliance` page still loads because deployed `/api/voters` is older and returns a raw array. |
| `/admin` + `/api/users` | User list, role updates, enable/disable, invite/remove, and auth safeguards behave correctly | ✅ PASS | Current HEAD `/admin` rendered without browser errors, `GET /api/users` returned `200 []`, a safe Phase 11 test user was created, updated to `coordenador` with `enabled:false`, and deleted successfully via the API. Production anonymous `GET /api/users` returned `401`, confirming auth guard behavior. |
| `/relatorios` | KPI cards, chart/table, and CSV export path render without runtime errors | ❌ FAIL | Production `/relatorios` triggered a minified React `#418` page error. Current HEAD `/relatorios` triggered a hydration mismatch around the SVG `<title>` in the bar chart and also logged `GET /api/campaigns 500` because the target DB is missing `campaigns.chip_id`. CSV export cannot be signed off while the page has runtime and data-layer failures. |

## Cross-Cutting Checks

Goal: close the sweep with regression-oriented checks that span multiple modules.

| Surface | Expected behavior | Status | Evidence / Notes |
|---------|-------------------|--------|------------------|
| Deep links, empty states, auth failures, responsive smoke | Common navigation paths, empty states, narrow-width rendering, and auth guards stay coherent | ❌ FAIL | Responsive smoke on current HEAD at mobile width showed no horizontal overflow on `/`, `/crm`, and `/conversas`; `/conversas` empty state rendered cleanly; anonymous `/api/users` and anonymous `/api/conversations/stream` returned `401`. However, CRM → conversations deep link broke on current HEAD because conversation reads fail, and production parity drift means some deep-link contracts are not deployed. |
| KPI consistency across dashboard, monitor, and reports | Shared campaign metrics agree across major operator surfaces | ⛔ BLOCKED | Current HEAD campaign APIs fail on missing `campaigns.chip_id`, preventing monitor/report consistency checks, and production `/relatorios` has a React runtime error. |

## Coverage Matrix

| Area | Surface | Requirement | Status | Evidence / Notes |
|------|---------|-------------|--------|------------------|
| Access | `/login`, protected routes, logout | QA-01 | ✅ PASS | Auth and route protection behave as expected on production. |
| Baseline | `/setup` | QA-01 | ✅ PASS | Configured environment rejects re-setup with `403`, though the wizard UI still renders publicly. |
| Baseline | `/settings` | QA-01 | ⛔ BLOCKED | Read/test-connection path verified; write mutation skipped on live production config. |
| Operational | `/chips` + `/api/chips` + `/api/chips/sync` | QA-02 | ⛔ BLOCKED | Read path verified; sync mutation intentionally skipped on production. |
| Operational | `/contacts` + `/api/contacts` | QA-02 | ✅ PASS | UI and API both loaded cleanly. |
| Operational | `/clusters` + `/api/clusters` | QA-02 | ✅ PASS | UI and API both loaded cleanly. |
| Operational | `/history` + `/api/warming` + `/api/logs` | QA-02 | ❌ FAIL | `/api/warming` uses stateful `GET`, making read-safe baseline verification impossible without side effects. |
| Electoral | `/segmentacao/importar` + `/api/voters/import` | QA-03 | ✅ PASS | Current HEAD import flow completed against safe Phase 11 test data. |
| Electoral | `/segmentacao` + `/api/segments` | QA-03 | ✅ PASS | Preview/save/edit/materialization all behaved coherently on current HEAD. |
| Electoral | `/crm` + `/api/voters` | QA-03 | ✅ PASS | Search, pagination, create, and edit all worked on current HEAD. |
| Electoral | `/crm/[id]` + CRM deep links | QA-03 | ❌ FAIL | Profile page loaded, but conversation deep link broke on current HEAD and production is missing `/api/segments/from-voter`. |
| Campaigns | `/campanhas` + `/api/campaigns` | QA-04 | ❌ FAIL | Target DB is missing `campaigns.chip_id`, so current-head campaigns API returns `500`. |
| Campaigns | `/campanhas/nova` | QA-04 | ❌ FAIL | UI renders, but create action fails at the DB layer on current HEAD. |
| Campaigns | `/campanhas/[id]/editar` | QA-04 | ⛔ BLOCKED | No current-head campaign record could be created to enter edit flow. |
| Campaigns | `/campanhas/[id]/agendar` + `/api/cron/campaigns` | QA-04 | ⛔ BLOCKED | Upstream campaign-create failure prevented schedule verification. |
| Campaigns | Scheduling UX parity (window, velocity, persisted behavior) | QA-04 | ⛔ BLOCKED | Could not be observed without a valid persisted campaign. |
| Campaigns | `/campanhas/[id]/monitor` + `/api/campaigns/[id]/send` | QA-04 | ⛔ BLOCKED | Upstream campaign-create failure prevented monitor/send verification. |
| Campaigns | Monitor cancel/send-state coherence + chip routing | QA-04 | ⛔ BLOCKED | Same upstream blocker; no campaign state to compare. |
| Realtime | `/` dashboard KPI + `ChatQueuePanel` | QA-05 | ❌ FAIL | Current HEAD dashboard depends on APIs that now fail on target-schema drift. |
| Realtime | `/conversas` | QA-05 | ❌ FAIL | Page no longer crashes, but current-head data/bootstrap is broken on the target DB. |
| Realtime | `/api/conversations/stream` auth + reconnect behavior | QA-05 | ❌ FAIL | Anonymous auth guard passes, but authenticated current-head stream cannot bootstrap on the target DB. |
| Realtime | `/api/webhook` + `/api/conversations/[id]/messages` propagation | QA-05 | ⛔ BLOCKED | Upstream conversation-schema failure prevented safe end-to-end proof. |
| Governance | `/compliance` + `/api/compliance` | QA-06 | ❌ FAIL | APIs work, but current-head page crashes on a voter-response contract mismatch. |
| Governance | `/admin` + `/api/users` | QA-06 | ✅ PASS | UI and API CRUD/auth path passed with safe Phase 11 test data. |
| Governance | `/relatorios` | QA-06 | ❌ FAIL | Production React error and current-head hydration/data failures block sign-off. |
| Cross-cutting | Deep links, empty states, auth failures, responsive smoke | QA-07 | ❌ FAIL | Mobile responsiveness/auth checks passed, but deep-link integrity does not. |
| Cross-cutting | KPI consistency across dashboard, monitor, and reports | QA-07 | ⛔ BLOCKED | Campaign/report surfaces cannot be compared coherently yet. |
| Outcome | Final verdict + routed gap list | QA-08 | ✅ PASS | Sweep now ends with explicit blockers, evidence, and follow-up routing. |

## Blockers And Environment Notes

- Production was used for this baseline because the current local shell did not have a working `DATABASE_URL`/session setup.
- `PUT /api/settings` and `POST /api/chips/sync` were intentionally skipped to avoid mutating live production configuration or chip state during baseline verification.
- Authenticated `GET /api/warming` produced real warming results in production; subsequent plans should treat that endpoint as mutating, not informational.
- Current HEAD was then verified locally against the target Supabase database at `http://127.0.0.1:3005` so that the code under review could be exercised even though the production deploy is behind.
- Target database schema is missing `campaigns.chip_id` and `conversations.chip_id`; this is not hypothetical drift, it was confirmed directly via `information_schema.columns`.
- Production deploy drift is real: production `/api/voters` still returns a raw array, production `POST /api/segments?action=preview` rejected the request as if older validation rules were deployed, and production `/api/segments/from-voter` returned HTML `404`.
- Safe Phase 11 verification records were cleaned up after evidence capture: 8 test voters, 5 test segments, 3 `segment_voters` links, and 1 consent log were removed from the target database.

## Gap Routing

| Severity | Surface | Finding | Reproduction / Evidence | Proposed follow-up |
|----------|---------|---------|--------------------------|--------------------|
| medium | `/api/warming` | Authenticated `GET` request triggers warming side effects instead of acting as a read-safe status endpoint. | During baseline API smoke, `GET https://zap.iqui27.app/api/warming` returned warming `results` and executed live warming behavior. | Convert warming trigger to `POST`-only or introduce a separate read-only status/history endpoint; keep `/history` on non-mutating reads. |
| low | `/setup` | Configured production still renders the setup wizard UI publicly even though the setup API rejects reconfiguration. | Authenticated browser visit to `/setup` rendered the 3-step wizard while `POST /api/setup` returned `403 Sistema já configurado`. | Replace the configured-state page with a redirect or explicit "already configured" screen. |
| critical | target database schema | Current code expects `campaigns.chip_id` and `conversations.chip_id`, but the target Supabase database does not have those columns. | Direct `information_schema.columns` query showed the columns are absent; local HEAD `GET /api/campaigns`, `POST /api/campaigns`, `GET /api/conversations`, `GET /api/conversations?voterId=...`, and SSE bootstrap all failed with `PostgresError: column "chip_id" does not exist`. | Apply the missing DB migration before any release/readiness sign-off; rerun campaign and realtime verification after the schema matches the code. |
| critical | production deploy parity | Production is behind the repository head for core electoral flows, so shipped behavior does not match the current planned product contract. | Production `/api/voters?page=1&limit=1` returned a raw array, `POST /api/segments?action=preview` returned `400 name e filters são obrigatórios`, and `/api/segments/from-voter` returned HTML `404`, while current HEAD implements paginated voters, preview payloads, and single-voter segment creation. | Redeploy the intended build before treating production smoke as representative of the current roadmap. |
| high | `/compliance` | Current-head compliance page is broken by a response-shape mismatch with `/api/voters`. | Local browser on `http://127.0.0.1:3005/compliance` threw `TypeError: voters.filter is not a function`; page code assumes an array while `GET /api/voters` now returns `{data,total,page,limit}`. | Update the page to read the paginated voter payload correctly, then rerun compliance UI verification. |
| high | `/relatorios` | Reports page is not release-ready due React runtime/hydration issues. | Production `/relatorios` emitted minified React `#418`; local HEAD emitted a hydration mismatch around the SVG `<title>` plus `GET /api/campaigns 500`. | Fix the SVG/title hydration issue, then rerun reports verification after the campaign schema blocker is resolved. |

## Final Verdict

- Verdict: release not ready
- Release blockers:
  - target database missing `campaigns.chip_id` and `conversations.chip_id`
  - production deploy is behind current roadmap-critical routes
  - current-head `/compliance` page crashes at runtime
  - `/relatorios` has unresolved React runtime/hydration errors
  - `/api/warming` still performs side effects on `GET`
- Recommended next action: treat this phase as a completed verification sweep, then plan/execute explicit gap-closure work before milestone wrap-up or any new release claim.
