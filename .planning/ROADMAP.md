# EEL Eleicao — Roadmap

> Transform EEL from a chip warming dashboard into a full electoral WhatsApp campaign operations center.
> Visual direction: V2 Editorial Light (Radix Command). MVP-first, ship fast.

---

## Phase Overview

| Phase | Name | Priority | Depends On | Plans |
|-------|------|----------|------------|-------|
| 01 | V2 Shell + Design Tokens | — | — | 2 plans |
| 02 | DB Schema Expansion | — | — | 2 plans |
| 03 | Import + Segmentation | P0 | 01, 02 | TBD |
| 04 | Campaign Editor + Send | P0 | 02, 03 | TBD |
| 05 | Dashboard V2 + Chat Panel | P0/P1 | 01, 02, 04 | TBD |
| 06 | HITL Conversations + CRM | P1 | 02, 05 | TBD |
| 07 | Compliance + Admin | P2 | 02 | TBD |
| 08 | Reports + Polish | P2 | 04, 06 | TBD |
| 09 | Real Data + Integrations | P0 | 03, 04, 05, 06 | 9/9 complete |
| 10 | Real-Time Chat via SSE | P1 | 06, 09 | 3/3 complete |
| 11 | Full-System Verification + UAT Sweep | P0 | 10 | 3/3 complete |
| 12 | Campaign Personalization Completion | P0 | 04, 09, 11 | 3/3 complete |
| 13 | Zero-Pendency Release Closure | P0 | 11, 12 | 5 plans |

---

### Phase 01: V2 Shell + Design Tokens
**Status:** Not started
**Goal:** Replace existing layout shell with V2 Editorial Light direction — new sidebar, topbar, color tokens, typography, and component foundation

**Requirements:** [SHELL-01, SHELL-02, SHELL-03, SHELL-04]

