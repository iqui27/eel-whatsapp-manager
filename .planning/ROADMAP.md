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
| 31 | Diagnostic Fixes | P0 | 30 | 5/5 complete ✅ |
| 32 | System Logs & Observability | P1 | 31 | 3/3 complete ✅ |
| 36 | 1/1 | Complete    | 2026-03-20 | 1 plan |
| 37 | 1/1 | Complete    | 2026-03-20 | 1 plan |
| 38 | 2/2 | Complete    | 2026-03-20 | 2 plans |
| 39 | 2/2 | Complete    | 2026-03-20 | 2 plans |
| 40 | 2/2 | Complete    | 2026-03-20 | 2 plans |
| 41 | 2/2 | Complete    | 2026-03-20 | 2 plans |
| 42 | Groups Polish + Conversion Tracking | Complete    | 2026-03-21 | 2 plans (1/2 complete) |
| 43 | 2/2 | In Progress|  | 2 plans |

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

**Plans:** 2 plans
Plans:
- [ ] 42-01-PLAN.md — Cache invalidation on group creation + group card layout fix
- [ ] 42-02-PLAN.md — Member voter name enrichment + webhook auto opt-in

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

## Milestone 2: Mass Messaging Operations (100K Leads)

> Transform EEL from a campaign editor into a full-scale mass messaging operations center.
> 100K leads across sectors (advogados, mães, casamento comunitário, etc.), WhatsApp group funnels, chip rotation, AI-powered lead analysis.

| Phase | Name | Priority | Depends On | Plans |
|-------|------|----------|------------|-------|
| 14 | Chip Health & Connection Reliability | P0 | 13 | 2 plans |
| 15 | Mass Messaging Engine | P0 | 14 | 3 plans |
| 16 | WhatsApp Group Management | P0 | 14, 15 | 2 plans |
| 17 | Delivery Tracking & Conversion Funnel | P0 | 15, 16 | 2 plans |
| 18 | AI Lead Analysis (Gemini) | P1 | 17 | 2 plans |
| 19 | Operations Dashboard Rebuild | P0 | 14, 15, 16, 17 | 3 plans |
| 20 | Critical Fixes | P0 | 19 | 1 plan |
| 21 | Campaign-Group Integration | P0 | 16, 19 | 7 plans |
| 22 | Full UI/UX Polishing | P0 | 21 | 8 plans (3 waves) |

---

### Phase 14: Chip Health & Connection Reliability
**Status:** Not started
**Goal:** Rock-solid chip connection monitoring — reliable health checks combining heartbeat polling + webhook events, auto-restart on disconnect, proper status tracking in DB, and a completely rewritten Evolution API wrapper that supports all v2 endpoints needed for mass messaging.

**Requirements:** [CHIP-01, CHIP-02, CHIP-03, CHIP-04, CHIP-05, CHIP-06]

- CHIP-01: Rewrite evolution.ts to support all v2 endpoints (sendText with delay/linkPreview, sendMedia, group CRUD, instance restart, connectionState, fetchInstances, connect/QR)
- CHIP-02: Reliable health check combining connectionState polling (30s) + webhook CONNECTION_UPDATE events + lastWebhookTimestamp staleness detection (>2min = degraded)
- CHIP-03: Extended chip status enum: healthy, degraded, cooldown, quarantined, banned, warming_up, disconnected (replace current 3-state connected/disconnected/warming)
- CHIP-04: Chip health cron endpoint (/api/cron/chip-health) that polls all instances every 30s, auto-restarts disconnected ones, tracks daily/hourly message counters
- CHIP-05: Webhook handler for CONNECTION_UPDATE with statusReason codes (200=ok, 401=logged out, 408=timeout, 515=restart needed)
- CHIP-06: Chips page UI showing real-time connection status with color indicators (🟢🟡🔴⛔🔵⚫), last seen timestamp, messages sent today/hour, daily limit progress bar

**Plans:** 2 plans
Plans:
- [ ] 14-01-PLAN.md — Evolution API v2 full wrapper + chip health backend (cron, extended statuses, webhook)
- [ ] 14-02-PLAN.md — Chips page UI rebuild with real-time health indicators

---

### Phase 15: Mass Messaging Engine
**Status:** COMPLETE ✅
**Goal:** Queue-based message delivery system with chip rotation, rate limiting, anti-ban protections (random delays 15-60s, message variation, daily/hourly caps per chip), segment-to-chip affinity, and graceful failover when a chip gets banned.

**Requirements:** [MASS-01, MASS-02, MASS-03, MASS-04, MASS-05, MASS-06, MASS-07]

- MASS-01: Message queue table (message_queue) with status lifecycle: queued→assigned→sending→sent→delivered→read→failed→retry
- MASS-02: Chip router that selects healthiest available chip with segment affinity, load balancing, and minimum 15s delay enforcement
- MASS-03: Queue processor cron (/api/cron/send-queue) that dequeues messages respecting per-chip hourly/daily limits, time windows (09:00-20:00), and random delays (15-60s between messages)
- MASS-04: Campaign-to-queue hydration — when campaign starts, resolve segment voters and enqueue all messages with template variables pre-resolved
- MASS-05: Automatic chip failover — when chip gets quarantined/banned, un-assign its pending messages and re-route to healthy chips
- MASS-06: Message variation engine — spintax resolution, greeting rotation, emoji variation, structural variation to avoid hash detection
- MASS-07: Per-chip counters (messagesSentToday, messagesSentThisHour, lastMessageAt) with daily reset cron, and configurable limits based on chip warm-up phase

**Plans:** 3 plans (3/3 complete)
Plans:
- [x] 15-01-PLAN.md — Message queue schema + chip router + queue processor cron
- [x] 15-02-PLAN.md — Campaign hydration + message variation engine
- [x] 15-03-PLAN.md — Chip failover + counter management + anti-ban protections

---

### Phase 16: WhatsApp Group Management
**Status:** COMPLETE ✅
**Goal:** Full WhatsApp group lifecycle — create groups via Evolution API, assign specific admins, generate invite links, monitor capacity (max 1024), auto-create overflow groups when full, and a management panel showing all groups with member counts and links.

**Requirements:** [GRP-01, GRP-02, GRP-03, GRP-04, GRP-05, GRP-06]

- GRP-01: Groups table in DB (whatsapp_groups) storing: groupJid, name, inviteUrl, inviteCode, campaignId, segmentTag, chipInstanceName, currentSize, maxSize (1024), status (active/full/archived), admins[], createdAt
- GRP-02: API endpoints for group CRUD — create group (via Evolution API), fetch invite link, check capacity, add admins (promote), revoke old invite when full
- GRP-03: Auto-overflow logic — when group reaches 90% capacity (920+), auto-create a new group with same admins and update the campaign's invite link for subsequent messages
- GRP-04: Campaign integration — each campaign/segment gets assigned group(s), messages include the current active invite link, link automatically updates when group overflows
- GRP-05: GROUP_PARTICIPANTS_UPDATE webhook handler — track joins/leaves, update currentSize, detect when group is full
- GRP-06: Groups management page (/grupos) with: group list (name, size bar, invite link copy, status badge), create group dialog (name, description, admins to add), member count real-time updates

**Plans:** 2 plans (2/2 complete)
Plans:
- [x] 16-01-PLAN.md — Groups DB schema + Evolution API group endpoints + overflow logic + webhook handler
- [x] 16-02-PLAN.md — Groups management page UI + campaign group integration

---

### Phase 17: Delivery Tracking & Conversion Funnel
**Status:** COMPLETE ✅
**Goal:** Complete delivery lifecycle tracking via MESSAGES_UPDATE webhook (pending→server_ack→delivered→read), reply detection correlated back to campaigns, group join tracking as conversion event, and a visual funnel showing sent→delivered→read→replied→joined→converted per campaign.

