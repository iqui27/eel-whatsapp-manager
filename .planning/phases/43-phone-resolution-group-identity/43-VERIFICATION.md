---
phase: 43-phone-resolution-group-identity
verified: 2026-03-21T00:00:00Z
status: gaps_found
score: 8/9 must-haves verified
re_verification: false
gaps:
  - truth: "group_sender_cache table exists in the database with groupJid, senderJid, normalizedPhone, lastSeenAt columns"
    status: partial
    reason: "Drizzle schema table definition (src/db/schema.ts) does NOT declare the composite unique constraint (group_jid, sender_jid) that the upsert depends on. The constraint exists in the migration SQL (drizzle/0017_group_sender_cache.sql) and would be present in the DB after migration, but Drizzle is unaware of it. A future drizzle-kit push or generate will not include the constraint and may attempt to drop it, causing upsert conflicts."
    artifacts:
      - path: "src/db/schema.ts"
        issue: "groupSenderCache table definition has only a comment about the unique constraint — no uniqueIndex() or unique() Drizzle call is present. The onConflictDoUpdate in db-group-sender-cache.ts targets [groupJid, senderJid] but Drizzle schema does not enforce this."
    missing:
      - "Add uniqueIndex or unique constraint to the groupSenderCache pgTable definition: e.g. uniqueIndex('group_sender_cache_group_sender_unique').on(t.groupJid, t.senderJid) inside the (t) => [...] callback"
human_verification:
  - test: "Apply migration and verify upsert works"
    expected: "Inserting two rows with the same (groupJid, senderJid) results in a single row with updated lastSeenAt and normalizedPhone — no duplicate key error"
    why_human: "Migration was not applied during execution (DATABASE_URL not available). Cannot confirm DB state programmatically."
  - test: "Send a group message from a 12-digit phone (no 9th digit) and confirm conversation feed shows voter name"
    expected: "Voter name appears in the conversation list, not just +55XXXXXXXX"
    why_human: "Requires live WhatsApp webhook event and running database with voter records"
---

# Phase 43: Phone Resolution + Group Identity — Verification Report

**Phase Goal:** Fix voter name resolution across all incoming webhook events (dual-format 12/13 digit phones) and provide real identity for WhatsApp group members — including closed groups where members appear as @lid JIDs that cannot be resolved through direct API calls.

**Verified:** 2026-03-21
**Status:** gaps_found — 1 schema drift gap; all runtime logic verified
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Incoming 1:1 messages from phones without the 9th digit resolve to the correct voter name | VERIFIED | webhook/route.ts line 308: `const voter = await findVoterByPhone(phone)` — no searchVoters exact-match in 1:1 path |
| 2 | Group sender phones (@s.whatsapp.net JIDs) are persisted to group_sender_cache on every group message | VERIFIED | webhook/route.ts lines 227-234: guard `isPhoneJid && senderPhone && normalizedSender`, calls `upsertGroupSenderCache`, wrapped in try/catch |
| 3 | group_sender_cache table exists in schema with correct columns | VERIFIED | src/db/schema.ts lines 638-651: id, groupJid, senderJid, normalizedPhone, lastSeenAt — all correct |
| 4 | Drizzle schema declares composite unique constraint for upsert target | FAILED | No `uniqueIndex` or `unique` declared in pgTable — only a comment; migration SQL has it but Drizzle schema does not |
| 5 | Group messages from @lid senders are ignored in the cache | VERIFIED | webhook/route.ts line 200: `const isPhoneJid = participantJid.endsWith('@s.whatsapp.net')` — cache write guarded by `if (isPhoneJid && ...)` |
| 6 | Members API returns voterName for cache-assisted @s.whatsapp.net participants | VERIFIED | members/route.ts lines 65-81: loads cache, builds cachePhoneToName dual-format map; line 131: `nameByPhone[norm] ?? cachePhoneToName[norm] ?? null` |
| 7 | @lid participants remain voterName: null with documented comment | VERIFIED | members/route.ts lines 133-139: explicit comment documenting WhatsApp privacy limitation, returns `voterName: null` |
| 8 | GROUP_PARTICIPANTS_UPDATE opt-in uses findVoterByPhone for real-JID participants | VERIFIED | webhook/route.ts line 585: `const voter = await findVoterByPhone(normalizedPhone)` inside action === 'add' loop with @s.whatsapp.net guard |
| 9 | GROUP_PARTICIPANTS_UPDATE writes joining @s.whatsapp.net participants to group_sender_cache | VERIFIED | webhook/route.ts lines 610-622: second upsertGroupSenderCache call site confirmed, try/catch wrapped |