- SHELL-01: V2 design tokens in CSS (warm white bg #F8F6F1, slate theme, compact density, serif headlines)
- SHELL-02: New SidebarLayout matching V2 wireframe (Brand + 8-item menu + footer with API status + block risk)
- SHELL-03: New Topbar with global search, period selector, critical alerts badge, user profile
- SHELL-04: Shared page layout component (sidebar + topbar + content area) reusable across all pages

**Plans:** 2 plans
Plans:
- [ ] 01-01-PLAN.md — V2 design tokens + sidebar electoral navigation
- [ ] 01-02-PLAN.md — V2 Topbar component + integration

---

### Phase 02: DB Schema Expansion
**Status:** Not started
**Goal:** Extend Supabase/Drizzle schema to support electoral features — voters, campaigns, segments, conversations, compliance, permissions

**Requirements:** [DB-01, DB-02, DB-03, DB-04, DB-05]

- DB-01: Voters table (name, cpf, phone, zone, section, tags[], engagement_score, opt_in_status, opt_in_date)
- DB-02: Campaigns table (name, template, variables, status, schedule, ab_variant, segment_id, stats)
- DB-03: Segments table (name, filters JSON, audience_count) + segment_voters junction
- DB-04: Conversations table (voter_id, status, assigned_agent, messages JSON[], handoff_reason, created_at)
- DB-05: Compliance tables (consent_logs, audit_trail) + users/roles tables (user, role, region_scope, permissions)

**Plans:** 2 plans
Plans:
- [ ] 02-01-PLAN.md — Electoral tables (voters, campaigns, segments) + CRUD libraries
- [ ] 02-02-PLAN.md — Conversations, compliance, users tables + API routes

---

### Phase 03: Import + Segmentation (P0)
**Status:** Not started
**Goal:** Working voter import flow (CSV upload → field mapping → validation → processing) and segment builder with AND/OR filters and audience preview

**Requirements:** [IMP-01, IMP-02, SEG-01, SEG-02]

- IMP-01: CSV upload stepper (Upload → Mapping → Validation → Processing) with required fields (name, phone, zone/section)
- IMP-02: Import validation (deduplication by phone, quality indicator, error panel, preview table)
- SEG-01: Visual filter builder (AND/OR logic) with demographic, behavioral, geographic tags
- SEG-02: Segment preview showing audience count, coverage, risk level + save segment action

**Plans:** TBD

---

### Phase 04: Campaign Editor + Send (P0)
**Status:** Not started
**Goal:** Full campaign creation flow — message editor with dynamic variables, WhatsApp preview, A/B testing, time-window scheduling, and real-time send monitoring

**Requirements:** [CAMP-01, CAMP-02, CAMP-03, CAMP-04]

- CAMP-01: Split-pane editor (left: message with {nome}, {bairro}, {interesse} variables, right: WhatsApp preview bubble)
- CAMP-02: CTA score checker, word counter (120 word limit), message quality indicators
- CAMP-03: A/B test toggle with split percentage, variant editor
- CAMP-04: Time-window scheduling (morning/afternoon/evening) + segment selector + send with real-time delivery monitoring

**Plans:** TBD

---

### Phase 05: Dashboard V2 + Chat Panel (P0/P1)
**Status:** Not started
**Goal:** Rebuild dashboard in V2 Editorial Light style with KPI row, operations table, command panel, and integrated chat queue panel — chat list with history visible directly in the dashboard

**Requirements:** [DASH-01, DASH-02, DASH-03, DASH-04, DASH-05]

- DASH-01: V2 KPI row (4 cards: delivered, opened, responses, blocks) with election-specific metrics
- DASH-02: Operations table (DataGrid style) showing active campaigns, delivery status, engagement metrics
- DASH-03: Command panel (right side) with quick actions — warm all, create campaign, import contacts, view compliance
- DASH-04: Chat queue panel (right side, below command panel) showing prioritized conversations with preview text
- DASH-05: Wizard onboarding steps (3-step: Import → Segment → Campaign) with AI recommendations and guided mode

**Plans:** TBD

---

### Phase 06: HITL Conversations + CRM (P1)
**Status:** Not started
**Goal:** Full conversation management — priority queue, active chat with voter context, handoff controls, voter CRM profile with engagement timeline

**Requirements:** [HITL-01, HITL-02, CRM-01, CRM-02]

- HITL-01: Three-column layout (left: priority queue, center: active chat, right: voter context + tags + history)
- HITL-02: Handoff controls (auto handoff with reason, pause bot during human reply, auto-return by timeout, agent/region distribution)
- CRM-01: Voter profile page (header with main data + engagement score, full interaction timeline, notes, checklist, next actions)
- CRM-02: Engagement scoring (hot/warm/cold), trigger-based follow-up suggestions, visit/event/donation/response checklist

**Plans:** TBD

---

### Phase 07: Compliance + Admin (P2)
**Status:** Not started
**Goal:** LGPD compliance module (opt-in tracking, anonymization, audit trail) and multi-user admin with role-based permissions scoped by region

**Requirements:** [LGPD-01, LGPD-02, ADM-01, ADM-02]

- LGPD-01: Consent management (active/expired/revoked opt-in cards, consent table, anonymization rules per profile)
- LGPD-02: Audit trail timeline with export, compliance status cards
- ADM-01: User management (list, roles: coordenador/cabo/voluntario, invite/remove)
- ADM-02: Permission matrix (module × action), region-scoped access, permission change log

**Plans:** TBD

---

### Phase 08: Reports + Polish (P2)
**Status:** Not started
**Goal:** Automated reports (daily/weekly performance, ROI, cost per contact), mobile offline capture, priority inbox, and final responsive/accessibility polish

**Requirements:** [REP-01, REP-02, MOB-01, MOB-02, POL-01]

- REP-01: Automated reports page (daily/weekly performance charts, ROI calculation, cost per engaged contact)
- REP-02: Exportable report data (PDF/CSV), scheduled email delivery
- MOB-01: Mobile offline capture form (minimal fields, offline/online indicator, local sync queue)
- MOB-02: Mobile priority inbox (urgent conversations, quick reply templates, handoff badge)
- POL-01: Final responsive pass, accessibility audit, performance optimization

**Plans:** TBD

---

### Phase 09: Real Data + Integrations
**Status:** Complete
**Goal:** Fix all mock data, broken flows, and missing integrations so every page uses real data and the chip-warming infrastructure connects to the electoral features. Includes two gap-closure plans after verification.

**Requirements:** [RD-01, RD-02, RD-03, RD-04, RD-05, RD-06, RD-07, RD-08, RD-09, RD-10, RD-11, RD-12, RD-13, RD-14, RD-15, RD-16, RD-17, RD-18, RD-19, RD-20, RD-21, RD-22, RD-23]

- RD-01: Webhook uses Drizzle DB imports (not old JSON-file @/lib/config and @/lib/chips)
- RD-02: Inbound WhatsApp messages stored in conversations table via webhook
- RD-03: Campaign send uses Evolution API (not setTimeout mock)
- RD-04: Campaign send resolves real segment voters (not hardcoded audienceSize=150)
- RD-05: Campaign editor has chip selector for choosing send chip
- RD-06: Agent replies in HITL chat sent via WhatsApp Evolution API
- RD-07: New conversation dialog has voter search + chip selector
- RD-08: DELETE handler for conversations
- RD-09: Voter API supports ?id= parameter for direct fetch
- RD-10: CRM has manual "Add voter" button with dialog form
- RD-11: CRM has delete voter functionality
- RD-12: CRM voter list supports pagination
- RD-13: Segment audience count from real voter query (not random)
- RD-14: Saving segment materializes voter IDs in segmentVoters table
- RD-15: Segment filter options from real voter data (not hardcoded)
- RD-16: Segments can be edited and deleted
- RD-17: Dashboard KPIs from real campaign aggregates (not hardcoded openRate=62)
- RD-18: Reports KPIs and bar chart from real DB data (not KPI_DATA/DAILY_BARS constants)
- RD-19: Monitor page delivery log shows real send progress
- RD-20: Campaign list shows segment name (not UUID)
- RD-21: Campaign edit page is functional (not stub redirect)
- RD-22: Voter profile "Ver conversas" filters by voterId
- RD-23: Voter profile "Criar campanha" pre-fills voter context

**Plans:** 9/9 plans complete
Plans:
- [x] 09-01-PLAN.md — Webhook + Inbound Pipeline (fix imports, store messages)
- [x] 09-02-PLAN.md — Campaign Send Pipeline (real Evolution API send, chip selector)
- [x] 09-03-PLAN.md — Conversations WhatsApp Integration (agent reply send, new convo dialog)
- [x] 09-04-PLAN.md — CRM Voter Operations (add/delete voter, pagination, ID fetch)
- [x] 09-05-PLAN.md — Segmentation Real Data (audience calc, materialization, edit/delete)
- [x] 09-06-PLAN.md — Dashboard + Reports Real Data (real KPIs, bar chart, monitor log)
- [x] 09-07-PLAN.md — Campaign Fixes + Voter Links (edit page, profile action links)
- [x] 09-08-PLAN.md — Delivery Orchestration Gaps (cron dispatch, delivery events, persisted monitor timeline)
- [x] 09-09-PLAN.md — CRM Single-Voter Segment Prefill (real voter segment handoff into campaign creation)

### Phase 10: Real-Time Chat via SSE

**Status:** Complete
**Goal:** Replace chat polling with authenticated SSE on the operator conversation surfaces so queue and active-thread updates arrive in near real time while database persistence remains the single source of truth.

**Requirements:** [RT-01, RT-02, RT-03, RT-04, RT-05]

- RT-01: Add an authenticated SSE route for conversations with queue/thread filters, heartbeat frames, abort handling, and cursor-based resume via `since`.
- RT-02: Back the stream with delta queries over persisted conversation/message timestamps so webhook ingress and agent replies fan out stored changes instead of introducing a second realtime source of truth.
- RT-03: Migrate `/conversas` off the 10s queue poll and 5s message poll, preserving initial REST bootstrap, reconnect/fallback behavior, and duplicate-safe state merges.
- RT-04: Migrate the dashboard `ChatQueuePanel` off its 15s polling loop by reusing the same conversation stream contract for the open-queue slice.
- RT-05: Keep the scope constrained to SSE-based chat surfaces only; unauthorized stream access must return `401`, and non-chat modules remain out of scope for this phase.

**Depends on:** Phase 06, Phase 09
**Plans:** 3/3 plans executed

Plans:
- [x] 10-01-PLAN.md — SSE backend foundation (delta queries, stream contract, authenticated route)
- [x] 10-02-PLAN.md — `/conversas` realtime migration (queue + active thread via SSE)
- [x] 10-03-PLAN.md — Dashboard queue realtime adoption (replace panel polling with shared stream)

### Phase 11: Full-System Verification + UAT Sweep

**Status:** Complete
**Goal:** Verify every shipped user flow and critical integration end-to-end, capture pass/fail evidence, and surface release-blocking gaps before milestone wrap-up.
**Requirements:** [QA-01, QA-02, QA-03, QA-04, QA-05, QA-06, QA-07, QA-08]
**Depends on:** Phase 10
**Plans:** 3/3 plans executed

Plans:
- [x] 11-01-PLAN.md — Baseline verification (auth, setup, settings, chips, contacts, clusters, history/warming)
- [x] 11-02-PLAN.md — Electoral core UAT (import, segmentation, CRM, campaigns, scheduling, monitor)
- [x] 11-03-PLAN.md — Realtime conversations + governance/reporting + final regression sign-off

- QA-01: Authentication, session handling, setup, and settings flows behave correctly on protected and unauthenticated paths.
- QA-02: Legacy operational modules still reachable in the shell (`chips`, `contacts`, `clusters`, `history`, warming/log surfaces) remain functional after the electoral expansion.
- QA-03: Electoral data flows work end-to-end from voter import through segment materialization and CRM lookup/edit actions.
- QA-04: Campaign lifecycle works end-to-end with safe verification data: create, edit, schedule, send, and monitor all behave as intended.
- QA-05: Dashboard queue and `/conversas` realtime operator flows behave correctly after the SSE migration, including inbound webhook fanout and outbound reply persistence.
- QA-06: Governance surfaces (`compliance`, `admin`, `relatorios`) work with real authenticated data, including exports and destructive-action safeguards.
- QA-07: Cross-cutting quality checks pass on the shipped product: empty states, deep links, API auth failures, responsive smoke, and obvious regression paths.
- QA-08: Phase output includes a durable verification ledger with PASS/FAIL/BLOCKED evidence plus a routed gap list for anything that fails.

### Phase 12: Campaign Personalization Completion

**Status:** Complete
**Goal:** Close the remaining campaign-editor personalization gaps so candidate configuration, variable insertion, preview rendering, draft persistence, scheduling, and outbound delivery all use one consistent contract.
**Requirements:** [PERS-01, PERS-02, PERS-03, PERS-04, PERS-05]
**Depends on:** Phase 04, Phase 09, Phase 11
**Plans:** 3/3 plans complete

Plans:
- [x] 12-01-PLAN.md — Candidate profile + shared variable contract foundation
- [x] 12-02-PLAN.md — Campaign editor, preview, and draft/edit validation alignment
- [x] 12-03-PLAN.md — Delivery-time interpolation parity + end-to-end campaign hardening

- PERS-01: Settings must expose a real candidate profile source of truth so operators can configure the candidate information used by campaign personalization.
- PERS-02: Campaign variable chips, preview substitutions, and saved campaign metadata must come from one shared registry instead of page-local mocks.
- PERS-03: The outbound send pipeline must resolve the same supported variables shown in the editor, including `{candidato}` and `{data}`, with explicit semantics for scheduled vs immediate sends.
- PERS-04: Campaign create/edit/schedule flows must validate unsupported or unconfigured placeholders before save/send and persist the variables actually referenced by the template.
- PERS-05: Manual verification must prove there is no preview/send mismatch and no raw personalization placeholders leak into delivered messages.

### Phase 13: Zero-Pendency Release Closure

**Status:** Complete
**Goal:** Close the remaining shell, authorization, CRM/mobile, reporting-automation, and production-parity gaps so the current milestone can finish with no unresolved pending items.
**Requirements:** [CLOSE-01, CLOSE-02, SEC-01, SEC-02, CRM-01, MOB-01, MOB-02, REP-02, REL-01, REL-02]
**Depends on:** Phase 11, Phase 12
**Plans:** 5/5 plans executed

Plans:
- [x] 13-01-PLAN.md — Shell/setup/dashboard contract cleanup
- [x] 13-02-PLAN.md — Authorization enforcement + real permissions contract
- [x] 13-03-PLAN.md — CRM persistence + mobile operator workflows
- [x] 13-04-PLAN.md — Report automation completion (PDF + scheduled email)
- [x] 13-05-PLAN.md — Production deploy + zero-pendency live sign-off

- CLOSE-01: The configured app shell must not expose demo-only topbar controls or setup dead ends that imply unsupported behavior.
- CLOSE-02: Dashboard/operator KPIs must either be sourced from real data or intentionally reduced when the product cannot support them.
- SEC-01: Protected APIs must enforce role/permission/region authorization, not only session authentication.
- SEC-02: Admin and operator UI affordances must reflect the actual permission contract and surface `403`-style access boundaries clearly.
- CRM-01: CRM voter notes/checklist must persist server-side so operators do not lose coordination context across devices or sessions.
- MOB-01: A mobile offline capture form must exist with queue/sync behavior into the existing voter pipeline.
- MOB-02: A mobile priority inbox flow must exist for urgent conversations, quick replies, and handoff visibility.
- REP-02: Reports must support complete export automation and scheduled email delivery from the product.
- REL-01: Current intended HEAD must be deployed to production with environment parity restored.
- REL-02: Final page-by-page live UAT must end with an explicit zero-pendency verdict, not another deferred backlog note.

---

## Dependency Graph

```
Phase 01 (Shell) ──────────────────────┐
                                       ├── Phase 05 (Dashboard V2)
Phase 02 (DB Schema) ─┬── Phase 03 ───┤
                       │   (Import)    ├── Phase 04 (Campaigns) ──┐
                       │               │                          ├── Phase 08 (Reports)
                       ├── Phase 07 ───┘                          │
                       │   (Compliance)                           │
                       └── Phase 06 (HITL/CRM) ───────────────────┘
```

## Wave Execution Plan

| Wave | Phases | Parallelizable |
|------|--------|----------------|
| 1 | 01 (Shell) + 02 (DB) | Yes — no file overlap |
| 2 | 03 (Import/Seg) | After DB schema exists |
| 3 | 04 (Campaigns) + 07 (Compliance) | After segments exist; compliance independent |
| 4 | 05 (Dashboard V2) | After shell + campaigns exist |
| 5 | 06 (HITL/CRM) | After dashboard + DB |
| 6 | 08 (Reports + Polish) | After campaigns + HITL |
| 7 | 09 (Real Data) → 10 (Realtime) → 11 (Verification/UAT) | Sequential hardening and release-readiness pass |

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Visual direction | V2 Editorial Light (Radix Command) | Selected by user from 4 Paper options |
| Existing stack | Keep Next.js 16 + shadcn + Drizzle | Already deployed and working |
| Chat location | Integrated in dashboard panel | User requirement — no separate chat page |
| User experience | Wizard + guided mode + microcopy | "Magical" product feel for non-technical operators |
| New shadcn components | Install as needed (Dialog, Sheet, Table, Tabs, Textarea, DataTable) | Many primitives currently missing |
| Form validation | Add zod + react-hook-form | Currently manual validation everywhere |
| Data fetching | Add SWR or React Query | Replace raw useEffect + fetch pattern |
