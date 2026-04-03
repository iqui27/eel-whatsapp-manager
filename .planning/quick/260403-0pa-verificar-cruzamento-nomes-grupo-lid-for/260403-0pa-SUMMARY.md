---
phase: 260403-0pa-verificar-cruzamento-nomes-grupo-lid-for
plan: "0pa"
type: quick
wave: 1
depends_on: []
requirements: []
tags: [investigation, group-sender-cache, lid-resolution, Phase-43]
---

# Quick Task 260403-0pa: Verificar Cruzamento Nomes Grupo (@lid) Summary

**One-liner:** Investigation confirms: group_sender_cache infrastructure exists and is complete; @lid format CANNOT be resolved due to WhatsApp privacy limitations; @s.whatsapp.net CAN be resolved via dual-format phone matching and cache.

---

## Investigation Questions & Answers

### Q1: Does lid format cross-reference infrastructure exist?

**Answer: YES**

**Evidence:**

| Component | Location | Status |
|-----------|----------|--------|
| `groupSenderCache` table | `src/db/schema.ts` lines 643-656 | ✅ Defined |
| Migration SQL | `drizzle/0017_group_sender_cache.sql` | ✅ Exists |
| Cache library | `src/lib/db-group-sender-cache.ts` | ✅ Created |
| Members API enrichment | `src/app/api/groups/[id]/members/route.ts` lines 65, 67-81 | ✅ Wired |
| Webhook population | `src/app/api/webhook/route.ts` lines 229, 643 | ✅ 2 call sites |

---

### Q2: What was done before?

**Answer: Phase 43 (phone-resolution-group-identity) built the complete infrastructure**

**Phase 43-01 (commit 6555b97 + 6fa6957):**
- Added `groupSenderCache` table to schema with composite unique constraint `(groupJid, senderJid)`
- Created migration `drizzle/0017_group_sender_cache.sql`
- Created `src/lib/db-group-sender-cache.ts` with:
  - `upsertGroupSenderCache()` — ON CONFLICT DO UPDATE for cache writes
  - `getGroupSendersByGroupJid()` — batch read for members API
- Wired cache population in webhook group message handler (line 229)

**Phase 43-02 (commit b53836b + a65f82f):**
- Enriched members API with cache lookup (line 65: `getGroupSendersByGroupJid`)
- Built `cachePhoneToName` map with dual-format phone support (lines 67-81)
- Added cache fallback for @s.whatsapp.net participants (line 131)
- Added cache write in GROUP_PARTICIPANTS_UPDATE join handler (line 643)

---

### Q3: Is it complete?

**Answer: YES — complete and functional**

**Commit verification:**
```
b53836b — feat(43-02): enrich members API with group_sender_cache @lid resolution ✅ FOUND
a65f82f — feat(43-02): write GROUP_PARTICIPANTS_UPDATE join events to group_sender_cache ✅ FOUND
6555b97 — feat(43-01): add group_sender_cache table to schema and migration ✅ FOUND
6fa6957 — feat(43-01): create group sender cache lib and wire webhook population ✅ FOUND
```

---

## @lid Resolution Capability & Limitations

### Can `lid:` format be cross-referenced with names/phones?

**Answer: NO — WhatsApp privacy limitation**

**Evidence from code comments (members/route.ts lines 133-138):**

```typescript
// For @lid: p.phone is the numeric lid ID (not a real phone).
// We cannot map @lid ID → phone directly.
// Current approach: @lid stays null (WhatsApp privacy limitation).
// The cache is used indirectly — when the same person sent a message,
// their @s.whatsapp.net JID was stored and their name appears in other UI.
// Future: if WhatsApp ever provides @lid ↔ @s.whatsapp.net mapping, plug it in here.
```

**Explanation:**
- `@lid` participants (e.g., `lid:184052367761544` or `184052367761544@lid`) are WhatsApp's privacy feature
- The numeric ID in @lid is NOT a phone number — it's an opaque identifier
- WhatsApp does NOT expose any API mapping between @lid IDs and real phone numbers
- Therefore, @lid participants remain `voterName: null` in the members API response

---

### What CAN be resolved?

**Answer: @s.whatsapp.net participants CAN be resolved**

**How it works:**

1. **Cache population (webhook):**
   - When a real @s.whatsapp.net sender posts a group message → cache stores `(groupJid, senderJid, normalizedPhone)`
   - When a @s.whatsapp.net participant joins a group → cache stores their mapping

2. **Members API resolution:**
   - Batch voter lookup via `inArray` with dual-format phone matching (12↔13 digit Brazilian variation)
   - Cache fallback: `nameByPhone[norm] ?? cachePhoneToName[norm] ?? null`
   - Dual-format keys registered in both `nameByPhone` and `cachePhoneToName` maps

3. **Phone format handling:**
   - Brazilian phones can be stored as 12-digit (`5511XXXXXXXX`) or 13-digit (`55119XXXXXXXX`)
   - The code registers BOTH variants as keys pointing to the same voter name
   - Example: `5511999998888` (13) → also registers `551199998888` (12)

---

## Verification Grep Results

| Command | Expected | Actual | Status |
|---------|----------|--------|--------|
| `grep -n "groupSenderCache" schema.ts` | ≥1 | 3 matches (lines 643, 655, 656) | ✅ |
| `grep -n "export async function" db-group-sender-cache.ts` | 2 exports | 2 (lines 14, 35) | ✅ |
| `grep -n "getGroupSendersByGroupJid" members/route.ts` | ≥2 | 2 (lines 11, 65) | ✅ |
| `grep -n "upsertGroupSenderCache" webhook/route.ts` | ≥2 | 2 (lines 229, 643) | ✅ |
| `grep -n "@lid" members/route.ts` | Comment explaining limitation | 6 matches with comment | ✅ |

---

## Summary Table

| Format | Can Resolve? | How? | Limitation |
|--------|--------------|------|------------|
| `@s.whatsapp.net` | ✅ YES | Dual-format batch voter query + cache fallback | None |
| `@lid` | ❌ NO | Cannot resolve | WhatsApp privacy: no @lid↔phone mapping exposed |

---

## Key Files

| File | Role | Key Lines |
|------|------|-----------|
| `src/db/schema.ts` | Cache table definition | 643-656 |
| `src/lib/db-group-sender-cache.ts` | Cache CRUD functions | 14-46 |
| `src/app/api/groups/[id]/members/route.ts` | Voter name enrichment | 65, 67-81, 127-139 |
| `src/app/api/webhook/route.ts` | Cache population | 229, 643 |
| `drizzle/0017_group_sender_cache.sql` | Migration | Full file |

---

## Deviations from Plan

None — investigation completed as specified. All verification checks passed.

---

## Self-Check: PASSED

- Phase 43 summaries exist and document completed work
- Schema has groupSenderCache table (lines 643-656)
- Cache library exports 2 functions (upsertGroupSenderCache, getGroupSendersByGroupJid)
- Members API imports and uses getGroupSendersByGroupJid (lines 11, 65)
- Webhook has 2 upsertGroupSenderCache call sites (lines 229, 643)
- Migration 0017_group_sender_cache.sql exists
- Commits b53836b, a65f82f, 6555b97, 6fa6957 all exist in git history