# EEL Eleicao — Project State

## Current Position
**Phase 01 (V2 Shell) — COMPLETE** ✅
**Phase 02 (DB Schema) — COMPLETE** ✅
**Phase 03 (Import + Segmentation) — COMPLETE** ✅
**Phase 04 (Campaign Editor + Send) — COMPLETE** ✅
**Phase 05 (Dashboard V2 + Chat Panel) — COMPLETE** ✅
**Phase 06 (HITL Conversations + CRM) — COMPLETE** ✅
Waves 1–5 complete.

Progress: Phase 01 (2/2) + Phase 02 (2/2) + Phase 03 (2/2) + Phase 04 (2/2) + Phase 05 (2/2) + Phase 06 (2/2) = 12 plans done.

Last session: 2026-03-05 — Completed Phase 06 (HITL Conversations + CRM: three-column chat UI, voter CRM profile, compliance API)
Stopped at: Phase 07 (Compliance + Admin) — next up

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

## Next Actions
1. Execute Phase 07 (Compliance + Admin) — LGPD consent management, audit trail, user/role admin
2. Execute Phase 08 (Reports + Polish) — analytics reports, final UX polish