**Requirements:** [TRACK-01, TRACK-02, TRACK-03, TRACK-04, TRACK-05]

- TRACK-01: MESSAGES_UPDATE webhook handler — parse status codes (0=error, 1=pending, 2=server_ack, 3=delivered, 4=read, 5=played), update message_queue records with deliveredAt/readAt timestamps
- TRACK-02: Campaign reply correlation — when MESSAGES_UPSERT arrives, check if sender has a queued/sent message from an active campaign, increment campaign.totalReplied
- TRACK-03: Group join as conversion — when GROUP_PARTICIPANTS_UPDATE fires with action=add, look up which campaign sent that lead the invite link, record as conversion event
- TRACK-04: Conversion funnel visualization component — stacked bar or Sankey showing per-campaign: Total→Sent→Delivered→Read→Replied→Clicked→Joined Group, with percentages at each step
- TRACK-05: Campaign detail page with delivery timeline (events over time), per-chip breakdown, block/error rate alerts

**Plans:** 2 plans (2/2 complete)
Plans:
- [x] 17-01-PLAN.md — Webhook handlers for MESSAGES_UPDATE + reply correlation + group join tracking
- [x] 17-02-PLAN.md — Conversion funnel UI + campaign detail delivery analytics

---

### Phase 18: AI Lead Analysis (Gemini)
**Status:** COMPLETE ✅
**Goal:** Gemini Flash integration for real-time response analysis (sentiment, intent, auto-tags) when leads reply, plus nightly batch profiling for lead scoring (hot/warm/cold), with results feeding back into the CRM and segmentation system.

**Requirements:** [AI-01, AI-02, AI-03, AI-04, AI-05]

- AI-01: Gemini API integration module (src/lib/gemini.ts) using gemini-2.0-flash for real-time analysis and batch profiling
- AI-02: Real-time analysis trigger — when lead replies (MESSAGES_UPSERT), call Gemini to classify sentiment, detect intent, suggest tags, and recommend next action (follow_up/send_offer/add_to_group/escalate/remove)
- AI-03: Auto-tagging pipeline — Gemini-suggested tags written to voter.tags[] in DB, feeding into segmentation filters
- AI-04: Nightly batch profiling cron — score all leads without recent analysis, assign tier (hot/warm/cold/dead), predict best contact time, update engagementScore
- AI-05: AI insights panel in CRM voter profile — show Gemini's analysis summary, confidence level, suggested next actions, conversation sentiment timeline

**Plans:** 2 plans (2/2 complete)
Plans:
- [x] 18-01-PLAN.md — Gemini module + real-time response analysis + auto-tagging pipeline
- [x] 18-02-PLAN.md — Batch profiling cron + AI insights CRM panel

---

### Phase 19: Operations Dashboard Rebuild
**Status:** COMPLETE ✅
**Goal:** Rebuild the main dashboard as a real-time operations center — chip health overview, active send progress, group capacity grid, conversion metrics, message history feed, alerts panel, and fix all currently broken visualization features.

**Requirements:** [OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06, OPS-07]

- OPS-01: Chip health overview section — grid of all chips with status indicators (🟢🟡🔴), messages sent today/limit, connection quality, one-click restart
- OPS-02: Active campaigns send progress — live progress bars per campaign showing queued/sending/delivered/failed with ETA
- OPS-03: Group capacity grid — all WhatsApp groups with fill bars (current/1024), quick-create overflow, copy invite link
- OPS-04: Conversion KPIs — real numbers from delivery tracking: total sent, delivered rate, read rate, reply rate, group join rate, with sparklines
- OPS-05: Message feed — real-time scrolling feed of recent sent/received messages with chip, lead name, status icon, timestamp
- OPS-06: Alerts panel — chip disconnected, chip near daily limit, group near capacity, high block rate, campaign stalled
- OPS-07: Fix broken message visualization, connection status indicator, and all dashboard features flagged as non-functional

**Plans:** 3 plans (3/3 complete)
Plans:
- [x] 19-01-PLAN.md — Chip health grid + active campaign progress bars + alerts panel
- [x] 19-02-PLAN.md — Group capacity grid + conversion KPIs + message feed
- [x] 19-03-PLAN.md — Fix broken dashboard features + final integration polish

---

### Phase 20: Critical Fixes
**Status:** COMPLETE
**Goal:** Fix broken visualizations, connection status, message feed, and group capacity displays across the operations dashboard and related components.

**Requirements:** [FIX-01, FIX-02, FIX-03, FIX-04]

- FIX-01: Fix Evolution API connection visualization with 5min stale threshold
- FIX-02: Message feed includes inbound messages with real-time 10s auto-refresh
- FIX-03: GroupCapacityGrid with real data and segment-to-group mapping
- FIX-04: Auto-admin promotion on group creation

**Plans:** 1 plan (1/1 complete)
Plans:
- [x] 20-01-PLAN.md — Fix all broken dashboard features

---

### Phase 21: Campaign-Group Integration
**Status:** COMPLETE
**Goal:** Full campaign-group integration with segment-based group management, setup wizard, dashboard enhancements, and message history analytics.

**Requirements:** [INT-01, INT-02, INT-03, INT-04, INT-05, INT-06, INT-07]

- INT-01: Schema enhancement with segmentTag field and segment-chip-group mapping
- INT-02: Campaign queue integration with {link_grupo} resolution and group auto-creation
- INT-03: Automatic group overflow detection and creation
- INT-04: Chip failover enhancement with fallback chain
- INT-05: 5-step setup wizard with QR code scan and progress persistence
- INT-06: Dashboard enhancement with tooltips, status cards, quick actions, keyboard shortcuts
- INT-07: Message history with search, export, analytics charts

**Plans:** 7 plans (7/7 complete)
Plans:
- [x] 21-01-PLAN.md — Schema enhancement
- [x] 21-02-PLAN.md — Campaign queue integration
- [x] 21-03-PLAN.md — Automatic group overflow
- [x] 21-04-PLAN.md — Chip failover enhancement
- [x] 21-05-PLAN.md — Setup wizard implementation
- [x] 21-06-PLAN.md — Dashboard enhancement
- [x] 21-07-PLAN.md — Message history & analytics

---

### Phase 22: Full UI/UX Polishing
**Status:** In Progress (Wave 1 complete, Waves 2-3 planned)
**Goal:** Production-ready UI cleanup across every page — fix broken navigation, text truncation, loading state bugs, orphaned pages without app shell, mobile nav errors, silent error handling, inconsistent component usage, and overall visual professionalism across all pages.

**Requirements:** [NAV-01, NAV-02, NAV-03, NAV-04, NAV-05, DASH-01, DASH-02, DASH-03, OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, CAMP-UX-01, CAMP-UX-02, SEG-UX-01, SEG-UX-02, CONV-UX-01, CONV-UX-02, CONV-UX-03, CRM-UX-01, CRM-UX-02, CRM-UX-03, REP-UX-01, COMP-UX-01, ADM-UX-01, ADM-UX-02, TOP-UX-01, TOP-UX-02, CLEANUP-01]

