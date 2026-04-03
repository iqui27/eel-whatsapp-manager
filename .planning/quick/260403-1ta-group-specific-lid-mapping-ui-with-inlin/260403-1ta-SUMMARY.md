---
phase: "260403-1ta-group-specific-lid-mapping-ui-with-inlin"
plan: "1ta"
type: quick
wave: 1
depends_on: ["260403-105"]
subsystem: group-members
tags: [groups, @lid, manual-mapping, ui]
tech_stack: [Next.js, TypeScript, Drizzle, shadcn/ui]
key_files:
  created:
    - src/app/api/groups/[id]/members/lid-mapping/route.ts
  modified:
    - src/lib/db-lid-manual-mapping.ts
    - src/app/grupos/[id]/page.tsx
decisions:
  - "Used campaigns.manage permission (not campaigns.edit — non-existent) for API auth"
  - "LidMappingModal pre-fills voterName if mapping already exists"
  - "Delete button only shown when mapping exists (voterName !== null)"
summary: "Group-specific @lid manual mapping UI with inline edit modal — operators can now name unmapped @lid participants in group members view"
---

# Phase 260403-1ta Plan 1ta: Group-Specific @lid Mapping UI with Inline Edit

## Objective

Add group-specific @lid mapping UI with inline edit in the group members view. Clicking an unmapped @lid row opens a modal with name input → save → API upsert. Delete button removes mapping.

## Tasks Completed

### Task 1: Add deleteLidMapping to db-lid-manual-mapping.ts ✅
**Commit:** `402755f`

Added `deleteLidMapping(groupJid: string, lidJid: string): Promise<void>` to `src/lib/db-lid-manual-mapping.ts`.

```typescript
export async function deleteLidMapping(
  groupJid: string,
  lidJid: string,
): Promise<void> {
  await db
    .delete(lidManualMapping)
    .where(and(
      eq(lidManualMapping.groupJid, groupJid),
      eq(lidManualMapping.lidJid, lidJid),
    ));
}
```

### Task 2: Create POST+DELETE /api/groups/[id]/members/lid-mapping route ✅
**Commit:** `4916ce9`

Created `src/app/api/groups/[id]/members/lid-mapping/route.ts`:

- **POST**: Parses `{ lidJid, voterName, voterId?, notes? }`, calls `upsertLidManualMapping()`, returns 200 on success
- **DELETE**: Parses `{ lidJid }`, calls `deleteLidMapping()`, returns 200 on success
- Both use `campaigns.manage` permission (auto-fixed: plan referenced non-existent `campaigns.edit`)
- `createdBy` captured from `auth.actor.name` for audit trail

### Task 3: Add LidMappingModal to group members UI with inline edit ✅
**Commit:** `cf3bc68`

Modified `src/app/grupos/[id]/page.tsx`:

1. **Participant row updates:**
   - Extended `Participant` interface with `voterName: string | null`
   - Shows `+{phone} — {voterName}` when voterName is present
   - Unmapped @lid rows (`p.id.endsWith('@lid') && !p.voterName`) display amber "Não mapeado" badge
   - Unmapped @lid rows are clickable, triggering `openLidModal(p)`

2. **State added:**
   - `lidModalOpen`, `lidModalParticipant`, `lidVoterName`, `lidNotes`, `lidSaving`

3. **LidMappingModal (shadcn Dialog):**
   - Read-only label showing the @lid JID
   - Input for voterName (pre-filled if mapping exists)
   - Optional textarea for notes
   - Save button → POST → reload members on success
   - Delete button (only shown when mapping exists) → DELETE → reload on success
   - Toast feedback for success/error

## Deviations from Plan

### [Rule 3 - Blocking Fix] campaigns.edit → campaigns.manage
- **Found during:** Task 2
- **Issue:** Plan referenced `campaigns.edit` permission which does not exist in `PERMISSIONS` array
- **Fix:** Used `campaigns.manage` which is the correct permission for editing operations per existing API routes
- **Files modified:** `src/app/api/groups/[id]/members/lid-mapping/route.ts`

## Success Criteria ✅

- [x] `deleteLidMapping` exists in `db-lid-manual-mapping.ts`
- [x] POST `/api/groups/[id]/members/lid-mapping` upserts mapping
- [x] DELETE `/api/groups/[id]/members/lid-mapping` removes mapping
- [x] Members tab @lid rows with null voterName show "Não mapeado" badge
- [x] Clicking @lid row opens modal pre-filled if mapping exists
- [x] Save → POST → member row shows voterName after reload
- [x] Delete → DELETE → member row returns to "Não mapeado"

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `402755f` | feat(260403-1ta): add deleteLidMapping function |
| 2 | `4916ce9` | feat(260403-1ta): POST+DELETE /api/groups/[id]/members/lid-mapping route |
| 3 | `cf3bc68` | feat(260403-1ta): add LidMappingModal to group members UI |

## Self-Check

- [x] `src/lib/db-lid-manual-mapping.ts` — `deleteLidMapping` function exists at line 58
- [x] `src/app/api/groups/[id]/members/lid-mapping/route.ts` — file created with POST + DELETE handlers
- [x] `src/app/grupos/[id]/page.tsx` — `LidMappingModal`, `lidModalOpen`, `openLidModal` all present
- [x] All 3 commits verified via `git log --oneline`
