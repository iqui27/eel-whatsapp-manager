# Phase 06 Plan 02: CRM Voter Profile Summary

**Phase:** 06-hitl-crm
**Plan:** 06-02
**Subsystem:** CRM / Voter Profiles
**Tags:** crm, voters, profile, engagement, timeline, compliance
**Commit:** ace1174

## One-liner

CRM voter list with debounced search + voter profile page with engagement score circle, editable tags, interaction timeline (conversations + consent logs), and localStorage checklist/notes.

## What Was Built

- `src/app/crm/page.tsx`: voter list — debounced search (300ms → GET /api/voters?search=), data table with engagement bar (0–100 with color coding), opt-in status badges, tag chips (first 2 + overflow count), "View profile" action
- `src/app/crm/[id]/page.tsx`: full voter profile —
  - Header card: name, phone, masked CPF, zone/section, city/neighborhood
  - Engagement score: large SVG circle indicator, color-coded (red/amber/green), label (frio/morno/quente)
  - Opt-in badge + date
  - Editable tag chips: click × to remove, inline add input, PUT /api/voters on save
  - Interaction timeline: conversations (MessageSquare icon) + consent logs (Shield icon) merged and sorted by date desc
  - Checklist: 4 pre-defined items stored in localStorage per voter
  - Notes textarea: localStorage per voter with "Salvar notas" button
- `src/app/api/compliance/route.ts`: GET consent logs with optional `?voterId=` filter
- `src/app/api/conversations/route.ts`: `?voterId=` filter already present from Plan 06-01 (confirmed in place)

## Key Decisions

- Checklist and notes use localStorage (per voter key) — DB persistence deferred; acceptable for MVP single-user context
- Engagement score rendered as SVG circle (no external chart lib) — keeps bundle lean
- Voter profile fetches all voters then filters by ID client-side (workaround for /api/voters not supporting ?id= param)
- Timeline merges two API responses (conversations + consent logs) client-side with unified sort

## Deviations from Plan

None — plan executed exactly as written.

## Files Created/Modified

**Created:**
- src/app/crm/page.tsx
- src/app/crm/[id]/page.tsx
- src/app/api/compliance/route.ts

**Modified:**
- src/app/api/conversations/route.ts (voterId filter — done in Plan 06-01)

## Build

- TypeScript: 0 errors
- Next.js build: 35 pages, 0 errors
