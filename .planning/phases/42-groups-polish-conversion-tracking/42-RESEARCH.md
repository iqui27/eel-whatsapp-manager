# Phase 42: Groups Polish & Conversion Tracking - Research

**Researched:** 2026-03-21
**Domain:** WhatsApp Group Management — bug fixes, UI polish, conversion tracking, opt-in automation
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GRP-POL-01 | Auto-link rotation: when a new group is created mid-campaign, the campaign link automatically updates to point to the new group | `resolveGroupLinkForSegment` in `campaign-groups.ts` uses an in-memory cache — cache invalidation + DB-first lookup on new group creation is the fix path |
| GRP-POL-02 | Group member list shows real contact names linked from the voters/contacts DB | Members API returns phone numbers only; need to join against `voters` table on normalized phone during member list fetch or display |
| GRP-POL-03 | "Ver detalhes" button in group card layout is contained within the card component (no overflow/clipping) | `group-card.tsx` actions row uses `ml-auto` flex positioning; layout diagnosis needed — likely missing `min-w-0` or overflow constraint on the flex container |
| GRP-POL-04 | Auto opt-in when a person joins a group via invite link | `group_participants.update` webhook already tracks group join for campaignId-linked groups, but does NOT call `logConsent` — need to add opt-in log + voter optInStatus update on join |
</phase_requirements>

---

## Summary

Phase 42 is a targeted bug-fix and polish phase operating entirely within the existing group management subsystem. No new libraries or migrations are required — all four requirements are achievable by modifying existing files. The project runs Next.js 16.2 / React 19 / Drizzle ORM 0.45 / Tailwind 4 on PostgreSQL.

**GRP-POL-01 (auto-link rotation):** The campaign variable resolver (`resolveGroupLinkForSegment`) uses a 5-minute in-memory cache (`group-link-cache.ts`). When a new group is created manually via the UI mid-campaign, the cache still holds the old group's link. The fix is to call `invalidateGroupCache(segmentTag)` immediately after the new group record is saved in `POST /api/groups`. The `invalidateGroupCache` function already exists and is used by the cron overflow handler — it just needs to be wired into the manual creation path too.

**GRP-POL-02 (real names in member list):** The members API endpoint (`/api/groups/[id]/members`) fetches participants from the Evolution API and maps them to phone numbers only. It does not join against the voters DB. The detail page (`/grupos/[id]/page.tsx`) renders `+{p.phone}` as the primary label. Fixing this requires: (1) the server enriching each participant's phone by searching `voters` by normalized phone, returning a `name` field alongside `phone`, and (2) the client rendering the name when available.

**GRP-POL-03 (Ver detalhes layout):** In `group-card.tsx`, the actions row at the bottom uses `flex items-center gap-1.5 px-4 pb-4 pt-1 border-t`. The `ml-auto` on the right cluster and the combination of the sync + archive buttons on the left can cause the right side to overflow the card boundary when card width is constrained (e.g., 3-column grid on narrower viewports). The fix is a `flex-wrap` on the actions row combined with `min-w-0` on the left button cluster, or switching to `justify-between` with wrapping permitted.

**GRP-POL-04 (auto opt-in on group join):** The `group_participants.update` webhook handler already records group join conversion events (via `recordGroupJoin`) but only for groups with a `campaignId`. It does NOT call `logConsent`. The opt-in automation requires: (1) looking up the voter by normalized participant phone, (2) checking they don't already have `optInStatus = 'active'`, and (3) calling `logConsent(voterId, 'opt_in', 'whatsapp_group', ...)`. This should work for ALL group joins (not just campaignId-linked groups) since the invite link is the consent mechanism.

**Primary recommendation:** Four surgical edits to existing files — no migrations, no new libraries, no new pages. All changes are in `src/app/api/groups/route.ts`, `src/app/api/groups/[id]/members/route.ts`, `src/components/group-card.tsx`, and `src/app/api/webhook/route.ts`.

