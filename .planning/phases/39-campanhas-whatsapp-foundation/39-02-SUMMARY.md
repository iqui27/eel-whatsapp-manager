---
phase: 39-campanhas-whatsapp-foundation
plan: "02"
subsystem: campaign-editor
tags: [whatsapp-preview, campaign, ui, schema, date-range]
dependency_graph:
  requires: ["39-01", "38-01"]
  provides: [shared-whatsapp-preview-in-campaigns, campaign-date-range]
  affects: [campaign-create-page, campaign-edit-page, campaigns-schema]
tech_stack:
  added: []
  patterns: [shared-component-reuse, drizzle-schema-migration]
key_files:
  created:
    - drizzle/0016_campaign_date_range.sql
  modified:
    - src/app/campanhas/nova/page.tsx
    - src/app/campanhas/[id]/editar/page.tsx
    - src/db/schema.ts
decisions:
  - "Chip profile resolved from sendConfig.selectedChipIds[0] falling back to first connected chip — consistent with campaign send logic"
  - "resolveCampaignTemplate called before passing to shared WhatsAppPreview since shared component uses parseWhatsAppFormat not campaign variable resolution"
  - "startDate/endDate nullable in schema — campaigns remain valid without date range (one-shot campaigns)"
  - "Migration uses IF NOT EXISTS guard for safe re-runs"
metrics:
  duration: "8 min"
  completed: "2026-03-20"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 39 Plan 02: Campaign WhatsApp Preview + Date Range Summary

Replaced duplicated inline WhatsApp preview components in campaign editor pages with the shared `WhatsAppPreview` from Phase 39-01, connected chip profile data, and added nullable `startDate`/`endDate` campaign date range to the schema and both editor UIs.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace inline previews with shared WhatsAppPreview + chip profile | 378a433 | nova/page.tsx, editar/page.tsx |
| 2 | Add campaign date range to schema and forms | 7b33700 | schema.ts, 0016 migration, nova/page.tsx, editar/page.tsx |

## What Was Built

**Task 1 — Shared Preview Integration**

Both campaign editor pages (`nova` and `editar`) previously had a private `WhatsAppPreview` function component duplicating the phone-frame UI with hardcoded "EEL Eleição" branding. These were removed and replaced with the shared `WhatsAppPreview` from `src/components/whatsapp-preview.tsx`.

Key integration points:
- `resolveCampaignTemplate(message, previewContext)` is called inline so the shared component receives resolved text (it uses `parseWhatsAppFormat` internally, not campaign variable resolution)
- A `selectedChipProfile` state tracks `{ profileName, profilePictureUrl }` derived from chips
- A `useEffect` syncs the profile whenever `allChips` or `sendConfig.selectedChipIds` changes — first selected chip wins, falling back to first connected chip
- Both fields come from the existing `profileName` and `profilePictureUrl` columns added in Phase 38

**Task 2 — Campaign Date Range**

Schema: `startDate` (timestamp with time zone, nullable) and `endDate` (timestamp with time zone, nullable) added to `campaigns` table in `schema.ts`. Migration `0016_campaign_date_range.sql` uses `ADD COLUMN IF NOT EXISTS` for safe re-runs.

UI: A "Periodo da Campanha" card with two native `<input type="date">` pickers added to both create and edit forms. Inputs are optional (empty = one-shot campaign), disabled when campaign is locked, and validated client-side (endDate must be after startDate when both provided).

API: `POST /api/campaigns` and `PUT /api/campaigns` already pass through body fields to `addCampaign(body)` and `updateCampaign(id, updates)` — no API changes required.

## Deviations from Plan

**1. [Rule 2 - Missing] No maxLength fix needed**

The plan mentioned fixing a "100-char maxLength" on the textarea. Both pages' textareas had no `maxLength` attribute set at all (unlimited). No fix was required — the limit either never existed or was removed in a prior plan. Deviation logged but no change made.

**2. [Rule 3 - Blocking] Campaign type cast simplified**

The `startDate`/`endDate` cast `(campaign as Campaign & { startDate?: ... })` was initially added but removed immediately since the schema update makes those fields part of the native `Campaign` type. TypeScript confirmed clean with `tsc --noEmit`.

## Self-Check: PASSED

Files exist:
- [x] drizzle/0016_campaign_date_range.sql
- [x] src/app/campanhas/nova/page.tsx (contains `WhatsAppPreview` import from whatsapp-preview)
- [x] src/app/campanhas/[id]/editar/page.tsx (contains `WhatsAppPreview` import from whatsapp-preview)
- [x] src/db/schema.ts (contains `startDate` and `endDate`)

Commits exist:
- [x] 378a433 — feat(39-02): replace inline WhatsApp previews with shared component
- [x] 7b33700 — feat(39-02): add campaign date range fields to schema and forms

Build: `npx next build` completed without errors.