- NAV-01: Dashboard compiles without references to removed operations tab
- NAV-02: Every page renders inside SidebarLayout with correct sidebar/topbar/bottom-nav
- NAV-03: Mobile bottom nav shows correct 5 items (Dashboard, Campanhas, Conversas, CRM, Relatorios)
- NAV-04: Sidebar does not show deprecated Contatos or Clusters items
- NAV-05: All internal links use Next.js Link component, not `<a href>`
- DASH-01: Dashboard right column wide enough for ChatQueuePanel (320px)
- DASH-02: Granular per-endpoint error toasts for API failures
- DASH-03: No NaN in KPI cards (division by zero guard)
- OPS-01: ChipHealthGrid uses colored dots and table layout (no emojis)
- OPS-02: Campaign names are not truncated in progress bars
- OPS-03: Group names are not truncated in capacity grid
- OPS-04: Loading vs empty state correctly differentiated (no perpetual spinners)
- OPS-05: Real voter count in NextActionsPanel
- CAMP-UX-01: Campaign list shows error toast on API failure (not silent catch)
- CAMP-UX-02: Campaign template preview uses line-clamp + title instead of truncate+max-w
- SEG-UX-01: Segmentation delete uses AlertDialog instead of window.confirm
- SEG-UX-02: Segmentation dropdowns use shadcn Select instead of raw HTML select elements
- CONV-UX-01: Conversations right panel is 320px wide (matching dashboard)
- CONV-UX-02: Priority indicators use text labels not emoji
- CONV-UX-03: New conversation dialog uses shadcn Dialog component (not custom overlay)
- CRM-UX-01: CRM page shows error toasts on API failures
- CRM-UX-02: AlertDialog components use valid shadcn props (no size/variant on Action/Content)
- CRM-UX-03: Tags column displays properly without overflow
- REP-UX-01: Reports page shows error/success toasts, loading skeleton for schedules, AlertDialog for removal
- COMP-UX-01: Compliance revoke action has confirmation dialog and error/success toasts
- ADM-UX-01: Admin page shows success/error toasts for all 5 mutation types
- ADM-UX-02: Admin remove user uses AlertDialog with destructive styling
- TOP-UX-01: Topbar period section shows current date (not static placeholder)
- TOP-UX-02: Topbar session section shows user context (not hardcoded "Sessao ativa")
- CLEANUP-01: Orphaned chip-health-grid.tsx uncommitted changes are committed or reverted

**Depends on:** Phase 21
**Plans:** 8 plans in 3 waves

Plans:
- [x] 22-01-PLAN.md — Fix broken navigation (dashboard ops tab removal, mobile nav, orphaned pages)
- [x] 22-02-PLAN.md — Dashboard polish (wider right column, granular error toasts)
- [x] 22-03-PLAN.md — Professionalize Operacoes (text truncation, loading states, voter count)
- [ ] 22-04-PLAN.md — Campanhas + Segmentacao UX polish (error toasts, AlertDialog, shadcn Select, loading)
- [ ] 22-05-PLAN.md — Conversas overhaul (right panel width, no-emoji priority, shadcn Dialog, mobile)
- [ ] 22-06-PLAN.md — CRM polish (error toasts, valid AlertDialog props, tag overflow)
- [ ] 22-07-PLAN.md — Reports + Compliance + Admin polish (toasts, confirmation dialogs, loading states)
- [ ] 22-08-PLAN.md — Topbar content + orphaned changes cleanup

---

## Milestone 3: Professional UI/UX Overhaul

> Make every page production-ready with professional layout, real data connections, user guidance, and consistent UX patterns.
> No more cut text, broken layouts, missing features, or silent errors. Every page teaches the user how to use it.

| Phase | Name | Priority | Depends On | Plans |
|-------|------|----------|------------|-------|
| 23 | Critical Layout & Navigation Foundation | P0 | 22 | 2 plans |
| 24 | Operations Unification & Professionalization | P0 | 23 | 2 plans |
| 25 | Conversas System Overhaul | P0 | 23 | 3 plans |
| 26 | Campanhas & Segmentacao UX | P0 | 23 | 2 plans |
| 27 | CRM Overhaul | P0 | 23 | 2 plans |
| 28 | Relatorios Professionalization | P1 | 23 | 2 plans |
| 29 | Configuracoes & Perfil | P1 | 23 | 2 plans |
| 30 | Header, Cleanup & Final Polish | P1 | 24-29 | 2 plans |

---

### Phase 23: Critical Layout & Navigation Foundation
**Status:** Not started
**Goal:** Fix foundational layout problems that affect every page — topbar overflow on medium screens, dashboard chat queue scroll, orphaned pages missing SidebarLayout, and height calculations that don't account for topbar/bottom-nav. This is the base that all other phases depend on.

**Requirements:** [LAY-01, LAY-02, LAY-03, LAY-04, LAY-05]

