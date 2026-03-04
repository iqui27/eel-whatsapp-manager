# EEL Eleicao — Project Definition

## Product

**EEL Eleicao** — WhatsApp electoral campaign dashboard.

Transform the existing EEL chip warming manager into a full electoral campaign operations center. Mass messaging to voters, voter CRM, human-in-the-loop chat, LGPD compliance, team permissions, and AI-assisted recommendations — all in a single dashboard.

## User

Political campaign operators (coordenadores, cabos eleitorais, voluntarios) who need to:
- Import voter bases (CSV with CPF, phone, zone, section)
- Segment voters by demographics, geography, and behavior
- Create and A/B test campaign messages with dynamic variables
- Schedule mass sends within compliant time windows
- Chat directly with voters who respond (human-in-the-loop)
- Track engagement, delivery rates, and cost per contact
- Maintain LGPD compliance (opt-in, anonymization, audit trail)
- Manage multi-user access with role-based permissions

## Vision

A "magical" product where even non-technical operators can run a sophisticated campaign. Wizard onboarding, contextual explanations, AI recommendations, and zero-friction flows. The user should never feel lost — every screen has explanatory microcopy and a "Guided Mode" option.

## Selected Visual Direction

**V2 — Radix Command (Editorial Light)**
- Light background (`#F8F6F1` warm white)
- Serif headlines, clean white cards, subtle borders
- Color-coded timeline entries
- Compact operational data tables (DataGrid style)
- Command panel on right side
- Chat queue integrated directly in the dashboard
- Density: Compact, Theme: Slate

**Paper artboard:** `26T-0` ("EEL - SELECTED V2 (Radix Command)")

## Existing Codebase

The project already has a working deployed app (`zap.iqui27.app`) with:

### Tech Stack (locked)
- Next.js 16 + React 19
- Tailwind CSS 4 + shadcn/ui (new-york style)
- Supabase PostgreSQL + Drizzle ORM
- Recharts (charts), Framer Motion (animations), Sonner (toasts), Lucide (icons)
- Radix UI primitives (already in dependencies)

### What Exists
- **6 completed phases:** Design system, Supabase/Drizzle foundation, layout/nav, premium dashboard, pages overhaul, polish/animations
- **8 pages:** Dashboard, Chips, Contacts, Clusters, History, Settings, Login, Setup
- **Full API layer:** CRUD for all entities, auth, warming engine, cron, webhook
- **DB schema:** config, chips, contacts, clusters, chip_clusters, contact_clusters, logs, sessions
- **Components:** SidebarLayout (collapsible + mobile), ThemeProvider, CommandPalette, PageLoading, EmptyState, 7 shadcn/ui primitives

### Known Technical Debt
1. `warming.ts` still uses legacy JSON file-based libs (data consistency risk)
2. `webhook/route.ts` uses legacy JSON imports
3. `proxy.ts` (middleware) exists but is not wired
4. All pages are `'use client'` with `useEffect` fetching (no RSC, no SWR)
5. Setup page has hardcoded dark colors (theme-inconsistent)
6. No form validation library
7. Missing many shadcn components (Dialog, Sheet, Table, Tabs, Textarea, etc.)

## Constraints

1. **Election-specific:** Every feature must serve electoral campaign operations
2. **V2 Editorial Light:** All new UI follows the selected Paper direction
3. **Existing stack:** No new frameworks — extend what's there (Next.js, shadcn, Drizzle)
4. **Chat in dashboard:** Conversation list + reply must be accessible from the main dashboard, not a separate page
5. **User-friendly:** Wizard onboarding, contextual help, guided mode on every screen
6. **LGPD compliance:** Opt-in tracking, anonymization, audit trail are not optional
7. **Mobile-ready:** Offline capture form + priority inbox for field workers

## MVP Priority (from Paper Flow Map)

| Priority | Feature | Description |
|----------|---------|-------------|
| **P0** | Importacao | CSV upload + field mapping + validation |
| **P0** | Segmentacao | Tags + AND/OR filters + audience preview |
| **P0** | Campanhas | Message editor + variables + preview + A/B |
| **P0** | Envio e Monitor | Real-time delivery + scheduling |
| **P1** | HITL + CRM | Handoff, chat, voter profile, engagement score |
| **P2** | Compliance | Opt-in tracking, anonymization, audit |
| **P2** | Admin | Multi-user, roles, region-scoped permissions |
| **P2** | Relatorios | Auto reports, ROI, cost per contact |

## Critical Risks

1. **Meta account blocking** — Rate limiting, warm-up patterns, reputation management
2. **Sending without explicit opt-in** — LGPD violation risk
3. **Failing to respond to hot conversations** — Lost voter engagement
