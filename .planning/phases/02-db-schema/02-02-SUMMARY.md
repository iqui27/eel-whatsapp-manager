---
phase: 02-db-schema
plan: 02
subsystem: database
tags: [schema, drizzle, conversations, compliance, users, api-routes]
completed: 2026-03-04

dependency-graph:
  requires: [02-01]
  provides: [conversations-table, consent-logs-table, users-table, voter-api, campaign-api, segment-api]
  affects: [Phase 05 Conversations, Phase 06 Compliance, Phase 03 Import, Phase 04 Campaigns]

tech-stack:
  added: []
  patterns: [Drizzle ORM, Next.js App Router API routes, auth-protected routes, SQL COUNT groupBy]

key-files:
  created:
    - src/lib/db-conversations.ts
    - src/lib/db-compliance.ts
    - src/lib/db-users.ts
    - src/app/api/voters/route.ts
    - src/app/api/campaigns/route.ts
    - src/app/api/segments/route.ts
  modified:
    - src/db/schema.ts

decisions:
  - conversation_messages is a separate table (not JSON column) — enables message-level queries, indexing, and pagination
  - logConsent() also updates voter.optInStatus in the same call — single source of truth, no drift
  - segments/route.ts serializes filters to JSON string if passed as object — handles both client formats
  - No audit_trail table yet (plan explicitly deferred it — consent_logs covers LGPD compliance needs for now)

metrics:
  duration: "22 minutes"
  tasks-completed: 2
  files-changed: 7
  files-created: 6
---

# Phase 02 Plan 02: Complete Schema + API Routes Summary

**One-liner:** Conversations, consent, and users tables complete the schema; 3 CRUD libs and 3 auth-protected REST API routes deliver the P0 data layer.

## What Was Built

### Task 1 — Additional Schema Tables (src/db/schema.ts)

| Table | Key Columns | Indexes |
|-------|-------------|---------|
| `conversations` | voter_id FK, status enum, assigned_agent, handoff_reason, priority | voter_id, status, priority |
| `conversation_messages` | conversation_id FK cascade, sender enum (voter/bot/agent), content | conversation_id |
| `consent_logs` | voter_id FK cascade, action enum (opt_in/opt_out/renew/revoke), channel, metadata | voter_id |
| `users` | name, email, role enum (coordenador/cabo/voluntario/admin), region_scope | email, role |

Exported types: `Conversation`, `ConversationMessage`, `ConsentLog`, `User`

**Total schema tables:** 12 (6 original + 4 electoral + 4 in this plan)

### Task 2 — CRUD Libraries

**db-conversations.ts:** `loadConversations` (optional status filter, sorted priority→lastMessageAt), `getConversation`, `addConversation`, `updateConversationStatus` (with optional agent), `addMessage` (inserts message + updates lastMessageAt atomically), `getMessages` (sorted asc)

**db-compliance.ts:** `logConsent` (inserts log + updates voter.optInStatus via actionToStatus map), `getConsentHistory`, `getConsentStats` (SQL COUNT GROUP BY optInStatus)

**db-users.ts:** `loadUsers`, `getUser`, `addUser`, `updateUser`, `deleteUser`

### Task 2 — API Routes

| Route | Auth | GET | POST | PUT | DELETE |
|-------|------|-----|------|-----|--------|
| `/api/voters` | ✅ | loadVoters / searchVoters(?search=) | name+phone required | id required | ?id= |
| `/api/campaigns` | ✅ | loadCampaigns / getCampaignsByStatus(?status=) | name+template required | id required | ?id= |
| `/api/segments` | ✅ | loadSegments | name+filters required | id required | ?id= |

All routes follow `chips/route.ts` pattern (cookie → validateSession → loadConfig → 401 on fail).

## Commits

| Hash | Message |
|------|---------|
| `ccde25b` | feat(02-02): add conversations, compliance, users tables to schema |
| `1f94c78` | feat(02-02): create CRUD libraries + API routes for P0 entities |

## Deviations from Plan

None — plan executed exactly as written. The note about `audit_trail` deferral was explicitly stated in the plan.

## Verification

- ✅ Schema grep checks for all 4 new tables → PASS
- ✅ File existence checks for all 6 new files → PASS
- ✅ `tsc --noEmit` → No errors
- ✅ `npm run build` → 26 routes compiled, /api/voters, /api/campaigns, /api/segments all appear

## Self-Check: PASSED

Files exist:
- ✅ `src/db/schema.ts` — contains conversations, conversationMessages, consentLogs, users, Conversation type
- ✅ `src/lib/db-conversations.ts`, `db-compliance.ts`, `db-users.ts`
- ✅ `src/app/api/voters/route.ts`, `campaigns/route.ts`, `segments/route.ts`

Commits exist:
- ✅ `ccde25b` — feat(02-02): add conversations, compliance, users tables to schema
- ✅ `1f94c78` — feat(02-02): create CRUD libraries + API routes for P0 entities
