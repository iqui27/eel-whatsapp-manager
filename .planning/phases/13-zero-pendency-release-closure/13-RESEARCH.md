---
phase: 13-zero-pendency-release-closure
type: research
status: complete
created: 2026-03-09
---

# Phase 13 Research: Zero-Pendency Release Closure

## Executive Summary

Phase 13 should be planned as a **milestone closure phase with five plans**, not as one generic cleanup patch.

Prescriptive conclusion:
- close shell/setup/dashboard contract drift
- implement real authorization enforcement
- finish CRM/mobile operator workflows that are still partial
- complete report automation
- end with deployment + live zero-pendency verification

Why this is the correct scope:
- the remaining work is no longer concentrated in one subsystem
- several gaps are user-visible or contract-level, not cosmetic
- the user explicitly asked to plan everything still not 100% complete and leave no pending items

Confidence:
- **High** that topbar/setup/dashboard still contain MVP/demo contracts
- **High** that API protection is still mostly authentication-only, not authorization
- **High** that CRM persistence, mobile capture/inbox, and report automation remain materially incomplete
- **High** that final deploy/UAT must be part of the phase, otherwise “no pending items” is not a trustworthy claim

## Current State In This Repo

Observed gaps confirmed during repo scan:

### 1. Shell and setup still have demo/MVP contracts

`src/components/topbar.tsx` still ships:
- local-only search state
- hardcoded default alert count/text
- hardcoded default user initials/role
- hardcoded default period label

This means the shell contract is still partly decorative.

`src/app/setup/page.tsx` still renders the full setup wizard unconditionally on the client, even though the setup API rejects reconfiguration for configured environments. Phase 11 already captured this mismatch in live verification.

`src/app/page.tsx` still computes:
- `estimatedOpenRate = deliveryRate`
- UI note `(estimado)`

That is a legitimate product placeholder, but it is not a finished contract if the milestone goal is zero pending items.

### 2. Authorization is not enforced beyond session auth

The repo has users/roles/region scope and an admin page, but protected APIs mostly stop at:
- validate session
- return `401 Unauthorized`

The scan shows this pattern across campaigns, voters, conversations, compliance, chips, contacts, clusters, settings, and users routes.

`src/app/admin/page.tsx` explicitly documents the permissions matrix as:
- “static, informational”
- “Permissões personalizadas por usuário disponíveis em breve.”

This is a direct signal that the authorization story is not complete.

### 3. CRM operator notes/checklist are still local-only

`src/app/crm/[id]/page.tsx` still stores checklist and notes in `localStorage`.

This was acceptable for MVP, but it is not a finished operational workflow:
- data does not follow the user across devices/sessions
- supervisors cannot trust it as a shared record
- it undermines the “single campaign operations center” positioning

### 4. Mobile workflows are still missing

Roadmap/state still list the following as deferred:
- mobile offline capture form (`MOB-01`)
- mobile priority inbox (`MOB-02`)

The current `src/app` route set does not expose a dedicated mobile offline capture or mobile priority inbox surface. So this is not a docs-only gap; the product surface is missing.

### 5. Report automation is only partially complete

Current reports support:
- operational KPIs
- CSV export

But the deferred backlog still lists:
- scheduled email report delivery (`REP-02 partial`)

There is also no current evidence of PDF export or report scheduling configuration in the shipped reporting surface.

### 6. Final production parity/UAT is still open

`STATE.md` currently says the next correct step after Phase 12 is:
- deploy current HEAD
- run focused live UAT

This means the milestone still lacks the final production-backed closure loop.

## Recommended Architecture

### Standard Stack

- Keep using the existing Next.js app router, Drizzle, current auth/session model, and current deployment pipeline
- Add missing behavior on top of current pages/routes instead of inventing a second admin/mobile/reporting stack
- Keep the final deploy/UAT loop in the same phase so the phase is accountable for real closure

### Architecture Patterns

#### 1. Shell/setup/dashboard closure should be contract-driven

Recommended output:
- topbar pulls real user/session/period/alert/search context or intentionally hides unsupported controls
- setup route detects configured state and stops presenting the initial wizard as if reconfiguration were valid
- dashboard no longer ships misleading “estimated” KPIs without an explicit finished contract

#### 2. Authorization needs one reusable policy layer

Recommended output:
- one shared helper or policy module for role/permission/region enforcement
- APIs return `403 Forbidden` when the user is authenticated but lacks rights
- UI surfaces hide or disable actions based on the same policy contract

#### 3. CRM/mobile work should be treated as one operator-workflow phase slice

Why group them:
- both represent field/operator workflows
- both currently fail the “shared operational record” standard
- both benefit from the same mobile-first constraints and offline/reconnect reasoning

Recommended output:
- CRM notes/checklist persisted server-side
- mobile capture queue syncing into the same voter pipeline
- mobile priority inbox over the same conversations contract

#### 4. Reports automation should close the last reporting promise

Recommended output:
- consistent CSV/PDF export behavior
- scheduled email delivery backed by a persisted report-schedule contract and cron dispatcher
- clear operator controls over recipients/frequency

#### 5. Final UAT/deploy must be a real closure gate

The phase should not end with “ready to test later”.

Required end state:
- latest code deployed
- migrations applied where needed
- live routes/pages tested
- remaining issues fixed inside the phase or explicitly block the verdict

## Affected Files / Areas

Files and areas almost certainly involved:
- `src/components/topbar.tsx`
- `src/components/SidebarLayout.tsx`
- `src/app/page.tsx`
- `src/app/setup/page.tsx`
- `src/app/api/setup/route.ts`
- `src/app/admin/page.tsx`
- `src/app/crm/[id]/page.tsx`
- `src/app/relatorios/page.tsx`
- many `src/app/api/**/route.ts` files
- likely DB schema/persistence surfaces for CRM notes and report schedules
- new mobile-facing page/components/routes

## Don't Hand-Roll

- Do not keep the permissions matrix informational-only while claiming authorization is complete
- Do not leave offline/mobile work as “future UX” if the roadmap already promised it
- Do not close the phase without a production-backed verification loop
- Do not preserve misleading dashboard KPIs just because they are visually useful
- Do not add a second persistence model for CRM notes/checklist if the current data model can be extended minimally

## Validation Architecture

Recommended validation gates:
- `node_modules/.bin/tsc --noEmit`
- `npm run build`
- role-based API smoke checks (`401` vs `403`)
- manual desktop and mobile responsive verification
- final live production UAT after deploy

Critical manual checks:
- configured environment no longer shows a misleading setup wizard
- topbar/search/alerts/period contract is real or intentionally reduced
- non-admin / region-scoped users cannot perform forbidden API actions
- CRM notes/checklist survive reload/device changes
- mobile offline capture queues and syncs correctly
- scheduled reports dispatch on the intended cadence
- all shipped pages open cleanly in production at sign-off time

## Suggested Plan Breakdown

### Plan 13-01
Shell/setup/dashboard contract cleanup

### Plan 13-02
Authorization enforcement + real permissions contract

### Plan 13-03
CRM persistence + mobile operator workflows

### Plan 13-04
Report automation completion (PDF + scheduled email)

### Plan 13-05
Production deploy + zero-pendency live sign-off

---

*Phase: 13-zero-pendency-release-closure*
*Research complete: 2026-03-09*