---

## Standard Stack

No new libraries are needed for this phase. All work is within the established project stack.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2 | App router, API routes | Project standard |
| React | 19.2.3 | UI components | Project standard |
| Drizzle ORM | 0.45.1 | DB queries | Project standard |
| Tailwind CSS | 4.x | Styling | Project standard |
| PostgreSQL | — | Data persistence | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/db-compliance` | — | `logConsent`, opt-in DB writes | GRP-POL-04 opt-in automation |
| `@/lib/group-link-cache` | — | `invalidateGroupCache` | GRP-POL-01 cache bust |
| `@/lib/phone` | — | `normalizePhone` | GRP-POL-02 phone normalization |
| `@/lib/db-voters` | — | `searchVoters` | GRP-POL-02 voter name lookup |

**No npm install required** — all dependencies already present.

---

## Architecture Patterns

### Recommended Change Map
```
src/
├── app/api/groups/route.ts         # GRP-POL-01: add invalidateGroupCache after createGroupRecord
├── app/api/groups/[id]/members/    # GRP-POL-02: enrich participants with voter names from DB
├── app/api/webhook/route.ts        # GRP-POL-04: add logConsent on group_participants.update add action
└── components/group-card.tsx       # GRP-POL-03: fix flex layout on actions row
```

### Pattern 1: Cache Invalidation on New Group Creation (GRP-POL-01)

**What:** After `createGroupRecord` succeeds in `POST /api/groups`, call `invalidateGroupCache` for the group's segmentTag so the next `resolveGroupLinkForSegment` call skips cache and picks up the new group.

**When to use:** Whenever a group is created outside the cron overflow path (manual UI creation, API direct creation).

**Key insight:** The cron overflow path (`/api/cron/group-overflow/route.ts`) already does this correctly — line 109 calls `invalidateGroupCache(group.segmentTag)`. The manual creation path in `/api/groups/route.ts` does not. The fix is to add the same call.

```typescript
// In POST /api/groups/route.ts, after createGroupRecord:
import { invalidateGroupCache } from '@/lib/group-link-cache';

// After: const group = await createGroupRecord({...})
if (group.segmentTag) {
  invalidateGroupCache(group.segmentTag);
}
```

### Pattern 2: Voter Name Enrichment in Members API (GRP-POL-02)

**What:** In `GET /api/groups/[id]/members`, after mapping participant JIDs to phone numbers, batch-search the voters table by normalized phone and merge in voter names.

**When to use:** Member list display in group detail page.

**Key insight:** `searchVoters` accepts a single query string (name OR phone). For batch enrichment, use direct DB query with `inArray` on normalized phones. The existing `searchVoters` helper is for search UX, not bulk lookup — use Drizzle directly.

```typescript
// In members/route.ts — after building participants array:
import { db } from '@/db';
import { voters } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { normalizePhone } from '@/lib/phone';

const normalizedPhones = participants.map(p => normalizePhone(p.phone)).filter(Boolean) as string[];
const voterRows = normalizedPhones.length > 0
  ? await db.select({ phone: voters.phone, name: voters.name })
      .from(voters)
      .where(inArray(voters.phone, normalizedPhones))
  : [];
const voterByPhone = Object.fromEntries(voterRows.map(v => [v.phone, v.name]));

const enriched = participants.map(p => ({
  ...p,
  voterName: voterByPhone[normalizePhone(p.phone) ?? ''] ?? null,
}));
```

### Pattern 3: Flex Layout Fix for Group Card Actions (GRP-POL-03)

**What:** The actions row in `group-card.tsx` needs `flex-wrap` so the "Ver detalhes" button doesn't escape the card on narrow containers.

**When to use:** Card grid layouts with variable-width columns.

**Diagnosis:** Current code: `className="flex items-center gap-1.5 px-4 pb-4 pt-1 border-t border-border/50 mt-auto"`. The right cluster has `ml-auto` which works fine at wide widths but on 2-col or narrow 3-col grids the total button width can exceed card width. Fix: add `flex-wrap` and `shrink-0` to the right cluster.

```typescript
// Change from:
<div className="flex items-center gap-1.5 px-4 pb-4 pt-1 border-t border-border/50 mt-auto">

