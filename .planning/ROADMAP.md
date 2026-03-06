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
| 09 | 9/9 | Complete   | 2026-03-06 | 9 plans |
| 10 | Real-Time Chat via SSE | In Progress | 06, 09 | 1/3 |

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

**Status:** Planned
**Goal:** Replace chat polling with authenticated SSE on the operator conversation surfaces so queue and active-thread updates arrive in near real time while database persistence remains the single source of truth.

**Requirements:** [RT-01, RT-02, RT-03, RT-04, RT-05]

- RT-01: Add an authenticated SSE route for conversations with queue/thread filters, heartbeat frames, abort handling, and cursor-based resume via `since`.
- RT-02: Back the stream with delta queries over persisted conversation/message timestamps so webhook ingress and agent replies fan out stored changes instead of introducing a second realtime source of truth.
- RT-03: Migrate `/conversas` off the 10s queue poll and 5s message poll, preserving initial REST bootstrap, reconnect/fallback behavior, and duplicate-safe state merges.
- RT-04: Migrate the dashboard `ChatQueuePanel` off its 15s polling loop by reusing the same conversation stream contract for the open-queue slice.
- RT-05: Keep the scope constrained to SSE-based chat surfaces only; unauthorized stream access must return `401`, and non-chat modules remain out of scope for this phase.

**Depends on:** Phase 06, Phase 09
**Plans:** 1/3 plans executed

Plans:
- [x] 10-01-PLAN.md — SSE backend foundation (delta queries, stream contract, authenticated route)
- [ ] 10-02-PLAN.md — `/conversas` realtime migration (queue + active thread via SSE)
- [ ] 10-03-PLAN.md — Dashboard queue realtime adoption (replace panel polling with shared stream)

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
