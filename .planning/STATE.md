# EEL Eleicao — Project State

## Current Position
**Starting Phase 01 (V2 Shell + Design Tokens) + Phase 02 (DB Schema Expansion)**
Wave 1 — both phases can run in parallel.

## Project History

### EEL v1 (Chip Warming Manager) — COMPLETE
All 6 original phases shipped and deployed to `zap.iqui27.app`:
- Phase 1: Design System + Paper Prototyping
- Phase 2: Foundation (Supabase/Drizzle)
- Phase 3: Layout & Navigation
- Phase 4: Dashboard Premium + Charts
- Phase 5: Pages Overhaul
- Phase 6: Polish & Animations
- Deploy: Evolution API v2, auth fixes, standalone output

### EEL Eleicao (Electoral Campaign Dashboard) — IN PROGRESS
Paper design complete (22 artboards). V2 Editorial Light selected. Roadmap created.

## Decisions Made
- [x] Visual direction: V2 Editorial Light (Radix Command) — from Paper exploration
- [x] Database: Supabase PostgreSQL (already in use)
- [x] ORM: Drizzle (already in use)
- [x] Chat in dashboard: Panel integrated in main view, not separate page
- [x] UX philosophy: Wizard + guided mode + explanatory microcopy
- [x] MVP priority: P0 = Import → Segmentation → Campaigns → Send/Monitor
- [x] Keep existing stack (Next.js 16, React 19, shadcn/ui, Tailwind 4)

## Blockers
None.

## Key Files (Current)
```
.planning/
  PROJECT.md           # Product definition
  ROADMAP.md           # 8-phase roadmap with requirements
  STATE.md             # This file
  DESIGN-BRIEF.md      # Original design tokens
  PAPER-WIREFRAMES-ELEICAO.md  # Full IA + wireframe specs
  SUPABASE-SCHEMA.md   # Existing DB schema

src/app/
  page.tsx              # Dashboard (to be rebuilt as V2)
  layout.tsx            # Root layout (Geist fonts, ThemeProvider)
  template.tsx          # Framer Motion page transitions
  chips/page.tsx        # Chips CRUD
  contacts/page.tsx     # Contacts CRUD
  clusters/page.tsx     # Clusters card list
  history/page.tsx      # Logs table
  settings/page.tsx     # Settings sections
  login/page.tsx        # Login
  setup/page.tsx        # Setup wizard

src/db/
  index.ts              # Drizzle client
  schema.ts             # Current tables: config, chips, contacts, clusters, logs, sessions

src/components/
  SidebarLayout.tsx     # Current shell (to be replaced with V2)
  command-palette.tsx   # Cmd+K palette
  theme-provider.tsx    # Dark/light theme
  ui/                   # shadcn primitives (button, card, input, label, select, skeleton, switch)
```

## Next Actions
1. Plan Phase 01 (V2 Shell) — detailed PLAN.md with tasks
2. Plan Phase 02 (DB Schema) — detailed PLAN.md with tasks
3. Execute Wave 1 in parallel
