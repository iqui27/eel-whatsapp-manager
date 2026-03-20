---
phase: 35-campaign-management
plan: "05"
subsystem: chips-proxy
tags: [proxy, anti-ban, evolution-api, chips-ui]
dependency_graph:
  requires: [35-02]
  provides: [proxy-management]
  affects: [chips-page, evolution-api-wrapper, chips-api]
tech_stack:
  added: []
  patterns: [collapsible-inline-edit, proxy-badge, graceful-api-fallback]
key_files:
  created: []
  modified:
    - src/lib/evolution.ts
    - src/app/api/chips/route.ts
    - src/app/chips/page.tsx
decisions:
  - "updateInstanceSettings gracefully handles 404 (proxy only takes effect on next restart for older Evolution API versions)"
  - "alwaysOnline default changed from true to false — anti-ban best practice"
  - "Proxy badge uses hover tooltip showing protocol://host:port"
metrics:
  duration_minutes: 25
  completed: "2026-03-20"
  tasks_completed: 2
  files_modified: 3
---

# Phase 35 Plan 05: Proxy Management Summary

**One-liner:** Per-instance proxy routing via chips page UI with Evolution API pass-through and alwaysOnline anti-ban fix.

## What Was Built

### Task 1 — Proxy fields in chips API + Evolution API wrapper (`8081fbb`)

**`src/lib/evolution.ts`:**
- Added `proxyHost`, `proxyPort`, `proxyProtocol`, `proxyUsername`, `proxyPassword` to `CreateInstanceOptions`
- `createInstance()` now includes `proxy` object in body when `proxyHost` is set
- Changed `alwaysOnline` default from `true` → `false` (anti-ban best practice)
- Added `updateInstanceSettings()` function calling `PUT /instance/update/{instanceName}` — gracefully returns `{ success: false, message }` on 404 (older Evolution API versions)

**`src/app/api/chips/route.ts`:**
- POST handler accepts and saves all 5 proxy fields to DB
- PUT handler imports and calls `updateInstanceSettings()` when proxy fields change — non-fatal (catch + log)

### Task 2 — Proxy UI in chips page (`ceb3b0c`)

**`src/app/chips/page.tsx`:**
- `Chip` interface extended with 5 proxy fields
- `ProxyBadge` sub-component: shows `Shield + "Proxy"` badge when `proxyHost` is set; tooltip shows `{protocol}://{host}:{port}`
- New chip form: collapsible "Proxy (opcional)" section with animated expand/collapse (collapsed by default); fields: Host, Protocolo (select), Porta, Usuário, Senha
- Chip cards: inline proxy edit panel (identical UX to segment editing) with hover-reveal "Editar"/"Adicionar" button
- Clearing host field removes proxy on save

## Decisions Made

1. **alwaysOnline → false**: Evolution API's `alwaysOnline: true` broadcasts presence constantly, increasing ban risk. Changed default to `false` (anti-ban best practice per Evolution API docs).

2. **updateInstanceSettings graceful fallback**: Evolution API v1/v2 don't all support `PUT /instance/update`. Rather than hard-fail, the function returns `{ success: false, message }` on 404. Non-fatal in PUT handler — logged as warning. Proxy changes take effect on next instance restart.

3. **Proxy section collapsed by default**: Most chips won't have proxies initially. Hiding the section keeps the form clean.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` ✅ (no errors)
- `npx next build` ✅ (passes)
- `proxyHost` present in all 3 target files ✅
- `alwaysOnline: false` in `createInstance()` ✅

## Self-Check: PASSED

- `src/app/chips/page.tsx` — contains `proxyHost` ✅
- `src/app/api/chips/route.ts` — contains `proxyHost` ✅
- `src/lib/evolution.ts` — contains `proxyHost` ✅
- Commits `8081fbb` and `ceb3b0c` exist ✅