// Change to:
<div className="flex flex-wrap items-center gap-1.5 px-4 pb-4 pt-1 border-t border-border/50 mt-auto">

// And on the right cluster (ml-auto div):
<div className="ml-auto flex items-center gap-1.5 shrink-0">
```

### Pattern 4: Auto Opt-in on Group Join (GRP-POL-04)

**What:** In the `group_participants.update` webhook handler, when `action === 'add'`, look up each participant in the voters DB and call `logConsent` with `opt_in` action if they don't already have `optInStatus === 'active'`.

**When to use:** Every group join via invite link — the act of joining is the implicit consent.

**Critical path:**
1. Extract phone from participant JID (already done for campaignId-linked groups)
2. Look up voter by normalized phone (use `searchVoters` or direct query)
3. Skip if voter already has `optInStatus === 'active'`
4. Call `logConsent(voter.id, 'opt_in', 'whatsapp_group', 'Entrou no grupo via link de convite')`

**Important:** This should run for ALL group joins, not just groups with a `campaignId`. Move the voter lookup outside the `campaignId` check.

```typescript
// In webhook/route.ts, group_participants.update section:
// Inside the `if (group)` block, for each participant when action === 'add':
if (action === 'add') {
  for (const participantJid of participants) {
    const participantPhone = participantJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const normalizedPhone = normalizePhone(participantPhone);
    if (!normalizedPhone) continue;

    // Look up voter
    const matchedVoters = await searchVoters(normalizedPhone);
    const voter = matchedVoters.find(v => v.phone === normalizedPhone);

    // Auto opt-in if voter found and not already active
    if (voter && voter.optInStatus !== 'active') {
      try {
        await logConsent(voter.id, 'opt_in', 'whatsapp_group', `Entrou no grupo "${group.name}" via link de convite`);
        syslogInfo('webhook', `Opt-in automático registrado para ${voter.name}`, { voterId: voter.id, phone: normalizedPhone, groupId: group.id });
      } catch (optInErr) {
        console.error('[webhook] Auto opt-in error:', optInErr);
      }
    }

    // Existing campaignId-linked conversion tracking continues below...
  }
}
```

### Anti-Patterns to Avoid

- **Modifying the DB schema:** No migrations needed — all data needed already exists in `voters.optInStatus`, `consentLogs`, `conversionEvents`.
- **Rewriting the members page as a server component:** It's a 'use client' component with real-time refresh — keep it client-side and just update the API response shape.
- **Breaking the overflow cron flow:** The cron overflow path already correctly calls `invalidateGroupCache` — don't double-call or change that logic.
- **Blocking the webhook on opt-in failures:** Wrap opt-in logic in try/catch and don't throw — webhook must always return 200.
- **Using `searchVoters` for batch enrichment in members API:** `searchVoters` is a text search helper. Use Drizzle `inArray` directly for bulk phone-to-name lookup.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache invalidation mechanism | Custom cache busting logic | `invalidateGroupCache` from `group-link-cache.ts` | Already exists, handles segment-scoped invalidation |
| Opt-in logging | Custom voter update | `logConsent` from `db-compliance.ts` | Handles `consentLogs` insert + `voters.optInStatus` update atomically |
| Phone normalization | Custom regex | `normalizePhone` from `lib/phone.ts` | Already used throughout codebase for consistency |
| Voter lookup by phone | Raw SQL | Drizzle `inArray(voters.phone, normalizedPhones)` | Type-safe, indexed |

**Key insight:** This phase is purely about wiring together existing infrastructure — the hard problems (cache, opt-in, conversion tracking, phone normalization) are already solved.

---

## Common Pitfalls

### Pitfall 1: Cache Invalidation Scope
**What goes wrong:** If you call `clearCampaignCache(campaignId)` instead of `invalidateGroupCache(segmentTag)`, only the specific campaign's cache is busted — other campaigns sharing the same segment still have stale entries.
**Why it happens:** Two different invalidation functions exist with different scopes.
**How to avoid:** Use `invalidateGroupCache(segmentTag)` which busts all campaigns for that segment.
**Warning signs:** Link rotation works for the creating campaign but not others sharing the same segment.

### Pitfall 2: @lid JIDs in Opt-in Tracking
**What goes wrong:** Evolution API sends `@lid` (Linked Device ID) JIDs alongside `@s.whatsapp.net` phone JIDs in group participants. The `@lid` format is not a phone number and will produce empty `normalizedPhone`.
**Why it happens:** Meta's linked device system. Already handled in the existing webhook code (`const isPhoneJid = participantJid.endsWith('@s.whatsapp.net')`).
**How to avoid:** Check `participantJid.endsWith('@s.whatsapp.net')` before attempting phone extraction — same guard already used in the message parsing section.
**Warning signs:** `normalizePhone` returns null for `@lid` JIDs — that's expected, just skip them.

### Pitfall 3: Group Card Actions Row Wrapping
**What goes wrong:** Adding `flex-wrap` to the actions row causes the left buttons (Sincronizar, Arquivar) to wrap to a second line on very narrow cards, creating visual inconsistency.
**Why it happens:** At 3-column grid on 1024px+ screens, cards can be ~300px wide — which is just enough to fit all buttons on one row without wrapping. But at exactly the breakpoint, things can shift.
**How to avoid:** Keep the left buttons ungrouped (they already wrap naturally) and add `shrink-0` only to the right cluster containing EditGroupDialog + Ver detalhes. This ensures the "Ver detalhes" button never overflows while the left buttons can redistribute normally.

### Pitfall 4: Opt-in Double-registration
**What goes wrong:** If a voter leaves and rejoins a group, `logConsent` is called again even though they're already opted in.
**Why it happens:** No guard on re-join.
**How to avoid:** Check `voter.optInStatus !== 'active'` before calling `logConsent`. The existing code handles this for keyword-triggered opt-ins — use the same pattern.
**Warning signs:** Duplicate rows in `consent_logs` for the same voter+group.

### Pitfall 5: Members API Perf with Large Groups
**What goes wrong:** A group with 800 members creates an `inArray` with 800 phone numbers — this is a large IN clause but PostgreSQL handles it fine with the indexed `idx_voters_phone` index.
**Why it happens:** WhatsApp groups can have up to 1024 members.
**How to avoid:** The `inArray` approach is correct. Don't loop per-member. The index on `voters.phone` makes this O(n log n) not O(n).

---

## Code Examples

### Cache Invalidation After New Group Creation
```typescript
// Source: src/app/api/cron/group-overflow/route.ts:109 (existing pattern)
// In POST /api/groups/route.ts, after createGroupRecord succeeds:
import { invalidateGroupCache } from '@/lib/group-link-cache';