- LAY-01: Topbar sections use flex-shrink and responsive widths instead of fixed px — no overflow on screens < 1200px
- LAY-02: Dashboard right panel has proper max-height with overflow-y-auto — chat queue does not get cut off
- LAY-03: All pages that use `h-[calc(100vh-Xrem)]` account for actual topbar height (74px) and mobile bottom nav (64px)
- LAY-04: /wizard page wrapped in SidebarLayout (currently raw div with p-6)
- LAY-05: /setup page uses theme tokens instead of hardcoded hex colors (#0B1220, #A1A1AA)

**Depends on:** Phase 22
**Plans:** 2 plans

Plans:
- [ ] 23-01-PLAN.md — Topbar responsive fix + dashboard chat queue scroll
- [ ] 23-02-PLAN.md — Orphaned page wrappers + setup theme tokens + height calc fixes

---

### Phase 24: Operations Unification & Professionalization
**Status:** Not started
**Goal:** Unify the operations page with the most recent component versions, professionalize ALL operations sub-components — remove emojis from chip health, fix CSS bugs in TrafficLightIndicator, fix text truncation with fixed widths, add real auto-refresh to message feed, fix Portuguese accents, and make quick actions panel actually useful with relevant context.

**Requirements:** [OPSV2-01, OPSV2-02, OPSV2-03, OPSV2-04, OPSV2-05, OPSV2-06, OPSV2-07, OPSV2-08]

- OPSV2-01: ChipHealthGrid uses professional colored dots/badges (no emoji indicators), clean table layout with proper column widths
- OPSV2-02: MessageFeed columns use flexible widths (not fixed w-16/w-24 that clip text), auto-refresh actually implemented (10s interval)
- OPSV2-03: SystemStatusCard TrafficLightIndicator uses modern CSS (flex/grid, not float-left + negative margin)
- OPSV2-04: All Portuguese text has proper accents (Saudavel→Saudável, Atencao→Atenção, etc.)
- OPSV2-05: QuickActionsPanel shows contextual info for each action (e.g. "3 chips offline" not just "Ver Chips"), import link points to correct route
- OPSV2-06: HelpPanel has real support email (not suporte@exemplo.com) and help links point to actual documentation/guides
- OPSV2-07: Operations page uses the latest component versions (same as what dashboard operations tab used before removal)
- OPSV2-08: All operations components have consistent card styling, proper spacing, and no text overflow

**Depends on:** Phase 23
**Plans:** 2 plans

Plans:
- [ ] 24-01-PLAN.md — ChipHealthGrid + MessageFeed + SystemStatusCard professionalization
- [ ] 24-02-PLAN.md — QuickActions contextual info + HelpPanel cleanup + Operations page unification

---

### Phase 25: Conversas System Overhaul
**Status:** Not started
**Goal:** Complete rethink of the conversations system for lead campaign workflows — fix message feed reliability (silent errors causing messages to appear/disappear), surface Gemini AI analysis (tags, sentiment, tier, recommendations) in conversation context, fix priority inbox navigation, add message search, and ensure the system works as the primary lead engagement interface.

**Requirements:** [CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06, CONV-07, CONV-08, CONV-09]

- CONV-01: Message loading has proper error handling with retry — no silent catch blocks that cause messages to disappear
- CONV-02: SSE streaming is reliable — messages arrive in real-time without needing manual refresh, reconnect on disconnect
- CONV-03: Voter context panel shows Gemini AI analysis: sentiment badge, tier (hot/warm/cold), recommended action, auto-tags, analysis summary
- CONV-04: Tags system works — voter tags visible in conversation list and context panel, editable inline
- CONV-05: Priority inbox button navigates to correct filtered view (not a different page)
- CONV-06: Message search — search across conversations by content, voter name, or phone
- CONV-07: Lead campaign context — conversations show which campaign originated the lead, campaign status, and conversion funnel position
- CONV-08: Conversation list shows AI tier badge (hot/warm/cold dot) and last message preview with timestamp
- CONV-09: Mobile layout works — single column with queue/chat toggle, voter context accessible via slide-over

**Depends on:** Phase 23
**Plans:** 3 plans

Plans:
- [ ] 25-01-PLAN.md — Message feed reliability fix + SSE hardening + error handling
- [ ] 25-02-PLAN.md — Gemini AI integration in conversation context + tags system fix
- [ ] 25-03-PLAN.md — Lead campaign context + message search + priority inbox fix + mobile layout

---

### Phase 26: Campanhas & Segmentacao UX
**Status:** Not started
**Goal:** Transform campaign and segmentation pages from bare lists into guided workflows — add pagination/search/filters to campaigns, make segment creation discoverable with a prominent button, add onboarding guides that teach users the workflow, and unify both flows with the Setup Wizard so there's one coherent path.

**Requirements:** [CAMPV2-01, CAMPV2-02, CAMPV2-03, CAMPV2-04, SEGV2-01, SEGV2-02, SEGV2-03, SEGV2-04]

- CAMPV2-01: Campaign list has pagination (20 per page), search by name, filter by status (all/draft/scheduled/sending/sent), sort by date
- CAMPV2-02: Campaign page has onboarding guide — feature overview cards explaining: create campaign, choose segment, write message, schedule/send, monitor
- CAMPV2-03: Campaign creation flow is unified with Setup Wizard step — wizard "Criar Campanha" step links to /campanhas/nova with context preserved
- CAMPV2-04: Empty state shows actionable CTA ("Crie sua primeira campanha") with link to guided flow
- SEGV2-01: Prominent "Novo Segmento" button at top of page (not buried in filter builder)
- SEGV2-02: Segmentation page has onboarding guide — explains what segments are, how filters work, what audience preview means
- SEGV2-03: Segmentation flow unified with Setup Wizard — wizard "Criar Segmento" step links to /segmentacao with creation mode active
- SEGV2-04: Saved segments table shows campaign usage count and last used date

**Depends on:** Phase 23
**Plans:** 2 plans

Plans:
- [ ] 26-01-PLAN.md — Campanhas pagination + search + filters + onboarding guide + empty state
- [ ] 26-02-PLAN.md — Segmentacao create button + onboarding guide + wizard unification + usage stats

---

### Phase 27: CRM Overhaul
**Status:** Not started
**Goal:** Transform CRM from a simple voter list into a rich lead management interface — add inline editing, surface all AI analysis fields (tier, sentiment, summary, recommended action), improve forms with all DB fields, add tag/opt-in filters, bulk actions, and data export.

**Requirements:** [CRMV2-01, CRMV2-02, CRMV2-03, CRMV2-04, CRMV2-05, CRMV2-06]

- CRMV2-01: Voter list shows AI tier badge (hot/warm/cold/dead colored dot), sentiment indicator, and engagement score — not just name/phone/tags
- CRMV2-02: Inline edit mode — click voter row to expand inline editor with all fields (name, phone, zone, section, tags, opt-in status)
- CRMV2-03: Add voter form includes ALL DB fields: name, phone, cpf, zone, section, neighborhood, tags[], notes, optInStatus
- CRMV2-04: Filter by: AI tier (hot/warm/cold/dead), opt-in status (active/expired/revoked), tags, zone, engagement score range
- CRMV2-05: Bulk actions — select multiple voters for: bulk tag, bulk delete, bulk export, bulk add to segment
- CRMV2-06: Export voters to CSV with all fields including AI analysis data

**Depends on:** Phase 23
**Plans:** 2 plans

Plans:
- [ ] 27-01-PLAN.md — AI fields display + inline editing + enriched add form
- [ ] 27-02-PLAN.md — Filters + bulk actions + CSV export

---

### Phase 28: Relatorios Professionalization
**Status:** Not started
**Goal:** Replace hand-built SVG charts with a proper chart library (recharts), add responsive sizing, tooltips, hover states, axis labels, and create new visualization types: line charts for trends, comparison views, and conversion funnel from delivery tracking data.

**Requirements:** [REPV2-01, REPV2-02, REPV2-03, REPV2-04]

- REPV2-01: Install recharts and replace hand-built SVG bar chart with responsive BarChart component with tooltips, axis labels, and hover states
- REPV2-02: Add LineChart for campaign performance trends over time (sent, delivered, read, replied per day)
- REPV2-03: Add conversion funnel visualization using delivery tracking data (Sent→Delivered→Read→Replied→Joined Group)
- REPV2-04: All charts are responsive (resize with container), have proper legends, and work on mobile

**Depends on:** Phase 23
**Plans:** 2 plans

Plans:
- [ ] 28-01-PLAN.md — Install recharts + replace SVG bar chart + add line chart
- [ ] 28-02-PLAN.md — Conversion funnel visualization + responsive polish + mobile charts

---

### Phase 29: Configuracoes & Perfil
**Status:** Not started
**Goal:** Rework the settings page to use theme tokens and support all current features (Gemini API key, notification preferences, campaign defaults, chip configuration), and create a new profile page where the user can manage their own account (name, username, email, password).

**Requirements:** [CFG-01, CFG-02, CFG-03, PRF-01, PRF-02, PRF-03]

- CFG-01: Settings page uses theme tokens (not hardcoded hex colors) and renders correctly in both light and dark mode
- CFG-02: Settings sections cover: candidate profile, Gemini API key, Evolution API config, notification preferences, campaign defaults (time window, delay range), chip warming settings
- CFG-03: Settings page accessible via /configuracoes route (Portuguese) with redirect from /setup for backward compatibility
- PRF-01: New /perfil page with user profile form: display name, username, email (read-only), password change (current + new + confirm)
- PRF-02: Profile page shows user role, permissions summary, and last login timestamp
- PRF-03: Profile page accessible from sidebar navigation and topbar user section

**Depends on:** Phase 23
**Plans:** 2 plans

Plans:
- [ ] 29-01-PLAN.md — Settings page rework (theme tokens, all feature sections)
- [ ] 29-02-PLAN.md — New profile page (form, password change, role display, navigation links)

---

### Phase 30: Header, Cleanup & Final Polish
**Status:** Not started
**Goal:** Final sweep — verify header search/filter/alerts are functional, remove all deprecated routes and duplicate pages, fix placeholder content, and do a cross-page consistency audit to ensure every page has the same professional quality level.

**Requirements:** [HDR-01, HDR-02, HDR-03, CLN-01, CLN-02, CLN-03, CLN-04]

- HDR-01: Topbar search is functional — searches across voters, campaigns, segments, conversations (or shows clear "coming soon" if not ready)
- HDR-02: Topbar date filter is functional — filters data on the current page by selected date range (or is removed if not applicable)
- HDR-03: Topbar alerts badge shows real alert count from operations alerts system
- CLN-01: Remove duplicate routes: /historico and /history — keep only one
- CLN-02: Remove or redirect deprecated routes: /contacts → /crm, /clusters → removed
- CLN-03: Replace all placeholder content (suporte@exemplo.com, help links to wrong pages)
- CLN-04: Cross-page consistency audit — every page has: proper SidebarLayout wrapper, error toasts, loading states, empty states, Portuguese accents, no text truncation, no emoji in status indicators

**Depends on:** Phases 24-29
**Plans:** 2 plans

Plans:
- [ ] 30-01-PLAN.md — Header search + date filter + alerts verification/fix
- [ ] 30-02-PLAN.md — Route cleanup + placeholder fixes + cross-page consistency audit

---

### Milestone 3 Dependency Graph

```
Phase 23 (Layout Foundation) ──┬── Phase 24 (Operations) ──────────────┐
                                ├── Phase 25 (Conversas) ───────────────┤
                                ├── Phase 26 (Campanhas/Seg) ───────────┤
                                ├── Phase 27 (CRM) ─────────────────────┼── Phase 30 (Final Polish)
                                ├── Phase 28 (Relatorios) ──────────────┤
                                └── Phase 29 (Config/Perfil) ───────────┘
```

### Milestone 3 Wave Execution Plan

| Wave | Phases | Parallelizable |
|------|--------|----------------|
| 1 | 23 (Layout Foundation) | Must be first — fixes base layout for all pages |
| 2 | 24 + 25 + 26 + 27 + 28 + 29 | All parallel — each touches different page files |
| 3 | 30 (Final Polish) | After all pages are individually polished |

---

## Milestone 4: Diagnostic Fixes & Feature Gaps

> Fix critical bugs found during diagnostic sweep and close feature gaps across Groups, CRM, History, and Opt-in automation.

| Phase | Name | Priority | Depends On | Plans |
|-------|------|----------|------------|-------|
| 31 | 5/5 | Complete   | 2026-03-19 | 5 plans (2 waves) |

---

### Phase 31: Diagnostic Fixes
**Status:** Planned
**Goal:** Fix CRM critical bugs (inline edit, overflow, missing AI display, missing segments), enhance Groups UX (admin promotion, voter picker), improve Message History (empty state, inbound messages), and add opt-in automation (keyword detection in webhook).

**Requirements:** [DIAG-01, DIAG-02, DIAG-03, DIAG-04, DIAG-05, DIAG-06, DIAG-07, DIAG-08, DIAG-09, DIAG-10]

- DIAG-01: CRM inline edit PUT sends voter.id in request body (currently silently fails with 400)
- DIAG-02: CRM table overflow-hidden replaced with overflow-x-auto for horizontal scroll
- DIAG-03: CRM detail page displays AI analysis data (tier, sentiment, summary, recommended action, confidence)
- DIAG-04: CRM voter list and detail page show segment associations per voter via bulk JOIN query
- DIAG-05: CreateGroupDialog includes admin phones field and voter search picker for participants
- DIAG-06: Groups API POST calls updateParticipant('promote') for admin phones after group creation
- DIAG-07: Message History empty state shows contextual guidance with campaign CTA
- DIAG-08: Message History API supports inbound messages from conversationMessages table with direction filter
- DIAG-09: Webhook detects opt-in keywords (SIM/ACEITO/CONCORDO) and logs consent automatically
- DIAG-10: Webhook detects opt-out keywords (SAIR/PARAR/CANCELAR) and revokes consent with confirmation reply

**Depends on:** Phase 30
**Status:** Complete ✅
**Plans:** 5/5 plans complete

Plans:
- [x] 31-01-PLAN.md — CRM Critical Fixes (inline edit bug, overflow, tags, AI card)
- [x] 31-02-PLAN.md — CRM Segment Display (bulk query, table column, detail card)
- [x] 31-03-PLAN.md — Groups UX Improvements (admin field, voter picker, API promotion)
- [x] 31-04-PLAN.md — Message History Enhancement (empty state, inbound support, direction filter)
- [x] 31-05-PLAN.md — Opt-in Automation (keyword detection, consent logging, confirmation reply)

### Phase 31 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 31-01, 31-03, 31-04, 31-05 | Yes | No file overlaps between plans |
| 2 | 31-02 | — | Depends on 31-01 (both touch CRM files) |

---

### Phase 32: System Logs & Observability
**Status:** Complete ✅
**Goal:** Add full system observability via a structured logs page — track webhook events, Gemini AI calls, errors, and operational events with filterable UI and CSV export. Fix performance regression caused by per-call DB inserts exhausting connection pool.

**Requirements:** [OBS-01, OBS-02, OBS-03, OBS-04, OBS-05]

- OBS-01: system_logs table with level/category/message/meta/duration_ms columns + indexes
- OBS-02: Batch logger library (in-memory buffer, 2s flush, SYSLOG_MIN_LEVEL env guard)
- OBS-03: GET /api/system-logs with filters: level, category, search, from/to, limit
- OBS-04: /logs UI page with filter pills, search, date range, expandable JSON, auto-refresh, CSV export
- OBS-05: Webhook and Gemini instrumented; routine messages demoted to debug level

**Depends on:** Phase 31
**Plans:** 3/3 plans complete

Plans:
- [x] 32-01-PLAN.md — System Logs Infrastructure (DB table, logger lib, API, instrumentation)
- [x] 32-02-PLAN.md — Logs UI Page (filter pills, search, table, auto-refresh, CSV export)
- [x] 32-03-PLAN.md — Performance Fixes (batch writer, logs page debounce + appliedRef)

---

## Milestone 5: Performance Optimization

> Fix all performance bottlenecks identified in the comprehensive audit — bundle size, auth caching, polling, SSE, DB queries.

| Phase | Name | Priority | Depends On | Plans |
|-------|------|----------|------------|-------|
| 33 | Performance Optimization | P0 | 32 | 4/4 complete ✅ |
| 34 | Remaining Performance Hardening | P0 | 33 | 4 plans (1 wave) |
| 35 | 5/6 | In Progress|  | 6 plans (3 waves) |

---

### Phase 33: Performance Optimization
**Status:** Planned
**Goal:** Eliminate the top performance bottlenecks across bundle, auth, polling, SSE, and database layers — reduce initial JS bundle by ~60KB, eliminate redundant DB queries via auth session cache, stop background tab polling, optimize SSE from 1.5s to 5s with voter caching, and add SQL-level pagination for voters.

**Requirements:** [PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06, PERF-07, PERF-08, PERF-09, PERF-10, PERF-11, PERF-12]

- PERF-01: next.config.ts has optimizePackageImports for lucide-react, radix-ui, recharts, date-fns
- PERF-02: Dead dependencies pg, @types/pg, @supabase/supabase-js removed from package.json
- PERF-03: framer-motion removed from template.tsx critical path (CSS animation replacement)
- PERF-04: recharts lazy-loaded via next/dynamic on /relatorios page only
- PERF-05: Auth session cache with 60s TTL eliminates DB round trips on repeated API calls
- PERF-06: Expired session purge moved from login-time to lazy background task
- PERF-07: All 6 client-side polling intervals pause when browser tab is hidden
- PERF-08: SSE poll interval increased from 1.5s to 5s
- PERF-09: SSE voter lookups cached per-cycle and trackedConversationIds capped
- PERF-10: voters.createdAt and conversations.updatedAt indexes added
- PERF-11: filterVoters() supports SQL-level LIMIT/OFFSET pagination
- PERF-12: /api/voters uses SQL pagination instead of JS slice of full table

**Depends on:** Phase 32
**Plans:** 4/4 plans complete

Plans:
- [ ] 33-01-PLAN.md — Config, Bundle & Dead Code Cleanup (next.config, dead deps, framer-motion, recharts lazy)
- [ ] 33-02-PLAN.md — Auth Session Cache (in-memory TTL cache, lazy purge)
- [ ] 33-03-PLAN.md — Polling Hardening + SSE Optimization (visibility guards, SSE interval, voter cache)
- [ ] 33-04-PLAN.md — DB Query Optimization (missing indexes, SQL pagination for voters)

### Phase 33 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 33-01, 33-02, 33-03 | Yes | No file overlaps between plans |
| 2 | 33-04 | — | Depends on 33-03 (SSE optimization context) |

---

### Phase 34: Remaining Performance Hardening
**Status:** Planned
**Goal:** Close the remaining performance gaps — add cron overlap protection + maxDuration to all 8 cron routes, cap SSE connections (3/user, 50 global) with server-side max lifetime, cache SidebarLayout fetches via SWR to stop redundant requests on navigation, and add a daily log retention cron.

**Requirements:** [CRONPERF-01, CRONPERF-02, CRONPERF-03, CRONPERF-04, CRONPERF-05, CRONPERF-06]

- CRONPERF-01: cron_locks DB table with atomic upsert-based locking (name, locked_at, expires_at)
- CRONPERF-02: All 8 cron routes export maxDuration and wrap business logic in withCronLock to prevent concurrent execution
- CRONPERF-03: SSE connections capped at 3 per user and 50 globally with 429 responses for excess
- CRONPERF-04: SSE connections auto-close after 5 minutes server-side (client reconnects seamlessly)
- CRONPERF-05: SidebarLayout uses SWR with dedupingInterval for /api/auth/session (60s) and /api/chips (30s) — no raw useEffect fetches
- CRONPERF-06: Daily log-cleanup cron deletes system_logs older than 30 days, registered in vercel.json

**Depends on:** Phase 33
**Plans:** 4 plans

Plans:
- [ ] 34-01-PLAN.md — Cron overlap protection (DB lock table + withCronLock wrapper + maxDuration for all 8 crons)
- [ ] 34-02-PLAN.md — SSE connection limits (per-user + global cap + server max lifetime)
- [ ] 34-03-PLAN.md — SidebarLayout SWR caching (install SWR + replace raw fetches)
- [ ] 34-04-PLAN.md — Log retention cron (daily cleanup + vercel.json registration)

### Phase 34 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 34-01, 34-02, 34-03, 34-04 | Yes | No file overlaps between plans |

---

### Phase 35: Campaign Management Overhaul
**Status:** COMPLETE ✅
**Goal:** Fix critical campaign bugs (double sidebar, invisible logs), expand campaign DB schema for per-campaign send configuration, build send config UI, refactor send queue to read per-campaign config with anti-ban protections (presence simulation, rest pauses, circuit breaker), add proxy management per chip, and create an anti-ban monitoring dashboard within campaign detail.

**Requirements:** [CMPFIX-01, CMPFIX-02, CMPFIX-03, CMPFIX-04, CMPFIX-05, CMPFIX-06, CMPFIX-07, CMPFIX-08, CMPFIX-09, CMPFIX-10, CMPFIX-11, CMPFIX-12, CMPFIX-13, CMPFIX-14, CMPFIX-15, CMPFIX-16, CMPFIX-17]

- CMPFIX-01: Campaign sub-pages (edit, monitor, schedule) render exactly ONE sidebar (fix double sidebar layout bug)
- CMPFIX-02: SYSLOG_MIN_LEVEL defaults to 'info' so cron activity is visible in /logs page
- CMPFIX-03: All 8 cron routes instrumented with syslog (start, end, error logging)
- CMPFIX-04: Campaigns table has send configuration columns (batchSize, delays, sendRate, typing delays, limits)
- CMPFIX-05: Campaigns table supports multi-chip selection via selectedChipIds array with chipStrategy
- CMPFIX-06: Chips table has proxy configuration columns (proxyHost, proxyPort, proxyProtocol, proxyUsername, proxyPassword)
- CMPFIX-07: Campaign creation form has "Configuração de Envio" section with speed presets (Lento/Normal/Rápido)
- CMPFIX-08: Campaign scheduling page saves real time windows to DB (not decorative buttons)
- CMPFIX-09: Multi-chip selection UI shows chip health status and daily usage next to each chip
- CMPFIX-10: Send queue reads per-campaign config (batch size, delays, time windows) instead of hardcoded constants
- CMPFIX-11: Typing presence simulation (configurable delay) runs before each message send
- CMPFIX-12: Rest pauses and long breaks inserted at configurable intervals during send
- CMPFIX-13: Circuit breaker pauses campaign if error rate exceeds configurable threshold
- CMPFIX-14: Chips page has proxy configuration per chip with persistence and Evolution API pass-through
- CMPFIX-15: Evolution API createInstance passes proxy config and sets alwaysOnline=false
- CMPFIX-16: Campaign detail page shows anti-ban status panel with per-chip warm-up, usage, error rates
- CMPFIX-17: Campaign detail page shows circuit breaker status and smart recommendations

**Depends on:** Phase 34
**Plans:** 6/6 plans complete ✅

Plans:
- [x] 35-01-PLAN.md — Quick fixes: double sidebar bug + system logger default to 'info' + instrument all 8 crons
- [x] 35-02-PLAN.md — Campaign DB schema expansion (send config fields + proxy fields on chips) + migration 0013
- [x] 35-03-PLAN.md — Campaign send config UI (speed presets, real time windows, multi-chip selection)
- [x] 35-04-PLAN.md — Send queue intelligence (per-campaign config, presence simulation, rest pauses, circuit breaker)
- [x] 35-05-PLAN.md — Proxy management (chips page UI + Evolution API proxy pass-through)
- [x] 35-06-PLAN.md — Anti-ban dashboard (per-chip warm-up status, error rates, circuit breaker, recommendations)

### Phase 35 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 35-01, 35-02 | Yes | Quick fixes + schema — no file overlaps |
| 2 | 35-03, 35-04 | Yes | UI + queue logic — no file overlaps |
| 3 | 35-05, 35-06 | Yes | Proxy + anti-ban dashboard — no file overlaps |

---

## 🎯 Milestone 6 — Dashboard Polish + Campanhas Overhaul + Chip Profiles

> Elevate the dashboard and operations pages to full V2 Editorial Light polish, overhaul the campaign system with WhatsApp formatting, Gemini AI writing assistance, rich campaign management, and add chip profile management via Evolution API.

### Milestone 6 Phase Overview

| Phase | Name | Priority | Depends On | Plans | Wave |
|-------|------|----------|------------|-------|------|
| 36 | Dashboard Editorial Polish | P1 | — | 1 plan | 1 |
| 37 | Operações Layout & Data | P1 | — | 1 plan | 1 |
| 38 | Chip Profile Management | P1 | — | 2 plans | 1 |
| 39 | Campanhas WhatsApp Foundation | P0 | 38-01 (for 39-02) | 2 plans | 1-2 |
| 40 | Campanhas Editor Overhaul | P0 | 39-01, 39-02, 40-01 | 2 plans | 2-3 |
| 41 | Campanhas Management & Analytics | P0 | 39-02, 40-02, 41-01 | 2 plans | 3-4 |

### Milestone 6 Dependency Graph

```
Wave 1 (parallel):  36-01  37-01  38-01  39-01
                                    |       |
Wave 2:                           38-02  39-02  40-01
                                            |     |
Wave 3:                                   40-02  41-01
                                            |     |
Wave 4:                                   41-02 ←┘
```

---

### Phase 36: Dashboard Editorial Polish
**Status:** Not started
**Goal:** Polish the main dashboard to full V2 Editorial Light quality — fix KPI card margins/styling, relocate ChatQueuePanel below Campanhas Ativas, and audit all Ações Rápidas links for deprecated routes.

**Requirements:** [DASH-V2-01, DASH-V2-02, DASH-V2-03, DASH-V2-04]

- DASH-V2-01: KPI cards (Entregues, Leituras, Respostas, Bloqueios) have V2 Editorial Light warm styling with consistent margins and 4-column responsive grid
- DASH-V2-02: ChatQueuePanel (Fila de Conversas) renders BELOW the Campanhas Ativas table, not in the right sidebar
- DASH-V2-03: All Ações Rápidas links navigate to existing, non-deprecated routes (audit /mobile/* links)
- DASH-V2-04: Dashboard layout is cohesive with V2 Editorial Light design tokens (#F8F6F1 bg, warm borders)

**Depends on:** —
**Plans:** 1/1 plans complete

Plans:
- [ ] 36-01-PLAN.md — KPI card V2 styling, ChatQueuePanel relocation below campaigns, Ações Rápidas link audit

---

### Phase 37: Operações Layout & Data
**Status:** Not started
**Goal:** Improve layout and readability of all 8+ Operações sub-components, verify every component displays real data from APIs (no hardcoded values), apply V2 Editorial Light styling consistently.

**Requirements:** [OPS-V2-01, OPS-V2-02, OPS-V2-03, OPS-V2-04]

- OPS-V2-01: All Operações sub-components (ChipHealthGrid, CampaignProgressBars, AlertsPanel, etc.) have consistent card styling and readable text
- OPS-V2-02: Every component displays real data from API endpoints, not hardcoded/mock values
- OPS-V2-03: Layout is readable on 1024px+ screens with proper spacing and visual hierarchy
- OPS-V2-04: No emoji indicators — all status uses colored dots or text badges per project conventions

**Depends on:** —
**Plans:** 1/1 plans complete

Plans:
- [ ] 37-01-PLAN.md — Operações layout/styling fix for all components + real data verification (2 tasks)

---

### Phase 38: Chip Profile Management
**Status:** Not started
**Goal:** Add chip profile management (name, photo) via Evolution API — backend wrappers, DB schema extension, API endpoints, and profile editor UI integrated into the chips page.

**Requirements:** [CHIP-PROF-01, CHIP-PROF-02, CHIP-PROF-03, CHIP-PROF-04, CHIP-PROF-05]

- CHIP-PROF-01: Evolution API wrapper has setProfileName(), setProfilePicture(), getProfilePicture() functions
- CHIP-PROF-02: Chips DB table stores profileName and profilePictureUrl fields
- CHIP-PROF-03: Chips API supports updating chip profile via PUT with action='updateProfile'
- CHIP-PROF-04: Operators can view and edit chip profile name and photo from the chips page
- CHIP-PROF-05: Profile changes are saved to both Evolution API and the local DB

**Depends on:** —
**Plans:** 2/2 plans complete

Plans:
- [ ] 38-01-PLAN.md — Evolution API profile wrappers + DB schema extension + API endpoint
- [ ] 38-02-PLAN.md — ChipProfileEditor UI component + chips page integration

### Phase 38 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 38-01, 38-02 | Sequential | 38-02 depends on 38-01 (needs API + schema) |

---

### Phase 39: Campanhas WhatsApp Foundation
**Status:** Not started
**Goal:** Build the WhatsApp message foundation — shared WhatsApp preview component (replacing 3 inline duplicates), WhatsApp text formatting parser (bold/italic/strikethrough/monospace), fix 100→65536 char limit, campaign date range schema, and integrate chip profile into preview.

**Requirements:** [WA-01, WA-02, WA-03, WA-04, WA-05, WA-06, WA-07, WA-08]

- WA-01: A single shared WhatsAppPreview component exists (replaces 3 inline duplicates)
- WA-02: WhatsApp formatting (bold `*text*`, italic `_text_`, strikethrough `~text~`, monospace `` `text` ``) is parsed and rendered correctly
- WA-03: Preview shows chip profile name and photo (not hardcoded 'EEL Eleição')
- WA-04: Message preview handles links, emoji, and multi-line content correctly
- WA-05: Campaign create page uses shared WhatsAppPreview instead of inline duplicate
- WA-06: Campaign edit page uses shared WhatsAppPreview instead of inline duplicate
- WA-07: Message textarea allows 65536 chars (not 100 char limit)
- WA-08: Campaign schema has startDate and endDate fields

**Depends on:** 38-01 (for chip profile data in preview)
**Plans:** 2/2 plans complete

Plans:
- [ ] 39-01-PLAN.md — WhatsApp format parser + shared WhatsAppPreview component
- [ ] 39-02-PLAN.md — Replace inline previews with shared component + fix char limit + campaign date range schema

### Phase 39 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 39-01 | Yes | No dependencies — parser + preview component |
| 2 | 39-02 | Sequential | Depends on 39-01 (shared component) + 38-01 (chip profile) |

---

### Phase 40: Campanhas Editor Overhaul
**Status:** Not started
**Goal:** Add Gemini AI message writing assistance (generate, improve, rewrite) and WhatsApp formatting toolbar to the campaign editor, with proper data validation for templates and date ranges.

**Requirements:** [EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07]

- EDIT-01: Gemini can generate campaign messages based on prompt/context (segment, candidate info)
- EDIT-02: Gemini can improve/rewrite existing messages with specific instructions
- EDIT-03: An AI assistant UI component (GeminiMessageAssistant) exists for the campaign editor
- EDIT-04: Campaign editor has a WhatsApp formatting toolbar (bold, italic, strikethrough, monospace)
- EDIT-05: Gemini AI assistant is integrated into the campaign creation/edit pages
- EDIT-06: Message validation warns about unsupported formatting or overly long messages
- EDIT-07: Data validation prevents saving campaigns with empty templates or invalid date ranges

**Depends on:** 39-01 (WhatsApp preview), 39-02 (shared preview integration)
**Plans:** 2/2 plans complete

Plans:
- [ ] 40-01-PLAN.md — Gemini message generation functions + API endpoint + GeminiMessageAssistant UI
- [ ] 40-02-PLAN.md — WhatsApp formatting toolbar + integrate AI+toolbar into editor + data validation

### Phase 40 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 2 | 40-01 | Yes (with 39-02) | Depends on 39-01 only |
| 3 | 40-02 | Yes (with 41-01) | Depends on 39-02 + 40-01 |

---

### Phase 41: Campanhas Management & Analytics
**Status:** Not started
**Goal:** Enrich the campaign list with segments/chips/tags, add activate/pause controls, improve the campaign detail page with comprehensive analytics, and integrate Gemini for real-time campaign performance analysis with actionable recommendations.

**Requirements:** [MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05, MGMT-06, MGMT-07, MGMT-08, MGMT-09]

- MGMT-01: Campaign list shows rich information — segment chips/tags, date range, chip info
- MGMT-02: Campaign list has activate/pause buttons that change campaign status
- MGMT-03: Campaign list rows link to a detail page
- MGMT-04: Status changes are instant with optimistic UI updates
- MGMT-05: Status transitions are validated server-side (draft→scheduled, scheduled→sending, etc.)
- MGMT-06: Campaign detail page shows comprehensive campaign info with delivery analytics
- MGMT-07: Campaign detail page has real-time analytics with delivery funnel
- MGMT-08: Gemini provides campaign performance analysis with actionable recommendations
- MGMT-09: Campaign detail page is navigable from the campaign list

**Depends on:** 39-02 (date range schema), 40-02 (editor), 41-01 (list enhancements)
**Plans:** 2/2 plans complete

Plans:
- [ ] 41-01-PLAN.md — Enriched campaign list + activate/pause controls + status transitions
- [ ] 41-02-PLAN.md — Enhanced campaign detail page + Gemini campaign analytics + AI insights

### Phase 41 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 3 | 41-01 | Yes (with 40-02) | Depends on 39-02 |
| 4 | 41-02 | Sequential | Depends on 41-01 + 40-02 |

---

### Phase 42: Groups Polish & Conversion Tracking
**Status:** Not started
**Goal:** Fix group management bugs and add conversion tracking — auto-link rotation when creating new groups mid-campaign, real member names display, "ver detalhes" layout fix, and auto opt-in on group join.

**Requirements:** [GRP-POL-01, GRP-POL-02, GRP-POL-03, GRP-POL-04, GRP-POL-05]

- GRP-POL-01: When a new group is created mid-campaign, the campaign link automatically updates to point to the new group (auto-link rotation)
- GRP-POL-02: Group member list shows real contact names (linked from contacts/voters DB) for conversion tracking and identity management
- GRP-POL-03: "Ver detalhes" button in group card layout is contained within the card component (no overflow/clipping)
- GRP-POL-04: When a person joins a group via invite link, they are automatically opted-in (opt-in registered in DB)
- GRP-POL-05: Chip sync pulls full instance info from Evolution API (including proxy settings) and updates the DB — changes made directly in Evolution (proxy, profile) are reflected in the frontend after sync

**Depends on:** Phase 16 (WhatsApp Group Management), Phase 21 (Campaign-Group Integration)
**Plans:** 2/2 plans complete
Plans:
- [ ] 42-01-PLAN.md — Cache invalidation on group creation + group card layout fix
- [ ] 42-02-PLAN.md — Member voter name enrichment + webhook auto opt-in

---

### Phase 43: Phone Resolution + Group Identity
**Status:** Not started
**Goal:** Fix voter name resolution across all incoming webhook events (dual-format 12↔13 digit phones) and provide real identity for WhatsApp group members — including closed groups where members appear as `@lid` JIDs that cannot be resolved through direct API calls.

**Requirements:** [PHONE-43-01, GRP-43-01, GRP-43-02, GRP-43-03, GRP-43-04]

- PHONE-43-01: Webhook `MESSAGES_UPSERT` uses `findVoterByPhone` (dual-format inArray) when linking incoming messages to voters — fixes conversation feed showing voters without names when phone has no 9th digit
- GRP-43-01: New `group_sender_cache` DB table (groupJid + senderPhone + normalizedPhone + lastSeenAt) with Drizzle migration, storing real sender JIDs captured from group message events
- GRP-43-02: Webhook `MESSAGES_UPSERT` for group messages (remoteJid ends with `@g.us`) writes sender phone to `group_sender_cache` — only `@s.whatsapp.net` senders (real phones), ignoring `@lid`
- GRP-43-03: Group members API (`/api/groups/[id]/members`) queries `group_sender_cache` to attempt @lid → phone resolution; resolved phones then go through `findVoterByPhone` to return voter name; unresolvable @lid members shown with null name as before
- GRP-43-04: Closed group opt-in path — GROUP_PARTICIPANTS_UPDATE handler uses `findVoterByPhone` for participant real JIDs; @lid participants in closed groups cannot be opted-in automatically (documented limitation), but any real-JID participant joining any group (open or closed) correctly triggers opt-in

**Depends on:** Phase 42 (Groups Polish — dual-format `findVoterByPhone` in db-voters)
**Plans:** 1/2 plans executed
Plans:
- [x] 43-01-PLAN.md — Fix webhook phone lookup (findVoterByPhone) + group_sender_cache table + cache population
- [x] 43-02-PLAN.md — Members API @lid resolution via cache + GROUP_PARTICIPANTS_UPDATE cache writes

---

### Phase 44: AI Analysis Enhancement + Campaign Tracking Fixes
**Status:** Not started
**Goal:** Upgrade Gemini analysis to use full conversation context instead of 3 isolated messages, standardize AI-suggested tags to a curated campaign taxonomy, fix campaign read/reply tracking (webhook status updates not correlating to message queue), and fix the campaign messages tab showing 0 messages.

**Requirements:** [AI-44-01, AI-44-02, CAMP-44-01, CAMP-44-02]

- AI-44-01: `triggerAnalysis` passes full conversation thread (all messages with role labels and timestamps) to Gemini instead of 3 plain strings — produces accurate sentiment/intent because Gemini understands the full exchange, not just the last message
- AI-44-02: Gemini `suggestedTags` constrained to a predefined campaign taxonomy (e.g., apoiador, indeciso, opositor, saúde, educação, segurança, emprego, transporte) — replaces free-form tags like "teste", "saudação", "inicio-conversa" that have no strategic value
- CAMP-44-01: Campaign message read/replied tracking works — `messages.update` webhook correctly correlates the Evolution API message key ID to `messageQueue.evolutionMessageId` so `readAt` and campaign `totalRead` are updated when voters open messages
- CAMP-44-02: Campaign messages tab (`/campanhas/[id]/mensagens`) displays all messages — API returns correct rows when messages exist in the queue for the campaign

**Depends on:** Phase 18 (AI Lead Analysis), Phase 17 (Delivery Tracking)
**Plans:** 2/2 plans complete
Plans:
- [ ] 44-01-PLAN.md — Full conversation context for Gemini + tag taxonomy
- [ ] 44-02-PLAN.md — Campaign read tracking fix + messages tab fix

---

### Phase 45: Performance Optimization v2
**Status:** Not started
**Goal:** Implement critical performance optimizations based on Vercel React Best Practices — fix barrel imports (186 instances), migrate static pages to React Server Components (5 pages), replace useEffect+fetch with SWR (38 pages), lazy load heavy components, and eliminate unnecessary derived state effects. Target: 50% bundle reduction, 50% First Load JS reduction, 43% faster Time to Interactive.

**Requirements:** [PERF-45-01, PERF-45-02, PERF-45-03, PERF-45-04, PERF-45-05]

- PERF-45-01: Convert 186 barrel imports to direct imports — reduce bundle size by eliminating unused exports from barrel files (src/lib/index.ts, src/components/index.ts, etc.)
- PERF-45-02: Migrate 5 static pages to React Server Components — Dashboard, Relatorios, Compliance, Admin, Configuracoes (no client-side interactivity needed for initial render)
- PERF-45-03: Replace 38 useEffect+fetch patterns with SWR for client-side data fetching — automatic deduplication, caching, revalidation, error handling
- PERF-45-04: Lazy load heavy components via next/dynamic — GeminiMessageAssistant (617 lines), ChipProfileEditor (407 lines), ChatQueuePanel (213 lines), ConversionFunnel, recharts components
- PERF-45-05: Remove unnecessary useEffect for derived state — state that can be computed from props or other state without effects

**Depends on:** Phase 44 (AI Analysis Enhancement)
**Plans:** 2/4 plans executed

Plans:
- [x] 45-01-PLAN.md — SWR expansion (3 → 25+ instances across data-fetching pages)
- [x] 45-02-PLAN.md — Dynamic imports for heavy components (8-10 lazy-loaded components)
- [ ] 45-03-PLAN.md — Server component migration (7 pages converted)
- [ ] 45-04-PLAN.md — Derived state cleanup (10-15 useEffect removed)

### Phase 45 Wave Structure

| Wave | Plans | Parallel | Notes |
|------|-------|----------|-------|
| 1 | 45-01, 45-02 | Yes | SWR + dynamic imports, no file overlaps |
| 2 | 45-03, 45-04 | Yes | Server components + derived state cleanup |

---

| Decision | Choice | Reason |
|----------|--------|--------|
| Visual direction | V2 Editorial Light (Radix Command) | Selected by user from 4 Paper options |
| Existing stack | Keep Next.js 16 + shadcn + Drizzle | Already deployed and working |
| Chat location | Integrated in dashboard panel | User requirement — no separate chat page |
| User experience | Wizard + guided mode + microcopy | "Magical" product feel for non-technical operators |
| New shadcn components | Install as needed (Dialog, Sheet, Table, Tabs, Textarea, DataTable) | Many primitives currently missing |
| Form validation | Add zod + react-hook-form | Currently manual validation everywhere |
| Data fetching | Add SWR or React Query | Replace raw useEffect + fetch pattern |
| Charts library | recharts | Replace hand-built SVG, responsive, well-maintained |
| No emoji in UI | Text labels + colored dots/badges | Professional appearance, consistent across all pages |
