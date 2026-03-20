---
phase: 39-campanhas-whatsapp-foundation
plan: "01"
subsystem: campaigns
tags: [whatsapp, preview, formatting, components, utilities]
dependency_graph:
  requires: []
  provides: [WhatsAppPreview component, parseWhatsAppFormat, stripWhatsAppFormat, countWhatsAppChars]
  affects: [src/app/campanhas/nova/page.tsx, src/app/campanhas/editar, wizard]
tech_stack:
  added: []
  patterns: [pure-functions, format-tokenizer, segment-renderer, React-fragment-rendering]
key_files:
  created:
    - src/lib/whatsapp-format.ts
    - src/components/whatsapp-preview.tsx
  modified: []
decisions:
  - "Tokenizer uses priority-based span-coverage to prevent overlapping format markers; codeblocks claimed first"
  - "StatusIcon renders SVG check marks (no emoji) — matches plan requirement and project convention"
  - "Link preview card shows only domain (not full OG preview) — matches plan spec for simplicity"
  - "WhatsAppPreview accepts optional profilePictureUrl and falls back to initials from profileName"
metrics:
  duration_minutes: 15
  completed_date: "2026-03-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 39 Plan 01: WhatsApp Foundation — Shared Preview Component Summary

**One-liner:** Pure WhatsApp format tokenizer + accurate shared WhatsAppPreview component with dynamic chip profile, formatting support, and SVG status indicators.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create WhatsApp text formatting parser | `8f0f5f3` | `src/lib/whatsapp-format.ts` |
| 2 | Create shared WhatsAppPreview component | `b01ed6d` | `src/components/whatsapp-preview.tsx` |

## What Was Built

### Task 1 — `src/lib/whatsapp-format.ts`

Pure function library (no React imports) that tokenizes WhatsApp-formatted text into `FormatSegment[]`:

- `parseWhatsAppFormat(text)` — priority-based span tokenizer: codeblocks first, then bold/italic/strikethrough/monospace, then URLs, then linebreaks. Overlapping ranges are skipped correctly.
- `stripWhatsAppFormat(text)` — strips all format markers (regex replace chain), returning plain text.
- `countWhatsAppChars(text)` — length of stripped text, useful for char-count UIs.

Exported type: `FormatSegment` — discriminated union of text/bold/italic/strikethrough/monospace/codeblock/link/linebreak.

### Task 2 — `src/components/whatsapp-preview.tsx`

Shared `'use client'` component (~320px width) that renders an accurate WhatsApp chat preview:

- **Header bar** (`#075E54`): profile avatar (photo URL or computed initials) + profile name + phone icon.
- **Chat area** (`#ECE5DD`): outgoing bubble (`#DCF8C6`) with:
  - Formatted text via `parseWhatsAppFormat()` — each segment type styled with Tailwind (bold/italic/del/code/pre/link).
  - Optional media preview above the text (image/video waveform/audio placeholder/document icon).
  - Link preview card showing domain when URL is detected.
  - Timestamp + SVG delivery status (single check = sent, double check = delivered, blue double check = read).
- **Encryption footer** bar.

Props: `message`, `profileName`, `profilePictureUrl`, `timestamp`, `status`, `mediaUrl`, `mediaType`, `className`.

## Verification

- `npx next build` — passes without errors.
- TypeScript: `npx tsc --noEmit --skipLibCheck` — clean.
- Both files are importable; `WhatsAppPreview` and `parseWhatsAppFormat` are named exports ready for use in nova/editar/wizard pages.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/lib/whatsapp-format.ts`
- FOUND: `src/components/whatsapp-preview.tsx`
- FOUND: commit `8f0f5f3` (Task 1)
- FOUND: commit `b01ed6d` (Task 2)
- Build: passed
