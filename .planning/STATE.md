---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 09
current_phase_name: real data
current_plan: 7
status: executing
stopped_at: Completed 09-real-data-06-PLAN.md
last_updated: "2026-03-06T00:14:00.949Z"
last_activity: 2026-03-06
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 23
  completed_plans: 22
  percent: 96
---

# EEL Eleicao — Project State

## Current Execution
**Current Phase:** 09
**Current Phase Name:** real data
**Current Plan:** 7
**Total Phases:** 9
**Total Plans in Phase:** 7
**Status:** Ready to execute
**Progress:** [██████████] 96%
**Last Activity:** 2026-03-06
**Last Activity Description:** Completed 09-03 Conversations WhatsApp Integration; Wave 1 is complete and Wave 2 continues with 09-06 and 09-07
**Stopped At:** Completed 09-real-data-06-PLAN.md

## Current Position
**Phase 01 (V2 Shell) — COMPLETE** ✅
**Phase 02 (DB Schema) — COMPLETE** ✅
**Phase 03 (Import + Segmentation) — COMPLETE** ✅
**Phase 04 (Campaign Editor + Send) — COMPLETE** ✅
**Phase 05 (Dashboard V2 + Chat Panel) — COMPLETE** ✅
**Phase 06 (HITL Conversations + CRM) — COMPLETE** ✅
**Phase 07 (Compliance + Admin) — COMPLETE** ✅
**Phase 08 (Reports + Polish) — COMPLETE** ✅
**Phase 09 (Real Data + Integrations) — IN PROGRESS** 📋
- Plans completed: 5/7 (`09-01`, `09-02`, `09-03`, `09-04`, `09-05`)

Progress: [█████████░] 91%

Last session: 2026-03-06T00:14:00.946Z

## Project History

### EEL v1 (Chip Warming Manager) — COMPLETE
All 6 original phases shipped and deployed to `zap.iqui27.app`.

### EEL Eleicao (Electoral Campaign Dashboard) — IN PROGRESS
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

**Phase 09 — Real Data + Integrations — IN PROGRESS** 📋
- 7 plans across 2 waves covering 30 audit issues
- Wave 1 (parallel): Plans 01, 02, 04, 05 — webhook, send pipeline, CRM, segmentation
- Wave 2 (depends on Wave 1): Plans 03, 06, 07 — conversations, dashboard/reports, campaign edit

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
- [x] campaign send is simulated (setTimeout) — real Evolution API integration is a separate hotfix phase
- [x] monitor auto-refresh via polling (3s interval) — adequate for MVP; WebSocket/SSE deferred
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
- [Phase 09-real-data]: Campaign chip selection is preserved client-side per campaign and forwarded to the send endpoint, avoiding a schema change in this plan.
- [Phase 09-real-data]: Voters API list/search now returns paginated metadata while GET /api/voters?id=... remains a single-resource response for CRM consumers.
- [Phase 09-real-data]: CRM voter profile now loads the voter by ID before related conversations/compliance fetches, and CRM mutations refresh pagination boundaries explicitly.
- [Phase 09-real-data]: Stored segment filters as operator plus filters payloads while keeping legacy array parsing for backward compatibility.
- [Phase 09-real-data]: Segments API now derives live filter options and campaign usage metadata so the segmentation UI stays bound to real voter data.
- [Phase 09-real-data]: Agent replies only persist after Evolution sendText succeeds, preventing false-positive chat history.
- [Phase 09-real-data]: Without a chipId column on conversations, outbound sends resolve to the first connected chip instance and fall back to config.instanceName.
- [Phase 09-real-data]: New conversations require selecting an existing voter so HITL threads stay linked to CRM data.
- [Phase 09-real-data]: Dashboard voter totals now read the paginated /api/voters response via limit=1 and use its total metadata instead of assuming an array payload.
- [Phase 09-real-data]: Reports aggregate sends by campaign updatedAt over 7-day and 14-day windows so KPI cards, bars, and CSV exports stay aligned.
- [Phase 09-real-data]: Monitoring uses aggregate delivery milestones because the current Evolution flow does not persist per-message delivery events.

## Blockers
None.

## Key Files (Current)
```
src/db/
  schema.ts             # 12 tables: config, chips, contacts, clusters, chip_clusters, contact_clusters,
                        #   logs, sessions, voters, segments, campaigns, segmentVoters,
                        #   conversations, conversationMessages, consentLogs, users

src/lib/
  db-chips.ts           # Chip CRUD
  db-contacts.ts        # Contact CRUD
  db-voters.ts          # Voter CRUD + bulk insert + search + segment join ✅ NEW
  db-campaigns.ts       # Campaign CRUD + status filter ✅ NEW
  db-segments.ts        # Segment CRUD + voter association (transactional) ✅ NEW
  db-conversations.ts   # Conversation CRUD + message append ✅ NEW
  db-compliance.ts      # Consent logging + stats ✅ NEW
  db-users.ts           # User CRUD ✅ NEW

src/app/api/
  voters/route.ts       # GET(search) POST PUT DELETE ✅ NEW
  campaigns/route.ts    # GET(status) POST PUT DELETE ✅ NEW
  segments/route.ts     # GET POST PUT DELETE ✅ NEW

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

## Next Actions
Continue Phase 09 Wave 2 execution for the remaining real-data plans.

**Wave 1 (parallel — no dependencies):**
- 09-01: Webhook + Inbound Pipeline ✅
- 09-02: Campaign Send Pipeline ✅
- 09-03: Conversations WhatsApp Integration ✅
- 09-04: CRM Voter Operations ✅
- 09-05: Segmentation Real Data ✅

**Wave 2 (after Wave 1):**
- 09-06: Dashboard + Reports Real Data (needs 09-02, 09-05)
- 09-07: Campaign Fixes + Voter Links (needs 09-02, 09-04)

**Deferred (post-Phase 09):**
- WebSocket/SSE for real-time chat (currently polling)
- DB-level permission enforcement in API routes
- Mobile offline capture form (MOB-01/MOB-02)
- Scheduled sends via background worker/cron
- Email scheduled report delivery (REP-02 partial)
