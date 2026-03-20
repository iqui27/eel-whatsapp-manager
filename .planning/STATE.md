---
gsd_state_version: 1.0
milestone: v5.0
milestone_name: "Milestone 5 — Performance Optimization + Campaign Management"
current_phase: 35
current_phase_name: campaign-management
current_plan: 1
status: executing
stopped_at: "Phase 34 complete (4/4 plans) — ready to execute Phase 35"
last_updated: "2026-03-20T00:00:00.000Z"
last_activity: 2026-03-20
progress:
  total_phases: 35
  completed_phases: 34
  total_plans: 116
  completed_plans: 102
  percent: 88
---

# EEL Eleicao — Project State

## Current Execution
**Current Phase:** 35
**Current Phase Name:** campaign-management
**Current Plan:** 5
**Total Phases:** 35
**Total Plans in Phase:** 6
**Status:** Ready to execute
**Progress:** [████████░░] 88% (34/35 phases complete)
**Last Activity:** 2026-03-20
**Last Activity Description:** Phase 34 (Remaining Performance Hardening) — all 4 plans complete: cron locks, SSE limits, SWR caching, log retention
**Stopped At:** Completed 35-04-PLAN.md (send queue intelligence: per-campaign config + chip constraints)

**Phase 34 (Remaining Performance Hardening) — COMPLETE** ✅
- Plan 34-01: Cron overlap protection (DB lock table + withCronLock) ✅ commits: 62e8ac8, 0d4d8bf
- Plan 34-02: SSE connection limits (3/user, 50 global, 5min max) ✅ commit: f2dea8c
- Plan 34-03: SidebarLayout SWR caching (session 60s, chips 30s) ✅ commit: 78669bf
- Plan 34-04: Log retention cron (daily at 3 AM UTC, 30-day retention) ✅ commit: 2dc3e1e

**Phase 35 (Campaign Management Overhaul) — PLANNED** 🔵
- Plan 35-01: Quick fixes (double sidebar + logger default + cron instrumentation) [Wave 1]
- Plan 35-02: Campaign DB schema expansion (send config + proxy fields, migration 0014) [Wave 1]
- Plan 35-03: Campaign send config UI (speed presets, time windows, multi-chip selection) [Wave 2]
- Plan 35-04: Send queue intelligence (per-campaign config, presence simulation, circuit breaker) [Wave 2]
- Plan 35-05: Proxy management (chips page UI + Evolution API proxy pass-through) [Wave 3]
- Plan 35-06: Anti-ban dashboard (per-chip warm-up, error rates, recommendations) [Wave 3]

Progress: [██████████] 100%

Last session: 2026-03-20T00:00:00.000Z

## Current Position
**Phase 01 (V2 Shell) — COMPLETE** ✅
**Phase 02 (DB Schema) — COMPLETE** ✅
**Phase 03 (Import + Segmentation) — COMPLETE** ✅
**Phase 04 (Campaign Editor + Send) — COMPLETE** ✅
**Phase 05 (Dashboard V2 + Chat Panel) — COMPLETE** ✅
**Phase 06 (HITL Conversations + CRM) — COMPLETE** ✅
**Phase 07 (Compliance + Admin) — COMPLETE** ✅
**Phase 08 (Reports + Polish) — COMPLETE** ✅
**Phase 09 (Real Data + Integrations) — COMPLETE** ✅
- Plans completed: 9/9 (`09-01`, `09-02`, `09-03`, `09-04`, `09-05`, `09-06`, `09-07`, `09-08`, `09-09`)

**Phase 10 (Real-Time Chat via SSE) — COMPLETE** ✅
- Plan 10-01 complete: authenticated SSE route + delta-query helpers + shared cursor/event contract
- Plan 10-02 complete: `/conversas` now bootstraps with REST and continues via SSE through the shared EventSource hook
- Plan 10-03 complete: dashboard queue panel now reuses the shared stream and updates open-queue removals in near real time

**Phase 11 (Full-System Verification + UAT Sweep) — COMPLETE** ✅
- Plan 11-01 complete: production-backed baseline/auth/legacy verification + shared evidence ledger
- Plan 11-02 complete: import/segmentation/CRM validated on current HEAD; campaign lifecycle blocked by target-database schema drift and production deploy parity gaps
- Plan 11-03 complete: realtime/governance/reporting verification finished with a release-blocked verdict and explicit gap routing

**Phase 12 (Campaign Personalization Completion) — COMPLETE** ✅
- Plan 12-01 complete: persisted candidate profile settings plus the shared campaign-variable contract foundation
- Plan 12-02 complete: create/edit/schedule flows now share the same variable registry, preview semantics, validation, and persisted variable metadata
- Plan 12-03 complete: manual and scheduled delivery now resolve the same personalization contract as the editor and block invalid templates pre-send

**Phase 13 (Zero-Pendency Release Closure) — COMPLETE** ✅
- Plan 13-01 complete: shell/setup/dashboard no longer ship demo-only contracts or misleading configured-state behavior
- Plan 13-02 complete: sessions, roles, permissions, and protected APIs now enforce real authorization and `401`/`403` boundaries
- Plan 13-03 complete: CRM notes/checklists persist server-side and the mobile capture/inbox workflows shipped
- Plan 13-04 complete: reports now support CSV/PDF export, persisted schedules, dispatch history, and scheduled delivery flow
- Plan 13-05 complete: production was redeployed to the intended head and live UAT passed across protected pages, authz, CRM persistence, and scheduled report dispatch

