---
phase: 12-campaign-personalization-completion
type: research
status: complete
created: 2026-03-09
---

# Phase 12 Research: Campaign Personalization Completion

## Executive Summary

Phase 12 should be planned as a **campaign-personalization integrity phase**, not as a generic polish pass.

Prescriptive conclusion:
- Add a real **candidate profile** to the existing settings/config model
- Introduce a shared **campaign variable contract** module consumed by editor, preview, API validation, and delivery
- Make **preview and outbound interpolation** use the same resolver and supported-variable list
- Persist the variables actually used by each campaign and block unsupported placeholders before send

Why this is the correct scope:
- The current issue is not isolated to the UI; it is a contract mismatch across authoring, preview, and execution
- Operators currently cannot tell which placeholders are safe to use
- The user explicitly expects a place to configure candidate information and asked whether the feature is "already working"

Confidence:
- **High** that the missing source-of-truth problem must be solved in `config`/`settings`
- **High** that the variable contract must be centralized into one helper/module
- **High** that this should be planned as three implementation plans, not one monolithic patch

## Current State in This Repo

Observed gaps in the current implementation:

### 1. Candidate configuration does not exist

Current config persistence only stores:
- Evolution API URL/key
- auth password
- instance name
- warming settings

There is no candidate field in the config schema or settings UI, so `{candidato}` has no real persisted source.

### 2. Campaign variable definitions are duplicated and inconsistent

The campaign editor pages define local `VARIABLES` arrays with:
- `{nome}`
- `{bairro}`
- `{interesse}`
- `{data}`
- `{candidato}`

Those arrays are page-local UI mocks. They are not backed by shared backend logic.

### 3. Preview and delivery do not use the same resolver

Preview currently replaces placeholders with hardcoded mock values like:
- `João`
- `Centro`
- `Saúde`
- today's browser date
- `Dr. Silva`

Delivery-time interpolation currently resolves only voter-backed fields:
- `{nome}`
- `{bairro}`
- `{zona}`
- `{secao}`
- `{interesse}`

`{candidato}` and `{data}` are missing from the outbound resolver, so those placeholders can leak literally into real messages.

### 4. Supported backend variables are hidden from operators

The delivery pipeline already knows how to resolve `{zona}` and `{secao}`, but the campaign editor does not expose those options in the variable toolbar.

Result:
- operators see unsupported variables
- operators do not see supported variables
- the editor cannot be treated as the canonical contract

### 5. Campaign persistence does not enforce or document variable usage

The `campaigns` table already has a `variables` array field, but the current create/edit flow does not treat it as a reliable record of placeholders in use.

Planning implication:
- this field can be repurposed as a low-friction integrity artifact without inventing a new table

## Recommended Architecture

## Standard Stack

- Keep using the existing `config` table and settings route/page
- Keep campaign persistence in `campaigns`
- Add one shared helper module, e.g. `src/lib/campaign-variables.ts`
- Reuse the current campaign send pipeline (`campaign-delivery.ts`) instead of introducing a second templating path

## Architecture Patterns

### 1. Candidate profile belongs in global settings

Recommended minimum:
- `candidateDisplayName` (required once campaigns use `{candidato}`)

Recommended optional metadata for future UX/context:
- `candidateOffice`
- `candidateParty`
- `candidateRegion`

Why global settings are the right default:
- the product is a single campaign operations center, not a multi-tenant multi-candidate platform
- the user explicitly expects to "configure candidate information" in a predictable place
- reusing settings avoids inventing a separate admin model for one operational identity

### 2. One shared variable registry

Create one module that defines, for each supported placeholder:
- placeholder key
- operator-facing label
- whether it depends on voter data, candidate config, or schedule/runtime context
- preview fallback strategy
- validation requirements

Minimum supported set after the phase:
- `{nome}`
- `{bairro}`
- `{interesse}`
- `{zona}`
- `{secao}`
- `{data}`
- `{candidato}`

This module should expose:
- `SUPPORTED_CAMPAIGN_VARIABLES`
- `extractVariables(template)`
- `validateTemplateVariables(template, contextAvailability)`
- `buildCampaignPreviewContext(...)`
- `resolveCampaignTemplate(...)`

### 3. Preview and send must share the same semantics

Recommended rule for `{data}`:
- In preview: show the scheduled date when available, otherwise today's date
- In actual send: use the scheduled execution date when the campaign is scheduled, otherwise the actual dispatch date

Recommended rule for `{candidato}`:
- Resolve from the persisted candidate profile in config
- If the template uses `{candidato}` and config is missing, block schedule/send and show a clear operator error

### 4. Use `campaigns.variables` as an integrity record

On create/edit:
- extract placeholders from the template
- validate them against the shared registry
- persist the sorted list into `campaigns.variables`

Benefits:
- monitor/report/debug surfaces can see which variables a campaign depends on
- API handlers can cheaply detect unsupported placeholders
- this uses an existing field instead of requiring a new schema object for the same goal

### 5. Validation should be tiered, not binary everywhere

Recommended behavior:
- Draft save: allow empty message, but do not allow unsupported placeholders
- Continue to scheduling: require candidate-dependent placeholders to have the necessary config
- Manual or scheduled send: hard-block any unresolved placeholder

This gives operators flexibility while still preventing bad sends.

## Affected Files

Files that are almost certainly part of the phase:
- `src/db/schema.ts`
- `src/lib/db-config.ts`
- `src/app/api/settings/route.ts`
- `src/app/settings/page.tsx`
- `src/app/campanhas/nova/page.tsx`
- `src/app/campanhas/[id]/editar/page.tsx`
- `src/app/campanhas/[id]/agendar/page.tsx`
- `src/app/api/campaigns/route.ts`
- `src/lib/db-campaigns.ts`
- `src/lib/campaign-delivery.ts`

New file that should probably be introduced:
- `src/lib/campaign-variables.ts`

Likely migration surface:
- a new drizzle migration to add candidate profile fields to `config`

## Don't Hand-Roll

- Do not keep separate `VARIABLES` arrays in multiple pages
- Do not let preview use mock substitutions that the backend cannot reproduce
- Do not silently strip unsupported placeholders on send
- Do not add a second hidden source of candidate information outside the settings/config flow
- Do not treat campaign personalization as purely cosmetic; it affects real outbound content

## Validation Architecture

Recommended execution gates:
- `node_modules/.bin/tsc --noEmit`
- `npm run build`
- manual create/edit/schedule/send verification on the campaign flow

Critical manual checks:
- `/settings` persists and reloads candidate profile fields
- `/campanhas/nova` and `/campanhas/[id]/editar` show the same supported variable set
- preview matches resolved outbound payload for `{candidato}` and `{data}`
- templates containing unsupported placeholders are blocked before send
- no raw placeholders leak into the final sent message

## Suggested Plan Breakdown

### Plan 12-01
Candidate profile schema/settings plus shared variable registry foundation

### Plan 12-02
Campaign editor, preview, and persistence alignment with validation on create/edit/schedule

### Plan 12-03
Send-pipeline parity and focused UAT proving preview/output consistency