const group = await createGroupRecord({ /* ... */ });

if (group.segmentTag) {
  invalidateGroupCache(group.segmentTag);
}

return NextResponse.json({ group }, { status: 201 });
```

### Batch Voter Name Lookup for Members
```typescript
// Source: Drizzle ORM inArray pattern used throughout src/lib/
import { db } from '@/db';
import { voters } from '@/db/schema';
import { inArray } from 'drizzle-orm';
import { normalizePhone } from '@/lib/phone';

const phones = rawParticipants
  .filter(p => p.id.endsWith('@s.whatsapp.net'))
  .map(p => p.id.replace('@s.whatsapp.net', '').replace(/\D/g, ''))
  .map(phone => normalizePhone(phone))
  .filter((p): p is string => Boolean(p));

const voterRows = phones.length > 0
  ? await db.select({ phone: voters.phone, name: voters.name })
      .from(voters)
      .where(inArray(voters.phone, phones))
  : [];

const nameByPhone: Record<string, string> = Object.fromEntries(
  voterRows.map(v => [v.phone, v.name])
);
```

### Webhook Opt-in on Group Join
```typescript
// Source: Webhook pattern from src/app/api/webhook/route.ts (existing logConsent usage at line 385)
import { logConsent } from '@/lib/db-compliance';
import { searchVoters } from '@/lib/db-voters';

