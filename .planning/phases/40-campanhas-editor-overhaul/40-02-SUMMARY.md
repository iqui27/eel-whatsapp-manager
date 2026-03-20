---
phase: 40-campanhas-editor-overhaul
plan: "02"
subsystem: campaign-editor
tags: [whatsapp-formatting, toolbar, ai-assistant, gemini, validation, campaign-editor]
dependency_graph:
  requires: ["39-02", "40-01"]
  provides: [whatsapp-format-toolbar, campaign-editor-with-ai-and-formatting]
  affects: [campaign-create-page, campaign-edit-page]
tech_stack:
  added: []
  patterns: [toolbar-with-format-markers, cursor-management, active-format-detection]
key_files:
  created:
    - src/components/whatsapp-format-toolbar.tsx
  modified:
    - src/app/campanhas/nova/page.tsx
    - src/app/campanhas/[id]/editar/page.tsx
decisions:
  - "WhatsApp format toolbar uses native title attributes for tooltips — Tooltip shadcn component not available in this project"
  - "Variable dropdown uses custom backdrop-based popover — DropdownMenu shadcn not available"
  - "Toolbar uses React.RefObject<HTMLTextAreaElement | null> to match React 19 useRef typing"
  - "Toolbar integrated above textarea with rounded-t-none on textarea for seamless visual join"
  - "GeminiMessageAssistant hidden (not just disabled) for locked campaigns in edit page"
  - "Enhanced validation: name 3-100 chars, template empty check, 65536 char limit per plan spec"
metrics:
  duration: "4 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_changed: 3
---

# Phase 40 Plan 02: Campaign Editor Overhaul — Toolbar + AI Integration Summary

WhatsApp formatting toolbar and Gemini AI assistant wired into campaign create and edit pages with enhanced data validation before save.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create WhatsApp formatting toolbar | 2aba377 | src/components/whatsapp-format-toolbar.tsx |
| 2 | Integrate AI assistant + formatting toolbar + validation | 6285e31 | nova/page.tsx, editar/page.tsx |

## What Was Built

### Task 1 — WhatsAppFormatToolbar Component

Created `src/components/whatsapp-format-toolbar.tsx` — a compact toolbar that sits directly above the campaign message textarea:

**Props:**
- `textareaRef: React.RefObject<HTMLTextAreaElement | null>` — reference to the textarea to manipulate
- `onTextChange: (newText: string) => void` — callback to update parent state
- `currentText: string` — current textarea content
- `className?: string` — optional extra classes

**Format buttons:** Bold (`*`), Italic (`_`), Strikethrough (`~`), Monospace (`` ` ``) — each with a `title` attribute tooltip.

**Behavior:**
- When text is selected: wraps selection with `*selected*`, `_selected_`, etc.
- When no text selected: inserts double markers at cursor position, places cursor between them for immediate typing
- After every insertion: calls `onTextChange(newText)` and refocuses textarea with correct cursor via `requestAnimationFrame`

**Active state:** `useActiveFormats()` hook checks if cursor is currently inside a formatting pair and highlights the corresponding button.

**Variable dropdown:** Custom backdrop-based dropdown showing all `SUPPORTED_CAMPAIGN_VARIABLES` from `campaign-variables.ts`. Clicking a variable inserts it at cursor position and closes the menu.

**Styling:** `h-9` toolbar with warm `bg-[#F8F6F1]` matching V2 tokens, `rounded-t-lg border border-b-0` to visually connect with the textarea below it.

### Task 2 — Campaign Pages Integration

Both `src/app/campanhas/nova/page.tsx` and `src/app/campanhas/[id]/editar/page.tsx` updated:

**Formatting toolbar:**
- `<WhatsAppFormatToolbar textareaRef={textareaRef} onTextChange={setMessage} currentText={message} />` rendered directly above the textarea
- Textarea gets `rounded-t-none rounded-b-lg` to create a seamless toolbar+textarea visual unit
- In edit page: toolbar hidden (`{!isLocked && <WhatsAppFormatToolbar ... />}`) and textarea reverts to `rounded-lg` for locked campaigns

**AI assistant:**
- `<GeminiMessageAssistant currentMessage={message} onInsertMessage={setMessage} candidateName={...} segmentDescription={...} />` rendered below the textarea
- `onInsertMessage={setMessage}` directly updates the template state — the WhatsApp preview updates in real-time since it reads `message`
- In edit page: AI assistant hidden for locked campaigns via `{!isLocked && <GeminiMessageAssistant ... />}`

**Enhanced validation (both pages):**
- Name 3-100 chars: `'Nome deve ter entre 3 e 100 caracteres'`
- Message not empty: `'Mensagem não pode estar vazia'`
- Message ≤ 65,536 chars: `'Mensagem excede o limite do WhatsApp (65.536 caracteres)'`
- Date range validation already present; error text standardized to `'Data de fim deve ser posterior à data de início'`
- All via `toast.error()` (sonner)

## Deviations from Plan

**1. [Rule 2 - Missing] Tooltip and DropdownMenu shadcn components unavailable**

Neither `@/components/ui/tooltip` nor `@/components/ui/dropdown-menu` exist in this project's shadcn installation. Replaced with:
- `title` attributes for format button tooltips (native browser tooltips)
- Custom backdrop-based dropdown (div with fixed overlay + absolute positioned menu) for the variable selector

**2. [Rule 1 - Bug] React 19 useRef typing**

React 19 `useRef<HTMLTextAreaElement>(null)` returns `RefObject<HTMLTextAreaElement | null>` not `RefObject<HTMLTextAreaElement>`. The WhatsAppFormatToolbar prop type was declared as the former to match. TypeScript compile error caught and fixed before first commit.

## Self-Check: PASSED

Files exist:
- [x] src/components/whatsapp-format-toolbar.tsx
- [x] src/app/campanhas/nova/page.tsx (contains `WhatsAppFormatToolbar` and `GeminiMessageAssistant`)
- [x] src/app/campanhas/[id]/editar/page.tsx (contains `WhatsAppFormatToolbar` and `GeminiMessageAssistant`)

Commits exist:
- [x] 2aba377 — feat(40-02): create WhatsApp formatting toolbar component
- [x] 6285e31 — feat(40-02): integrate formatting toolbar + AI assistant + enhanced validation

Build: `npx next build` completed without errors.