**Score:** 8/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db-group-sender-cache.ts` | upsertGroupSenderCache + getGroupSendersByGroupJid exports | VERIFIED | Both functions present, substantive (real DB operations), imported and called in webhook and members API |
| `drizzle/0017_group_sender_cache.sql` | CREATE TABLE DDL with composite unique | VERIFIED | File exists at drizzle/ (not migrations/ as plan stated — deviation documented in SUMMARY). Contains CREATE TABLE, indexes, and UNIQUE constraint ALTER TABLE |
| `src/db/schema.ts` | groupSenderCache Drizzle table definition | PARTIAL | Table defined with all correct columns; missing composite uniqueIndex declaration — only a comment |
| `src/app/api/webhook/route.ts` | findVoterByPhone in 1:1 path + group sender path + upsertGroupSenderCache at 2 sites | VERIFIED | Lines 209, 308, 585 use findVoterByPhone; lines 229 and 617 are the two upsertGroupSenderCache call sites |
| `src/app/api/groups/[id]/members/route.ts` | Cache enrichment with getGroupSendersByGroupJid + findVoterByPhone fallback | VERIFIED | Lines 11-12 imports, line 65 call, lines 67-81 map build, line 131 fallback usage |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| webhook/route.ts | db-voters.ts | findVoterByPhone(phone) in 1:1 path (line 308) | WIRED | Confirmed — no searchVoters in 1:1 path |
| webhook/route.ts | db-voters.ts | findVoterByPhone(normalizedSender) in group message path (line 209) | WIRED | Confirmed |
| webhook/route.ts | db-group-sender-cache.ts | upsertGroupSenderCache called after group message insert (line 229) | WIRED | Confirmed with @s.whatsapp.net guard and try/catch |
| webhook/route.ts | db-group-sender-cache.ts | upsertGroupSenderCache called in GROUP_PARTICIPANTS_UPDATE add (line 617) | WIRED | Confirmed |
| db/schema.ts | drizzle/0017_group_sender_cache.sql | Drizzle table definition matches SQL DDL | PARTIAL | Columns match; composite unique constraint in SQL but absent from Drizzle schema definition |
| members/route.ts | db-group-sender-cache.ts | getGroupSendersByGroupJid(group.groupJid) (line 65) | WIRED | Confirmed |
| members/route.ts | db-voters.ts | findVoterByPhone(entry.normalizedPhone) for each cache entry (line 69) | WIRED | Confirmed |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| PHONE-43-01 | 43-01 | Webhook MESSAGES_UPSERT uses findVoterByPhone (dual-format) for incoming messages | SATISFIED | webhook/route.ts lines 209 (group), 308 (1:1) — no searchVoters exact-match in either path |
| GRP-43-01 | 43-01 | New group_sender_cache DB table with Drizzle migration, storing real sender JIDs | PARTIALLY SATISFIED | Table and migration exist; Drizzle schema missing composite unique constraint declaration |
| GRP-43-02 | 43-01 | Webhook MESSAGES_UPSERT for group messages writes sender phone to group_sender_cache — only @s.whatsapp.net | SATISFIED | webhook/route.ts lines 227-234 |
| GRP-43-03 | 43-02 | Members API queries group_sender_cache for @lid resolution; findVoterByPhone on resolved phones; unresolvable @lid = null | SATISFIED | members/route.ts lines 65-139 — cache loaded, dual-format map built, used as fallback for @s.whatsapp.net; @lid remains null with comment |
| GRP-43-04 | 43-02 | GROUP_PARTICIPANTS_UPDATE uses findVoterByPhone for real-JID participants; @lid cannot be opted-in (documented); real-JID joins written to cache | SATISFIED | webhook/route.ts lines 575-622 — findVoterByPhone at line 585, cache write at lines 610-622, @lid explicitly skipped with comment |

**Note:** No REQUIREMENTS.md file exists in .planning/ — requirements are defined inline in ROADMAP.md under Phase 43. All 5 requirement IDs declared in plan frontmatter are accounted for. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| members/route.ts | 93 | Comment example using `XXXXXXXX` — documentation only | Info | None — comment in code, not code behavior |

No functional anti-patterns detected. No TODO/FIXME/PLACEHOLDER/empty implementations found in phase-43 files.

---

## Schema/Migration Drift Detail

The composite unique constraint `(group_jid, sender_jid)` required for `onConflictDoUpdate` is:

- Present in `drizzle/0017_group_sender_cache.sql` as `ALTER TABLE ... ADD CONSTRAINT "group_sender_cache_group_sender_unique" UNIQUE ("group_jid", "sender_jid")`
- **Absent** from `src/db/schema.ts` — the `groupSenderCache` pgTable has only a comment: `// Unique constraint: one senderJid per group (composite unique for upsert target)`