// Inside group_participants.update, action === 'add' block:
if (action === 'add' && group) {
  for (const participantJid of participants) {
    if (!participantJid.endsWith('@s.whatsapp.net')) continue; // skip @lid

    const rawPhone = participantJid.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) continue;

    try {
      const matchedVoters = await searchVoters(normalizedPhone);
      const voter = matchedVoters.find(v => v.phone === normalizedPhone);

      if (voter && voter.optInStatus !== 'active') {
        await logConsent(
          voter.id,
          'opt_in',
          'whatsapp_group',
          `Entrou no grupo "${group.name}" via link de convite`
        );
      }
    } catch (err) {
      console.error('[webhook] Auto opt-in error:', err);
      // Never throw — webhook must respond 200
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual link update | `invalidateGroupCache` already exists in cron path | Phase 21 | The function exists; just needs to be called from manual creation |
| No opt-in on join | Webhook already does conversion tracking, no opt-in | Phase 17 | Add `logConsent` call alongside existing `recordGroupJoin` |
| Raw phone in member list | Phone extracted from JID | Phase 16 | Enrich with voter name from DB |

---

## Open Questions

1. **Should opt-in trigger for ALL group joins or only invite-link joins?**
   - What we know: WhatsApp does not differentiate "joined via link" vs "added by admin" at the webhook level — both fire `action: 'add'`
   - What's unclear: The user's intent is invite-link opt-in; admin-adds would also trigger opt-in with current approach
   - Recommendation: Proceed with opt-in for ALL `action === 'add'` events — being added to a campaign group is functionally equivalent consent in this electoral context; document it in code comments

2. **Should "Ver detalhes" button layout also be fixed in `grupos/[id]` layout or only the card?**
   - What we know: The bug report says "no card do grupo" (in the group card), not the detail page
   - What's unclear: Whether the same overflow issue exists elsewhere
   - Recommendation: Fix only `group-card.tsx` per the requirement; the detail page is a full-width page layout and is not affected

3. **Should member name enrichment show partial names for privacy (first name only)?**
   - What we know: The system already shows full names in conversations, CRM, etc.
   - Recommendation: Show full name consistent with the rest of the app — no special masking needed

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read of `src/app/api/webhook/route.ts` — group_participants.update handler fully understood
- Direct codebase read of `src/lib/campaign-groups.ts` — cache mechanism and gap identified
- Direct codebase read of `src/lib/group-link-cache.ts` — `invalidateGroupCache` confirmed to exist
- Direct codebase read of `src/lib/db-compliance.ts` — `logConsent` API confirmed
- Direct codebase read of `src/components/group-card.tsx` — layout structure confirmed
- Direct codebase read of `src/app/api/groups/[id]/members/route.ts` — no voter enrichment confirmed
- Direct codebase read of `src/db/schema.ts` — voters.optInStatus, consentLogs confirmed

### Secondary (MEDIUM confidence)
- Cron overflow handler `src/app/api/cron/group-overflow/route.ts` — pattern for `invalidateGroupCache` usage verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — reading actual package.json and source files
- Architecture: HIGH — all changes operate on existing infrastructure, no new patterns needed
- Pitfalls: HIGH — identified from direct code inspection (the @lid guard pattern exists in line ~199 of webhook.ts, the double opt-in risk is visible from the schema)

**Research date:** 2026-03-21
**Valid until:** 2026-04-20 (stable codebase — no external library changes needed)