**Phase 14 (Chip Health Reliability) — COMPLETE** ✅
- Plan 14-01: Evolution API v2 full wrapper (13+ functions), 8-state chip health schema, health cron with auto-restart, webhook hardened with statusReason + lastWebhookEvent tracking ✅
- Plan 14-02: Chips API returns all health data + graceful restart; chips page rebuilt as health monitoring dashboard with 8-state indicators, progress bars, timestamps, not_found detection ✅

Progress: [██████████] 100%

Last session: 2026-03-17T18:30:00.000Z

## Project History

### EEL v1 (Chip Warming Manager) — COMPLETE
All 6 original phases shipped and deployed to `zap.iqui27.app`.

### EEL Eleicao (Electoral Campaign Dashboard) — COMPLETE
Paper design complete (22 artboards). V2 Editorial Light selected. Roadmap created.

**Phase 01 — V2 Shell — COMPLETE** ✅
- 01-01: V2 design tokens (warm #F8F6F1) + 8-item electoral sidebar
- 01-02: V2 Topbar (search, period, alerts, profile) + shell integration

**Phase 02 — DB Schema — COMPLETE** ✅
- 02-01: voters, campaigns, segments, segmentVoters tables + 3 CRUD libraries
- 02-02: conversations, consentLogs, users tables + 3 more CRUD libs + 3 API routes

**Phase 03 — Import + Segmentation — COMPLETE** ✅
- 03-01: 4-step CSV import wizard (Upload → Mapping → Validation → Processing) + `/api/voters/import` bulk endpoint
- 03-02: Segmentation page (filter builder AND/OR + audience preview panel + saved segments table)

**Phase 04 — Campaign Editor + Send — COMPLETE** ✅
- 04-01: Campaign list + split-pane editor + WhatsApp preview + CTA score + variable insertion
- 04-02: A/B test panel + scheduling wizard + simulated send API + auto-refresh monitor page

**Phase 05 — Dashboard V2 + Chat Panel — COMPLETE** ✅
- 05-01: Electoral KPI row + operations table + command panel + onboarding wizard
- 05-02: Conversations API route + chat queue panel (15s auto-refresh, priority dots)

**Phase 06 — HITL Conversations + CRM — COMPLETE** ✅
- 06-01: Three-column HITL conversations UI (queue / live-chat / voter-context) + messages API
- 06-02: CRM voter list (debounced search, engagement bars, tags) + voter profile page (engagement circle, editable tags, timeline, checklist/notes) + compliance API

**Phase 07 — Compliance + Admin — COMPLETE** ✅
- 07-01: LGPD compliance page (opt-in status cards, consent table with revoke/anonymize, audit timeline with CSV export)
- 07-02: Admin panel (users table with inline role editing, invite dialog, permissions matrix tab) + /api/users CRUD

**Phase 08 — Reports + Polish — COMPLETE** ✅
- 08-01: Reports page (/relatorios) — period KPI cards, SVG bar chart, campaign performance table, CSV export
- 08-02: Final polish — "Ver relatórios" dashboard quick-action, empty state audit, nav verification

**Phase 09 — Real Data + Integrations — COMPLETE** ✅
- 9 plans across 4 waves covering real-data work plus post-verification gap closures
- Wave 1 (parallel): Plans 01, 02, 04, 05 — webhook, send pipeline, CRM, segmentation
- Wave 2 (depends on Wave 1): Plans 03, 06, 07 — conversations, dashboard/reports, campaign edit ✅
- Wave 3: Plan 08 — delivery orchestration durability (cron, delivery events, monitor timeline) ✅
- Wave 4: Plan 09 — CRM single-voter segment prefill ✅

**Phase 10 — Real-Time Chat via SSE — COMPLETE** ✅
- Wave 1: Plan 10-01 — authenticated SSE backend foundation complete ✅
- Wave 2: Plan 10-02 — `/conversas` EventSource migration complete ✅
- Wave 3: Plan 10-03 — dashboard queue panel realtime adoption complete ✅

**Phase 11 — Full-System Verification + UAT Sweep — COMPLETE** ✅
- Wave 1: Plan 11-01 — baseline auth/setup/settings/operational verification complete ✅
- Wave 2: Plan 11-02 — electoral-core UAT and blocker routing complete ✅
- Wave 3: Plan 11-03 — realtime/governance/reporting verdict and evidence ledger complete ✅

**Phase 12 — Campaign Personalization Completion — COMPLETE** ✅
- Wave 1: Plan 12-01 — candidate profile and shared variable contract foundation complete ✅
- Wave 2: Plan 12-02 — campaign authoring alignment complete ✅
- Wave 3: Plan 12-03 — delivery/runtime personalization parity complete ✅

**Phase 13 — Zero-Pendency Release Closure — COMPLETE** ✅
- Wave 1: Plans 13-01 and 13-02 — shell contract cleanup plus real authz/session enforcement complete ✅
- Wave 2: Plan 13-03 — CRM persistence plus mobile operator workflows complete ✅
- Wave 3: Plan 13-04 — report export/scheduling automation complete ✅
- Wave 4: Plan 13-05 — production deploy, cron hardening, and zero-pendency live sign-off complete ✅

**Phase 14 (Chip Health Reliability) — COMPLETE** ✅
- Plan 14-01: Evolution API v2 full wrapper (13+ functions), 8-state chip health schema, health cron with auto-restart, webhook hardened with statusReason + lastWebhookEvent tracking ✅
- Plan 14-02: Chips API returns all health data + graceful restart; chips page rebuilt as health monitoring dashboard with 8-state indicators, progress bars, timestamps ✅

**Phase 15 (Mass Messaging Engine) — COMPLETE** ✅
- Plan 15-01: Message queue schema (8-state lifecycle), chip router (health/capacity/affinity scoring), queue processor cron with anti-ban protections ✅
- Plan 15-02: Campaign hydration pipeline, message variation engine (spintax, greetings, emojis) ✅
- Plan 15-03: Automatic chip failover, hourly/daily counter reset cron ✅

**Phase 16 (WhatsApp Group Management) — COMPLETE** ✅
- Plan 16-01: Groups schema (whatsapp_groups table), db-groups.ts with CRUD + overflow, group-sync utility, GROUP_PARTICIPANTS_UPDATE webhook handler ✅
- Plan 16-02: Groups API routes, /grupos page with status filters, GroupCard/CreateGroupDialog components, campaign integration with {link_grupo} variable ✅

**Phase 17 (Delivery Tracking & Conversion Funnel) — COMPLETE** ✅
- Plan 17-01: Conversion events table, MESSAGES_UPDATE webhook for delivery status, reply correlation, group join conversion tracking ✅
- Plan 17-02: Funnel API, ConversionFunnel/DeliveryTimeline/ChipBreakdown components, campaign detail page at /campanhas/[id] ✅

**Phase 18 (AI Lead Analysis) — COMPLETE** ✅
- Plan 18-01: Gemini module (gemini-2.0-flash), real-time message analysis, auto-tagging pipeline, AI fields in voters table ✅
- Plan 18-02: Batch profiling cron, AI insights panel, sentiment timeline, lead scoring widget ✅

**Phase 19 (Operations Dashboard Rebuild) — COMPLETE** ✅
- Plan 19-01: ChipHealthGrid, CampaignProgressBars, AlertsPanel, operations API ✅
- Plan 19-02: GroupCapacityGrid, ConversionKPIs, MessageFeed, KPIs API, messages API ✅
- Plan 19-03: All components verified, APIs tested, ready for integration ✅

**Phase 20 (Critical Fixes) — COMPLETE** ✅
- Plan 20-01: Fixed Evolution API connection visualization (5min stale threshold), message feed now includes inbound messages, real-time monitoring with 10s auto-refresh, GroupCapacityGrid with real data, segment-to-group mapping helpers, auto-admin promotion on group creation ✅

**Phase 21 (Campaign-Group Integration) — COMPLETE** ✅
- Plan 21-01: Schema Enhancement - segmentTag field, segment-chip-group mapping, CRUD updates ✅
- Plan 21-02: Campaign Queue Integration - {link_grupo} resolution, group auto-creation, link caching ✅
- Plan 21-03: Automatic Group Overflow - 90% detection, overflow creation, cache invalidation ✅
- Plan 21-04: Chip Failover Enhancement - fallback chain, message reassignment, notifications ✅
- Plan 21-05: Setup Wizard Implementation - 5-step guided setup, QR code scan, progress persistence ✅
- Plan 21-06: Dashboard Enhancement - tooltips, status cards, next actions, quick actions, keyboard shortcuts ✅
- Plan 21-07: Message History & Analytics - search, export, analytics charts, per-campaign/chip logs ✅

**Phase 22 (UI Polish) — COMPLETE** ✅
- Plan 22-01: Navigation Fix - dashboard ops tab removal, mobile nav indices, SidebarLayout wrappers, Link conversion ✅
- Plan 22-02: Dashboard Layout - right column widened to 320px, per-endpoint error toasts ✅
- Plan 22-03: Operacoes Polish - text truncation fixed, loading vs empty state bug, voter count populated ✅
- Plan 22-04: Campanhas + Segmentacao - toast.error on load, AlertDialog replace window.confirm, shadcn Select ✅
- Plan 22-05: Conversas - right panel 320px, no-emoji priorities, shadcn Dialog, mobile responsive ✅
- Plan 22-06: CRM - silent catch fixed, invalid AlertDialog props corrected, tags overflow fixed ✅
- Plan 22-07: Relatorios + Compliance + Admin - comprehensive toasts + AlertDialogs for all destructive actions ✅
- Plan 22-08: Topbar date display, session dot indicator, chip-health-grid no-emoji commit ✅

**Phase 23 (Critical Layout Foundation) — COMPLETE** ✅
- Plan 23-01: Responsive topbar (flex-shrink, breakpoint hiding), dashboard right panel scroll ✅
- Plan 23-02: Setup page 46 hex colors → Tailwind tokens, conversas height fix (74px), wizard verified ✅

**Phase 24 (Operations Unification) — COMPLETE** ✅
- Plan 24-01: ChipHealthGrid/MessageFeed/SystemStatusCard accents, flex widths, auto-refresh, stacked bar CSS ✅
- Plan 24-02: QuickActionsPanel contextual counts, HelpPanel FAQ accents + real email, operations page accent fixes ✅

**Phase 25 (Conversas Overhaul) — COMPLETE** ✅
- Plan 25-01: Silent catch → toast+retry, SSE status dots, MAX_RECONNECT 5→8, heartbeat 45s, online/offline listeners, forceReconnect ✅
- Plan 25-02: AI tier/sentiment badges, analysis summary, recommended action, inline tag editing in voter panel ✅
- Plan 25-03: Client-side search in queue, mobile voter context Sheet via User button, shadcn Sheet installed ✅

**Phase 26 (Campanhas & Segmentação UX) — COMPLETE** ✅
- Plan 26-01: Campanhas — pagination 20/pg, name search, status filter, date sort, onboarding guide, empty states ✅
- Plan 26-02: Segmentação — Novo Segmento button, Geográfico/Demográfico/Seção accents, usage stats table, onboarding ✅

**Phase 27 (CRM Overhaul) — COMPLETE** ✅
- Plan 27-01: AI tier dot + sentiment column, inline row editor (name/phone/zone/section/opt-in/notes) ✅
- Plan 27-02: Filter bar (tier/opt-in/zone), checkbox multi-select, bulk delete+export, CSV with 16 fields + BOM ✅

**Phase 28 (Relatórios Pro) — COMPLETE** ✅
- Plan 28-01: recharts installed, DailyBarChart (tooltips+axes), TrendLineChart (sent/delivered/read) ✅
- Plan 28-02: ConversionFunnel (4-step with drop-off%), responsive 2-col chart grid, KPI grid 2-col mobile ✅

**Phase 29 (Configurações & Perfil) — COMPLETE** ✅
- Plan 29-01: /configuracoes page (6 sections: Candidato/Evolution/Gemini/Notif/Campanhas/Aquecimento), sidebar updated ✅
- Plan 29-02: /perfil page (avatar, role badge, name edit, password change, permissions checklist), sidebar 'Meu Perfil' ✅

**Phase 30 (Header Cleanup & Final Polish) — COMPLETE** ✅
- Plan 30-01: Command palette entity search (voters), new nav commands, topbar real alert count from API ✅
- Plan 30-02: Deprecated redirects (/history→/historico, /contacts→/crm, /clusters→/), all sidebar accent fixes ✅

**Phase 31 (Diagnostic Fixes) — COMPLETE** ✅
- Plan 31-01: CRM inline edit fix, AI analysis card, Gemini model updated to gemini-2.5-flash (GA) ✅
- Plan 31-02: Voter segments shown in CRM list and detail pages via bulk join query ✅
- Plan 31-03: Group creation UX — admin phones field, voter picker dialog, API admin promotion ✅
- Plan 31-04: Message History empty state + inbound message support (direction filter) ✅
- Plan 31-05: Opt-in/out keyword detection in webhook (automatic LGPD consent automation) ✅

**Phase 32 (System Logs) — COMPLETE** ✅
- Plan 32-01: system_logs DB table + migration, system-logger.ts, GET /api/system-logs with filters, webhook + Gemini instrumentation ✅
- Plan 32-02: /logs UI page — level/category pills, text search, date range, expandable JSON detail, duration badge, auto-refresh, CSV export ✅
- Plan 32-03: Batch logger rewrite (in-memory buffer → 2s batch INSERT, SYSLOG_MIN_LEVEL env guard), logs page debounce + appliedRef pattern ✅

## 🎉 MILESTONE 4 COMPLETE — ALL 32 PHASES EXECUTED

Progress: [██████████] 100%

Last session: 2026-03-19T00:00:00.000Z

**Phase 33 (Performance Optimization) — COMPLETE** ✅
- Plan 33-01: CSS @keyframes page transitions, lazy-loaded recharts, motion-safe polyfill ✅
- Plan 33-02: In-memory session cache (60s TTL, 500 max) ✅
- Plan 33-03: Visibility guards on all 6 polling intervals + SSE optimization (5s poll, voter cache) ✅
- Plan 33-04: DB indexes (voters, message_queue, conversion_events), SQL-level voter pagination ✅

**Phase 34 (Remaining Performance Hardening) — COMPLETE** ✅
- Plan 34-01: Cron overlap protection — cron_locks DB table + withCronLock helper + all 8 routes wrapped ✅
- Plan 34-02: SSE connection limits (3/user, 50 global, 5min max lifetime) ✅
- Plan 34-03: SidebarLayout SWR caching (session 60s, chips 30s) ✅
- Plan 34-04: Log retention cron (daily at 3 AM UTC, 30-day retention) ✅

## Decisions Made
- [x] Visual direction: V2 Editorial Light (Radix Command) — from Paper exploration
- [x] Database: Supabase PostgreSQL (already in use)
- [x] ORM: Drizzle (already in use)
- [x] Chat in dashboard: Panel integrated in main view, not separate page
- [x] UX philosophy: Wizard + guided mode + explanatory microcopy
- [x] MVP priority: P0 = Import → Segmentation → Campaigns → Send/Monitor
- [x] Keep existing stack (Next.js 16, React 19, shadcn/ui, Tailwind 4)
- [x] V2 tokens: warm white #F8F6F1 bg, #F2F0EB sidebar, warm borders — dark mode unchanged
- [x] Topbar ThemeToggle placement: in Topbar (5th section) on desktop, in simplified mobile header
- [x] CommandTrigger removed from layout — visual role replaced by Topbar search input; Cmd+K still works
- [x] Legacy nav: "Operacional" section in sidebar for pre-electoral pages (Chips, Contacts, etc.)
- [x] segments declared before campaigns in schema.ts — satisfies FK ordering requirement
- [x] conversation_messages: separate table (not JSON) — enables message-level queries and indexing
- [x] logConsent() updates voter.optInStatus in same call — single source of truth
- [x] audit_trail deferred — consent_logs covers LGPD needs; generic trail can be added later
- [x] filters stored as JSON string in segments table — API serializes object→string if needed
- [x] audience calculation is client-side mock — real server-side filtering deferred to Phase 05 (query complexity vs value)
- [x] import deduplication by phone number via `inArray` query — covers 95% of duplicate cases
- [x] CTA score is a pure function in src/lib/cta-score.ts — zero React imports, fully testable
- [x] campaign send now runs through a shared Evolution API executor used by both manual dispatch and scheduled cron runs
- [x] monitor auto-refresh via polling (3s interval) — adequate for MVP; WebSocket/SSE deferred
- [x] chat realtime will use authenticated SSE with cursor resume over persisted DB deltas — no standalone WebSocket layer in Phase 10
- [x] template field in campaigns table (not 'message') — schema uses English field names throughout
- [x] dashboard KPI "Taxa de abertura" mocked at 62% — no WhatsApp read-tracking in DB; labeled "(sem rastreio)"
- [x] useCountUp extracted to src/lib/use-count-up.ts — shared hook, 'use client' safe
- [x] chat queue panel uses polling (15s) not WebSocket — simple and reliable for MVP
- [x] onboarding wizard dismissed via localStorage key — acceptable for MVP single-user context
- [x] HITL chat: raw db.update() in API route for handoffReason/priority (updateConversationStatus helper insufficient)
- [x] CRM checklist + notes: localStorage per voter key — DB persistence deferred, MVP acceptable
- [x] Voter profile fetches all voters then filters by ID client-side (API doesn't support ?id= param)
- [x] Interaction timeline: merges conversations + consent logs client-side with unified sort
- [Phase 09-real-data]: Webhook uses 'open' status for new conversations (not 'pending' which is not in schema enum)
- [Phase 09-real-data]: Campaign send now resolves real segment voters and dispatches via Evolution API sendText with real sent/delivered/failed counters.
- [Phase 09-real-data]: Scheduled campaigns persist as status=scheduled with scheduledAt and the send route rejects premature manual sends.
- [Phase 09-real-data]: Campaign chip selection is persisted in the campaign record and reused by both manual sends and scheduled dispatcher runs.
- [Phase 09-real-data]: Voters API list/search now returns paginated metadata while GET /api/voters?id=... remains a single-resource response for CRM consumers.
- [Phase 09-real-data]: CRM voter profile now loads the voter by ID before related conversations/compliance fetches, and CRM mutations refresh pagination boundaries explicitly.
- [Phase 09-real-data]: Stored segment filters as operator plus filters payloads while keeping legacy array parsing for backward compatibility.
- [Phase 09-real-data]: Segments API now derives live filter options and campaign usage metadata so the segmentation UI stays bound to real voter data.
- [Phase 09-real-data]: Agent replies only persist after Evolution sendText succeeds, preventing false-positive chat history.
- [Phase 09-real-data]: Conversations now store `chipId`, so outbound replies prefer the bound chip before falling back to the first connected instance or config default.
- [Phase 09-real-data]: New conversations require selecting an existing voter so HITL threads stay linked to CRM data.
- [Phase 09-real-data]: Dashboard voter totals now read the paginated /api/voters response via limit=1 and use its total metadata instead of assuming an array payload.
- [Phase 09-real-data]: Reports aggregate sends by campaign updatedAt over 7-day and 14-day windows so KPI cards, bars, and CSV exports stay aligned.
- [Phase 09-real-data]: Monitoring now reads persisted delivery events, while aggregate counters remain responsible only for KPI and progress displays.
- [Phase 09-real-data]: Campaign edit now uses the same editor affordances as creation, but loads by ID, saves via PUT, and becomes read-only for sent or sending records.
- [Phase 09-real-data]: CRM action links now propagate voter context through query params so conversations and campaign creation can start from a specific voter workflow.
- [Phase 09-real-data]: Campaign sends now persist delivery events and scheduled campaigns execute through `/api/cron/campaigns` using the same shared send pipeline as manual dispatches.
- [Phase 09-real-data]: Monitor now reads persisted delivery events via `include=deliveryEvents`, keeping counters for KPI cards and events for the audit timeline.
- [Phase 09-real-data]: CRM-originated campaign creation resolves into an idempotent single-voter segment instead of stopping at a contextual hint.
- [x] Phase 11 verification will use one shared evidence ledger (`11-VERIFICATION.md`) instead of scattered notes.
- [x] Failures discovered during Phase 11 should be routed into explicit gap work after the sweep, not silently absorbed into the verification pass.
- [Phase 11]: Production verification currently uses the deployed app because the local shell lacks a ready DB/session environment.
- [Phase 11]: `/api/warming` is stateful on authenticated GET and cannot be treated as a read-safe baseline endpoint.
- [Phase 11]: Release readiness is blocked by three independent layers of drift: target DB schema, production deploy parity, and current-head UI/runtime regressions.
- [Phase 11]: `/compliance` now expects paginated voter data handling, and `/relatorios` needs a hydration-safe SVG title before release sign-off.
- [Phase 12-campaign-personalization-completion]: Candidate identity stays in the existing config/settings flow instead of introducing a parallel model.
- [Phase 12-campaign-personalization-completion]: Campaign placeholder metadata, extraction, validation, and preview/runtime builders now live in one shared module.
- [Phase 12-campaign-personalization-completion]: Create, edit, and schedule surfaces validate the effective campaign templates as one unit, including Variant B when A/B testing is enabled.
- [Phase 12-campaign-personalization-completion]: Manual sends use the actual execution date for `{data}`, while cron-triggered scheduled sends use the campaign scheduled date and pause safely on pre-send failure.
- [Phase 13-zero-pendency-release-closure]: The remaining work should be closed as one final milestone phase, not left as disconnected deferred backlog notes.
- [Phase 13-zero-pendency-release-closure]: Final phase completion requires live deploy/UAT parity, not only local code completion.
- [Phase 14-chip-health-reliability]: healthStatus added as separate text field (not enum) to avoid Postgres ALTER TYPE migration complexity on existing enum.
- [Phase 14-chip-health-reliability]: sendText now returns SendTextResponse with message key — breaking change that gives Phase 17 delivery tracking its foundation.
- [Phase 14-chip-health-reliability]: Restart action added to PUT /api/chips with action='restart' param to avoid a separate endpoint.
- [Phase 14-chip-health-reliability]: Webhook updates lastWebhookEvent on EVERY event type to enable accurate health staleness detection.
- [Phase 15-mass-messaging-engine]: Message queue uses 8-state lifecycle: queued→assigned→sending→sent→delivered→read→failed→retry
- [Phase 15-mass-messaging-engine]: Chip scoring weights: health(100/50) + capacity(50) + affinity(50) - errors + freshness
- [Phase 15-mass-messaging-engine]: Random delay 15-60s between messages for anti-ban protection; time window 8:00-20:00
- [Phase 15-mass-messaging-engine]: Spintax resolves randomly; greetings are time-aware; emoji added at 30% chance per strategic position
- [Phase 15-mass-messaging-engine]: Campaign cron hydrates to queue; send-queue cron delivers (separation of concerns)
- [Phase 15-mass-messaging-engine]: Chip failover triggers when chip becomes quarantined; pending messages reset to queued status
- [Phase 16-group-management]: Groups table stores groupJid, invite link, capacity, status (active/full/archived)
- [Phase 16-group-management]: Overflow detected at 90% capacity, groups marked full at 100%
- [Phase 16-group-management]: GROUP_PARTICIPANTS_UPDATE webhook updates group size on join/leave
- [Phase 16-group-management]: {link_grupo} variable resolves to active group invite link in campaigns
- [Phase 20-critical-fixes]: Webhook stale threshold increased from 2min to 5min for more reliable connection status
- [Phase 20-critical-fixes]: Message feed now merges outbound (queue) + inbound (conversations) messages
- [Phase 20-critical-fixes]: Operations tab auto-refreshes every 10 seconds when active
- [Phase 20-critical-fixes]: Segment-to-group mapping via getGroupForSegment and getOrCreateGroupForSegment helpers
- [Phase 20-critical-fixes]: Admin phone numbers can be auto-promoted when creating groups for segments
- [Phase 21]: Fallback chips selected with +100 priority for shared segments during failover
- [Phase 21]: Notifications stored in-memory (cleared on server restart) for operational alerts
- [Phase 21]: In-memory cache for group links (cleared on server restart) - acceptable for MVP since campaign hydration is short-lived
- [Phase 21]: Group resolution uses segmentTag instead of campaignId for proper segment-group mapping
- [Phase 21]: Tooltips use localStorage to track which were seen (simple, no DB needed for MVP)
- [Phase 21]: Action suggestions derived from system state analysis (chips, groups, campaigns)
- [Phase 21]: Keyboard shortcuts follow common patterns (single letters for nav, Ctrl+key for actions)
- [Phase 21]: Created wizard at /wizard instead of /setup to avoid conflict with existing system setup page
- [Phase 21]: Used localStorage for wizard progress persistence (MVP approach, DB sync can be added later)
- [Phase 31]: Direction filter merges outbound+inbound in memory before paginating (simpler than SQL UNION)
- [Phase 31]: Opt-in/out keyword detection only triggers for known voters (voterId not null) to avoid processing spam
- [Phase 31]: Gemini model fixed from gemini-2.5-flash-preview-04-17 (404) to gemini-2.5-flash (GA)
- [Phase 32]: system_logs batch writer uses in-memory buffer + 2s flush to prevent DB connection pool exhaustion
- [Phase 32]: SYSLOG_MIN_LEVEL=warn default drops debug/info logs in production; set to 'info' to see more
- [Phase 32]: Logs page uses appliedRef pattern to decouple filter state from fetch triggers, avoiding stale closure storms
- [Phase 32]: system_logs table indexes on created_at, level, category for fast filter queries
- [Phase 33-performance-optimization]: CSS @keyframes replaces framer-motion for page transitions — saves ~40KB from critical path
- [Phase 33-performance-optimization]: recharts lazy-loaded via next/dynamic on /relatorios only — defers ~200KB to client-side
- [Phase 33-performance-optimization]: In-memory session cache: 60s TTL, 500 entry max, immediate invalidation on logout
- [Phase 33-performance-optimization]: All 6 polling intervals use visibilitychange guard — zero API calls from backgrounded tabs
- [Phase 33-performance-optimization]: SSE poll interval 1.5s -> 5s with voter cache — DB queries reduced ~70% per connection
- [Phase 33-performance-optimization]: filterVotersPaginated() added alongside filterVoters() — non-breaking, compliance callers unaffected
- [Phase 34-remaining-performance]: DB-based cron lock (cron_locks table, INSERT...ON CONFLICT DO NOTHING) chosen over Redis — no extra infra, postgres already available
- [Phase 34-remaining-performance]: Cron lock TTL = 1.5x maxDuration (e.g. 60s max → 90000ms TTL) as safety margin for crashed/hung jobs
- [Phase 34-remaining-performance]: SSE connection limits: 3/user, 50 global, 5-minute max lifetime — prevents DB pool exhaustion from unbounded SSE connections
- [Phase 34-remaining-performance]: SWR chosen over React Query for SidebarLayout — 4KB vs 13KB gzipped; no provider wrapper needed for simple dedup use case
- [Phase 34-remaining-performance]: Log retention 30 days via daily cron (not trigger-based) — simple, predictable, schedulable in vercel.json
- [Phase 35-campaign-management]: layout.tsx is now a passthrough — each campaign sub-page owns its own SidebarLayout wrapper
- [Phase 35-campaign-management]: SYSLOG_MIN_LEVEL default changed from 'warn' to 'info' — cron activity visible in /logs without env override
- [Phase 35]: Migration numbered 0014 (not 0013 as planned) — cron_locks already used 0013 in Phase 34
- [Phase 35]: All 21 new schema columns have defaults matching current hardcoded values in send-queue cron — no data loss on migration
- [Phase 35-campaign-management]: SendConfigPanel is a single reusable component shared across all three campaign pages
- [Phase 35-campaign-management]: Speed presets (Lento/Normal/Rapido) map to named constant config bundles — operators pick preset, then optionally expand advanced controls
- [Phase 35-campaign-management]: handleSendNow() persists config via PUT before triggering send — guarantees latest config is in DB before queue hydration
- [Phase 35-campaign-management]: send-queue groups messages by campaignId and processes each campaign with its own config (batch size, delays, time windows)
- [Phase 35-campaign-management]: Circuit breaker pauses campaign immediately when error rate >= threshold (default 5%) after min 5 attempts
- [Phase 35-campaign-management]: selectBestChip accepts optional CampaignChipConstraints — backward compatible, no constraints = existing affinity scoring

## Accumulated Context

### Roadmap Evolution
- Phase 10 added: Real-Time Chat via SSE
  - Origin: deferred post-Phase 09 work to replace polling in chat surfaces with real-time transport.
- Phase 11 added: Full-System Verification + UAT Sweep
  - Origin: user requested a complete test plan to verify every shipped functionality before release preparation.
- Phase 12 added: Campaign Personalization Completion
  - Origin: post-deploy UAT on the campaign editor showed that candidate data has no real configuration source and the variable contract diverges between editor preview and outbound delivery.
- Phase 13 added: Zero-Pendency Release Closure
  - Origin: user requested a plan to close every remaining page/feature gap and leave the milestone with no unresolved pending items.

## Blockers
- None. Phase 13 closed the remaining milestone gaps and the final production-backed sweep ended green.

## Key Files (Current)
```
src/db/
  schema.ts             # 13 tables: config, chips, contacts, clusters, chip_clusters, contact_clusters,
                        #   logs, sessions, voters, segments, campaigns, segmentVoters,
                        #   conversations, conversationMessages, consentLogs, users, messageQueue

src/lib/
  db-chips.ts           # Chip CRUD
  db-contacts.ts        # Contact CRUD
  db-voters.ts          # Voter CRUD + bulk insert + search + segment join ✅ NEW
  db-campaigns.ts       # Campaign CRUD + status filter + hydration ✅ NEW
  db-segments.ts        # Segment CRUD + voter association (transactional) ✅ NEW
  db-conversations.ts   # Conversation CRUD + message append ✅ NEW
  db-compliance.ts      # Consent logging + stats ✅ NEW
  db-users.ts           # User CRUD ✅ NEW
  db-message-queue.ts   # Message queue CRUD + lifecycle ✅ NEW
  chip-router.ts        # Chip selection with scoring ✅ NEW
  message-variation.ts  # Spintax, greetings, emoji variation ✅ NEW
  phone.ts              # E.164 normalization + display formatting ✅ NEW

src/app/api/
  voters/route.ts       # GET(search) POST PUT DELETE ✅ NEW
  campaigns/route.ts    # GET(status) POST PUT DELETE ✅ NEW
  segments/route.ts     # GET POST PUT DELETE ✅ NEW
  cron/
    send-queue/route.ts # Queue processor cron ✅ NEW
    reset-counters/route.ts # Counter reset cron ✅ NEW
    campaigns/route.ts  # Updated to hydrate to queue ✅

src/components/
  SidebarLayout.tsx     # V2 shell with 8 electoral nav items + legacy section ✅
  topbar.tsx            # V2 Topbar (search, period, alerts, profile) ✅
```

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-v2-shell | 01 | 18 min | 2/2 | 2 |
| 01-v2-shell | 02 | 12 min | 2/2 | 2+1 created |
| 02-db-schema | 01 | 20 min | 2/2 | 1+3 created |
| 02-db-schema | 02 | 22 min | 2/2 | 1+6 created |
| 03-import-segmentation | 01 | 25 min | 4/4 | 2 created |
| 03-import-segmentation | 02 | 15 min | 2/2 | 1 created |
| 04-campaigns | 01 | 30 min | 5/5 | 4 created |
| 04-campaigns | 02 | 25 min | 5/5 | 5 created |
| 05-dashboard-v2 | 01 | 20 min | 5/5 | 2 modified/created |
| 05-dashboard-v2 | 02 | 15 min | 4/4 | 2 created |
| 06-hitl-crm | 01 | 20 min | 3/3 | 3 created |
| 06-hitl-crm | 02 | 20 min | 5/5 | 4 created |
| 07-compliance-admin | 01 | 15 min | 4/4 | 3 modified/created |
| 07-compliance-admin | 02 | 15 min | 4/4 | 2 created |
| 08-reports-polish | 01 | 15 min | 4/4 | 1 created |
| 08-reports-polish | 02 | 10 min | 4/4 | 1 modified |
| Phase 09-real-data P01 | 3 | 2 tasks | 1 files |
| Phase 09-real-data P02 | 2 min | 2 tasks | 3 files |
| Phase 09-real-data P04 | 4 min | 2 tasks | 4 files |
| Phase 09-real-data P05 | 23 min | 2 tasks | 2 files |
| Phase 09-real-data P03 | 7 min | 2 tasks | 3 files |
| Phase 09-real-data P06 | 12 min | 2 tasks | 4 files |
| Phase 09-real-data P07 | 7 min | 2 tasks | 4 files |
| Phase 12-campaign-personalization-completion P01 | 4 min | 2 tasks | 6 files |
| Phase 12-campaign-personalization-completion P02 | 12 min | 2 tasks | 6 files |
| Phase 12-campaign-personalization-completion P03 | 2 min | 2 tasks | 2 files |
| 14-chip-health-reliability P01 | 18 min | 2/2 | 6 files |
| 14-chip-health-reliability P02 | 15 min | 2/2 | 3 files |
| 15-mass-messaging-engine P01 | 20 min | 4/4 | 6 files |
| 15-mass-messaging-engine P02 | 12 min | 4/4 | 5 files |
| 15-mass-messaging-engine P03 | 10 min | 2/2 | 3 files |
| 16-group-management P01 | 15 min | 6/6 | 5 files |
| 16-group-management P02 | 20 min | 8/8 | 10 files |
| 17-delivery-tracking P01 | 18 min | 6/6 | 5 files |
| 17-delivery-tracking P02 | 15 min | 7/7 | 6 files |
| 18-ai-lead-analysis P01 | 20 min | 6/6 | 8 files |
| 18-ai-lead-analysis P02 | 15 min | 7/7 | 5 files |
| 19-operations-dashboard P01 | 15 min | 5/5 | 4 files |
| 19-operations-dashboard P02 | 12 min | 6/6 | 5 files |
| 19-operations-dashboard P03 | 5 min | 6/6 | 0 files |
| 20-critical-fixes P01 | 10 min | 8/8 | 6 files |
| Phase 21 P04 | 15 | 5 tasks | 8 files |
| Phase 21 P01 | 15 min | 8 tasks | 8 files |
| Phase 21 P02 | 6 | 5 tasks | 4 files |
| Phase 21 P06 | 12 min | 7 tasks | 11 files |
| Phase 21 P05 | 18 | 8 tasks | 10 files |
| Phase 21 P07 | 25 | 7 tasks | 15 files |
| 22-ui-polish P01 | 12 min | 3/3 | 6 files |
| 22-ui-polish P02 | 5 min | 1/1 | 1 file |
| 22-ui-polish P03 | 10 min | 2/2 | 3 files |
| 22-ui-polish P04 | 15 min | 2/2 | 2 files |
| 22-ui-polish P05 | 20 min | 2/2 | 1 file |
| 22-ui-polish P06 | 8 min | 1/1 | 1 file |
| 22-ui-polish P07 | 20 min | 2/2 | 3 files |
| 22-ui-polish P08 | 10 min | 2/2 | 2 files |
| 23-critical-layout P01 | 8 min | 2/2 | 2 files |
| 23-critical-layout P02 | 10 min | 2/2 | 2 files |
| 24-operations-unification P01 | 12 min | 2/2 | 3 files |
| 24-operations-unification P02 | 15 min | 2/2 | 3 files |
| 25-conversas-overhaul P01 | 18 min | 2/2 | 2 files |
| 25-conversas-overhaul P02 | 15 min | 1/1 | 1 file |
| 25-conversas-overhaul P03 | 20 min | 2/2 | 2 files |
| 26-campanhas-segmentacao P01 | 18 min | 1/1 | 1 file |
| 26-campanhas-segmentacao P02 | 20 min | 2/2 | 1 file |
| 27-crm-overhaul P01+P02 | 35 min | 3/3 | 1 file |
| 28-relatorios-pro P01+P02 | 20 min | 3/3 | 2 files |
| 29-config-perfil P01 | 15 min | 2/2 | 2 files |
| 29-config-perfil P02 | 15 min | 2/2 | 2 files |
| 30-header-cleanup P01 | 20 min | 1/1 | 2 files |
| 30-header-cleanup P02 | 10 min | 2/2 | 7 files |
| 31-diagnostic-fixes P01 | 25 min | 3/3 | 3 files |
| 31-diagnostic-fixes P02 | 15 min | 2/2 | 4 files |
| 31-diagnostic-fixes P03 | 20 min | 3/3 | 3 files |
| 31-diagnostic-fixes P04 | 15 min | 2/2 | 2 files |
| 31-diagnostic-fixes P05 | 15 min | 2/2 | 2 files |
| 32-system-logs P01 | 20 min | 4/4 | 7 files |
| 32-system-logs P02 | 25 min | 3/3 | 3 files |
| 32-system-logs P03 | 20 min | 3/3 | 3 files |
| Phase 33-performance-optimization P33-01 | 5 min | 2 tasks | 7 files |
| Phase 33-performance-optimization P33-02 | 3 min | 1 tasks | 1 files |
| Phase 33-performance-optimization P33-03 | 7 min | 2 tasks | 7 files |
| Phase 33-performance-optimization P33-04 | 5 min | 2 tasks | 6 files |
| Phase 34-remaining-performance P34-01 | 15 min | 2 tasks | 10 files |
| Phase 34-remaining-performance P34-02 | 10 min | 1 task | 1 file |
| Phase 34-remaining-performance P34-03 | 12 min | 2 tasks | 3 files |
| Phase 34-remaining-performance P34-04 | 8 min | 2 tasks | 2 files |
| Phase 35-campaign-management P01 | 7 min | 2 tasks | 12 files |
| Phase 35 P02 | 12 min | 2 tasks | 2 files |
| Phase 35-campaign-management P03 | 25 min | 2 tasks | 4 files |
| Phase 35-campaign-management P04 | 20 min | 2 tasks | 2 files |

## Next Actions

**Milestone 4 Complete — All 32 Phases Executed and Deployed**

Optional next steps (if needed):
1. Set `SYSLOG_MIN_LEVEL=info` on server `.env` to see info-level logs on `/logs` page (currently only warn/error visible)
2. Add log retention cron: `DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '7 days'`
3. Start new Milestone 5 planning if new features are required