The Drizzle `onConflictDoUpdate` call in `db-group-sender-cache.ts` targets `[groupSenderCache.groupJid, groupSenderCache.senderJid]`. This will work correctly only if the DB constraint exists (applied via migration). The risk is: if a developer runs `drizzle-kit generate` in the future, Drizzle will see no constraint in schema and may generate a migration that drops it. The fix is adding `uniqueIndex('group_sender_cache_group_sender_unique').on(t.groupJid, t.senderJid)` to the table definition.

---

## Human Verification Required

### 1. Migration Applied to Database

**Test:** Run `npx drizzle-kit push` or `psql $DATABASE_URL -f drizzle/0017_group_sender_cache.sql` and verify the table exists with the unique constraint.

**Expected:** `\d group_sender_cache` shows the table with 5 columns and the unique constraint `group_sender_cache_group_sender_unique`.

**Why human:** DATABASE_URL was not available during execution. Cannot confirm DB state programmatically.

### 2. End-to-end 9th digit resolution

**Test:** Simulate a WhatsApp message from a voter stored as `5561983510965` (13 digits) arriving with JID `556183510965@s.whatsapp.net` (12 digits, no 9th digit). Check the conversation feed.

**Expected:** The conversation shows the voter's name, not `+556183510965`.

**Why human:** Requires live WhatsApp webhook event and a running database with voter records.

---

## Gaps Summary

One gap requires remediation before the phase is fully clean:

**Schema/migration drift** — The `groupSenderCache` Drizzle table definition in `src/db/schema.ts` does not declare the composite unique constraint that the `upsertGroupSenderCache` function depends on. The constraint exists in the migration SQL and (if applied) in the database, but Drizzle is unaware of it. This creates a drift risk: future `drizzle-kit generate` runs would not include the constraint, potentially causing it to be dropped.

Fix: add one line to the `(t) => [...]` callback in the `groupSenderCache` table definition:

```ts
uniqueIndex('group_sender_cache_group_sender_unique').on(t.groupJid, t.senderJid),
```

This is a low-risk, one-line change that closes the drift without affecting any runtime behavior (the constraint already exists in the DB after migration).

---

_Verified: 2026-03-21_
_Verifier: Claude (gsd-verifier)_
