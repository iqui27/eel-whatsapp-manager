# Phase 44: AI Analysis Enhancement + Campaign Tracking Fixes - Research

**Researched:** 2026-03-21
**Domain:** Gemini AI prompt engineering, conversation threading, tag taxonomy, Evolution API message ID correlation, campaign message queue
**Confidence:** HIGH (all findings grounded in direct code inspection)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AI-44-01 | `triggerAnalysis` passes full conversation thread (all messages with role labels and timestamps) to Gemini instead of 3 plain strings | `getRecentMessages` returns `string[]` with no direction/role — must query `sender` field from `conversationMessages` and pass structured thread |
| AI-44-02 | `suggestedTags` constrained to a predefined campaign taxonomy | `ANALYSIS_PROMPT` currently says "Tags relevantes" with no constraints — add `ALLOWED_TAGS` constant and inject into prompt |
| CAMP-44-01 | `messages.update` webhook correctly sets `readAt` / campaign `totalRead` | `updateMessageDeliveryStatus` looks up by `evolutionMessageId` — the issue is that old campaigns sent via `campaign-delivery.ts` never wrote to `messageQueue`, so there is nothing to look up |
| CAMP-44-02 | Campaign messages tab shows all messages | Root cause identified: legacy send path (`campaign-delivery.ts`) never inserts into `messageQueue` — messages tab queries `messageQueue WHERE campaignId=X` and finds zero rows |
</phase_requirements>

---

## Summary

Phase 44 addresses four bugs split across two domains: AI analysis quality and campaign delivery tracking accuracy.

**AI domain (AI-44-01, AI-44-02):** The current `triggerAnalysis` calls `getRecentMessages(phone, 3)` which returns a plain `string[]` of message content with no role labels, no direction (sent vs received), and no timestamps. The Gemini prompt receives these as "Mensagens anteriores" with no structural context. To fix this, `getRecentMessages` must be upgraded to return structured objects using the `sender` field already present in `conversationMessages` (enum: `voter | bot | agent`). The tag taxonomy problem is also in `gemini.ts`: `ANALYSIS_PROMPT` has no constraint on `suggestedTags`, so Gemini generates free-form strings like "saudação", "início-conversa", "teste" that have no strategic value. The fix is a `CAMPAIGN_TAG_TAXONOMY` constant injected into the prompt as an allowed list.

**Campaign tracking domain (CAMP-44-01, CAMP-44-02):** The root cause for both bugs is the same: there are two completely separate send paths, and the older one (`campaign-delivery.ts`) bypasses the message queue entirely. It calls `sendText` directly and records only in `campaignDeliveryEvents`, never in `messageQueue`. As a result: (1) `updateMessageDeliveryStatus` cannot find any row matching the `evolutionMessageId` from `messages.update` webhooks, so `readAt`/`totalRead` never update; and (2) the messages tab API (`/api/campaigns/[id]/messages`) queries `messageQueue WHERE campaignId=X` and correctly returns 0 rows because no rows were ever inserted there. The newer queue-based path (`db-campaigns.ts hydrateCampaign` + `send-queue` cron) is correct. Fix for CAMP-44-02: the messages tab must detect which send path was used and fall back to `campaignDeliveryEvents` when `messageQueue` is empty for a campaign. Fix for CAMP-44-01: for campaigns already sent, the `evolutionMessageId` is never in `messageQueue` so tracking is inherently impossible retroactively; the webhook handler should log a debug warning instead of silently no-oping when no message is found.

**Primary recommendation:** Fix AI context enrichment in `ai-analysis.ts` (structured thread) and `gemini.ts` (taxonomy prompt), then fix campaign messages tab to query `campaignDeliveryEvents` as fallback when `messageQueue` is empty.

---

## Standard Stack

### Core (no new libraries needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/generative-ai` | installed | Gemini API client | Already used in `gemini.ts` |
| `drizzle-orm` | installed | DB queries | Already used throughout |
| Next.js API routes | installed | Webhook + campaigns API | Already used throughout |

**No new packages required.** All changes are logic-only within existing files.

---

## Architecture Patterns

### Recommended Project Structure for Phase 44

```
src/lib/
├── gemini.ts              # Add CAMPAIGN_TAG_TAXONOMY constant + update ANALYSIS_PROMPT
├── ai-analysis.ts         # Update getRecentMessages to return structured thread
src/app/api/campaigns/[id]/messages/
└── route.ts               # Add fallback to campaignDeliveryEvents when messageQueue is empty
src/app/api/webhook/route.ts  # Add debug log when evolutionMessageId not found (not a bug fix, just observability)
```

### Pattern 1: Structured Conversation Thread

**What:** Replace `string[]` with `{ role: string; content: string; timestamp: string }[]` from `getRecentMessages`.

**When to use:** AI-44-01 — called by `triggerAnalysis` before passing to `analyzeMessage`.

The `conversationMessages` schema has `sender: text('sender', { enum: ['voter', 'bot', 'agent'] })` and `createdAt`. The role mapping for Gemini: `voter` → `"Eleitor"`, `bot` → `"Campanha"`, `agent` → `"Atendente"`. These Portuguese labels give Gemini clear semantic context.

**Current code (broken):**
```typescript
// src/lib/ai-analysis.ts — getRecentMessages
async function getRecentMessages(phone: string, limit: number): Promise<string[]> {
  const messages = await db
    .select({ content: conversationMessages.content })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversations.voterPhone, phone))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(limit);
  return messages.map(m => m.content);
}
```

**Fixed pattern:**
```typescript
// New interface
interface ConversationTurn {
  role: 'Eleitor' | 'Campanha' | 'Atendente';
  content: string;
  timestamp: string; // ISO string
}

async function getConversationThread(phone: string, limit: number = 20): Promise<ConversationTurn[]> {
  const messages = await db
    .select({
      sender: conversationMessages.sender,
      content: conversationMessages.content,
      createdAt: conversationMessages.createdAt,
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversations.voterPhone, phone))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(limit);

  const roleMap: Record<string, ConversationTurn['role']> = {
    voter: 'Eleitor',
    bot: 'Campanha',
    agent: 'Atendente',
  };

  // Reverse to chronological order before returning
  return messages.reverse().map(m => ({
    role: roleMap[m.sender] ?? 'Eleitor',
    content: m.content,
    timestamp: m.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}
```

The `AnalysisContext.previousMessages` field in `gemini.ts` is currently `string[]`. It must be updated to `ConversationTurn[]` or a new `conversationThread` field added. The Gemini prompt must format the thread as a structured exchange.

### Pattern 2: Tag Taxonomy Constraint

**What:** Add `CAMPAIGN_TAG_TAXONOMY` constant to `gemini.ts` and inject into the Gemini prompt.

**When to use:** AI-44-02 — prevents Gemini from generating arbitrary tags.

**Location:** `src/lib/gemini.ts` — hardcoded constant (no DB config needed — taxonomy is stable for this campaign context).

```typescript
// src/lib/gemini.ts
export const CAMPAIGN_TAG_TAXONOMY = [
  // Posicionamento político
  'apoiador', 'indeciso', 'opositor',
  // Temas de interesse
  'saúde', 'educação', 'segurança', 'emprego', 'transporte', 'moradia', 'meio-ambiente',
  // Engajamento
  'ativo', 'inativo', 'respondeu', 'sem-resposta',
  // Qualidade do contato
  'número-errado', 'não-pertence', 'bloqueado', 'opt-out',
  // Classificação geral
  'liderança-comunitária', 'idoso', 'jovem', 'trabalhador',
] as const;
```

The `ANALYSIS_PROMPT` addition:
```
3. "suggestedTags": string[] - Escolha até 3 tags da lista abaixo que melhor classificam este eleitor.
   LISTA PERMITIDA: {{TAXONOMY}}
   Use APENAS tags desta lista. Não invente novas tags.
```

### Pattern 3: Campaign Messages Tab Fallback

**What:** When `messageQueue WHERE campaignId=X` returns 0 rows, the API falls back to querying `campaignDeliveryEvents WHERE campaignId=X AND eventType='message_sent'`.

**When to use:** CAMP-44-02 — campaigns sent via `campaign-delivery.ts` (legacy direct-send) never wrote to `messageQueue`.

**Root cause confirmed:** `campaign-delivery.ts` calls `sendText` directly and records in `campaignDeliveryEvents` only. It does NOT call `enqueueMessages`. The messages tab API at `/api/campaigns/[id]/messages` queries `messageQueue WHERE campaignId=X` exclusively.

The `campaignDeliveryEvents` table has: `campaignId`, `chipId`, `voterId`, `voterPhone`, `eventType` (values: `send_started`, `send_completed`, `send_failed`, `send_warning`, `message_sent`, `message_failed`), `message`, `metadata`, `createdAt`.

**Fallback logic:**
```typescript
// In /api/campaigns/[id]/messages GET handler
// After: const total = countResult?.count ?? 0;
if (total === 0) {
  // Check if this is a legacy campaign (sent via campaign-delivery.ts)
  // Fall back to campaignDeliveryEvents
  const legacyEvents = await db
    .select()
    .from(campaignDeliveryEvents)
    .where(
      and(
        eq(campaignDeliveryEvents.campaignId, id),
        eq(campaignDeliveryEvents.eventType, 'message_sent')
      )
    )
    .orderBy(desc(campaignDeliveryEvents.createdAt))
    .limit(limit)
    .offset(offset);
  // ... map to MessageRow format using metadata for chip/voter info
}
```

### Pattern 4: messages.update Debug Logging

**What:** When `updateMessageDeliveryStatus` returns `{ updated: false }` because `evolutionMessageId` not found, add a debug-level log so operators can diagnose.

**Current code (line 517-520 of webhook/route.ts):**
```typescript
const result = await updateMessageDeliveryStatus(msgId, deliveryStatus, failReason);
if (result.updated) {
  console.log('[webhook] Updated message', msgId, '→', deliveryStatus, 'campaign:', result.campaignId);
}
```

**Fix:** Add an else branch:
```typescript
} else {
  console.debug('[webhook] messages.update: no messageQueue row for evolutionMessageId', msgId, '(likely legacy campaign)');
}
```

This is not a tracking fix for past campaigns — it's observability. For CAMP-44-01 going forward, all campaigns sent via the queue path will have `evolutionMessageId` populated by `markMessageSent(msg.id, result.key.id)` in `send-queue` cron and the tracking will work correctly.

### Anti-Patterns to Avoid

- **Modifying `AnalysisContext.previousMessages` type to `ConversationTurn[]`:** This would break callers passing plain strings. Instead, add a new `conversationThread?: ConversationTurn[]` field to `AnalysisContext` and keep `previousMessages` as the fallback.
- **Adding taxonomy to DB config table:** The taxonomy is campaign-specific and stable for this project — hardcoded in `gemini.ts` is correct. DB config adds unnecessary complexity.
- **Attempting to retroactively fix `messageQueue` for campaigns already sent via legacy path:** Rows never existed; no retroactive fix is possible. The fallback to `campaignDeliveryEvents` is the correct solution.
- **Removing `campaign-delivery.ts` send path:** It is still used (Phase 42 was working). Do not remove or alter it; only fix the messages tab to query both data sources.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tag validation | Custom fuzzy matcher for Gemini output | Prompt constraint + simple filter `suggestedTags.filter(t => TAXONOMY.includes(t))` | Gemini follows clear prompts reliably; over-engineering is waste |
| Message thread context | New DB table for "conversation turns" | Existing `conversationMessages.sender` field | Data already exists with direction info |
| Legacy-to-queue migration | Back-fill messageQueue from campaignDeliveryEvents | Fallback query in messages API | Back-fill would require fabricating `evolutionMessageId` which would corrupt tracking |

---

## Common Pitfalls

### Pitfall 1: Thread Order — DESC vs ASC

**What goes wrong:** `getConversationThread` queries `ORDER BY createdAt DESC` (most recent first) then must reverse before formatting for Gemini. If reversal is omitted, Gemini receives the conversation backwards.

**Why it happens:** Pagination queries use DESC to get the most recent N messages, but Gemini needs chronological (oldest-first) order to understand conversational flow.

**How to avoid:** Always `.reverse()` the result array after the DB query, before formatting.

**Warning signs:** Gemini sentiment analysis gives results opposite to expected (e.g., negative when the last messages were positive).

### Pitfall 2: `conversationMessages.sender` = 'bot' Does Not Mean Campaign Message

**What goes wrong:** `bot` messages in `conversationMessages` are automated bot responses, not campaign blast messages. Campaign messages sent via `messageQueue` do not create `conversationMessages` rows unless the voter replies and triggers a conversation thread.

**Why it happens:** The two systems (campaign queue and conversation system) are separate. A voter who receives a campaign blast and never replies will have no `conversationMessages` rows — the conversation thread will be empty.

**How to avoid:** `triggerAnalysis` is only called on inbound messages (webhook `messages.upsert` where `fromMe` is false). By the time it triggers, there is at least one voter message in `conversationMessages`. The outgoing campaign message is not in that table. The thread will show only the conversation, not the original blast.

**Recommendation:** This is acceptable behavior. The prompt context already includes `voterTags` and `campaignContext` for campaign background. The thread just needs to show the reply exchange.

### Pitfall 3: `campaignDeliveryEvents.metadata` Shape Is Not Enforced

**What goes wrong:** The `metadata` column is `jsonb` with type `Record<string, unknown> | null`. When building `MessageRow` from legacy events, chip name comes from `metadata.chipName` but it could be undefined/null if the event was recorded before that field was standardized.

**Why it happens:** `metadata` schema is loose by design. Old events may have different fields.

**How to avoid:** Always null-coalesce: `(metadata?.chipName as string) ?? null`. Never trust metadata shape without a guard.

### Pitfall 4: evolutionMessageId Format — No Known Format Mismatch

**What goes wrong (concern from investigation):** Could Evolution API return a different ID in `messages.update` (webhook) vs. the original send response (`result.key.id`)?

**Finding:** Based on code inspection, `markMessageSent(msg.id, result.key.id)` stores `result.key.id` as `evolutionMessageId`, and the webhook handler uses `key.id` from the update event. The IDs should match because they are the same message key. The reason the current tracking fails is not an ID mismatch — it is that the legacy `campaign-delivery.ts` path never stored any `evolutionMessageId` in `messageQueue` (it never inserted to `messageQueue` at all). For future campaigns sent via the cron queue path, the ID correlation should work correctly.

**Confidence:** MEDIUM — can only be confirmed by live testing a queue-based campaign and watching `messages.update` webhooks.

### Pitfall 5: TypeScript Type Change for AnalysisContext

**What goes wrong:** If `previousMessages: string[]` in `AnalysisContext` is changed to `ConversationTurn[]`, every caller that currently passes plain strings will have a compile error.

**How to avoid:** Add a new optional field `conversationThread?: ConversationTurn[]` to `AnalysisContext`. Keep `previousMessages?: string[]` for backward compatibility. In `analyzeMessage`, prefer `conversationThread` if present, fall back to `previousMessages`.

---

## Code Examples

Verified patterns from direct code inspection:

### Current getRecentMessages (source: src/lib/ai-analysis.ts:184-195)

```typescript
async function getRecentMessages(phone: string, limit: number): Promise<string[]> {
  const messages = await db
    .select({ content: conversationMessages.content })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(eq(conversations.voterPhone, phone))
    .orderBy(desc(conversationMessages.createdAt))
    .limit(limit);
  return messages.map(m => m.content);
}
// Called as: await getRecentMessages(voterPhone, 3)
```

### Current Gemini tag prompt (source: src/lib/gemini.ts:74)

```
3. "suggestedTags": string[] - Tags relevantes para categorizar o eleitor (ex: "apoiador", "dúvida-saúde", "reclamação")
```

No constraint — Gemini outputs anything it considers relevant.

### Current messages.update handler (source: src/app/api/webhook/route.ts:515-521)

```typescript
if (deliveryStatus && remoteJid) {
  const result = await updateMessageDeliveryStatus(msgId, deliveryStatus, failReason);
  if (result.updated) {
    console.log('[webhook] Updated message', msgId, '→', deliveryStatus, 'campaign:', result.campaignId);
  }
  // No else — silent no-op when message not found
}
```

### updateMessageDeliveryStatus lookup (source: src/lib/conversion-tracking.ts:201-207)

```typescript
const [message] = await db.select().from(messageQueue)
  .where(eq(messageQueue.evolutionMessageId, evolutionMessageId))
  .limit(1);
if (!message) {
  console.warn('[updateMessageDeliveryStatus] Message not found:', evolutionMessageId);
  return { updated: false };
}
```

### campaignDeliveryEvents schema (source: src/db/schema.ts:282-296)

```typescript
export const campaignDeliveryEvents = pgTable('campaign_delivery_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id),
  chipId: uuid('chip_id').references(() => chips.id),
  voterId: uuid('voter_id').references(() => voters.id),
  voterPhone: text('voter_phone'),
  eventType: text('event_type').notNull(), // 'message_sent' | 'message_failed' | ...
  message: text('message').notNull(),     // human-readable description
  metadata: jsonb('metadata'),            // { chipName, chipInstanceName, reason? }
  createdAt: timestamp('created_at'),
});
```

### conversationMessages schema — has direction (source: src/db/schema.ts:367-375)

```typescript
export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey(),
  conversationId: uuid('conversation_id').notNull(),
  sender: text('sender', { enum: ['voter', 'bot', 'agent'] }).notNull(), // ← direction field
  content: text('content').notNull(),
  createdAt: timestamp('created_at'),
});
```

`sender` is the direction field. `voter` = inbound from voter, `bot` = outbound automated, `agent` = outbound from human operator.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct `sendText` in `campaign-delivery.ts` | Queue-based `db-campaigns.ts hydrateCampaign` + cron | Phase 39+ | Old campaigns have no messageQueue rows |
| Free-form Gemini tags | Constrained taxonomy | Phase 44 (this phase) | Tags become strategically useful |
| 3 plain message strings | Full structured thread | Phase 44 (this phase) | Better sentiment/intent accuracy |

**Key architectural finding:** Two campaign send paths co-exist:
- **Legacy path** (`/api/campaigns/[id]/send` → `campaign-delivery.ts`): sends synchronously, records in `campaignDeliveryEvents` only, never creates `messageQueue` rows.
- **Queue path** (`/api/campaigns/[id]/hydrate` → `db-campaigns.ts:hydrateCampaign` → `send-queue` cron): inserts to `messageQueue` with `campaignId`, `evolutionMessageId` set by cron after send.

The campaign "Teste Zap 3" (totalSent=4, totalDelivered=4, 0 queue rows) was sent via the legacy path.

---

## Open Questions

1. **Will all future campaigns use the queue path, or is `campaign-delivery.ts` still the primary path?**
   - What we know: Both paths exist. `campaign-delivery.ts` is invoked by `/api/campaigns/[id]/send`, which is the button users click.
   - What's unclear: Whether the UI also triggers `hydrate` before `send`, or whether they are mutually exclusive flows.
   - Recommendation: Investigate `/api/campaigns/[id]/hydrate/route.ts` to understand when hydration is triggered. CAMP-44-02 fix (messages tab fallback) is safe regardless of which path is used.

2. **Is the messages tab fallback to `campaignDeliveryEvents` sufficient for CAMP-44-02, or does it also need to show queue-based messages?**
   - What we know: The messages tab needs to show all messages for a campaign. The query should return rows from whichever table contains them.
   - Recommendation: The fallback should be: query `messageQueue` first; if count is 0, query `campaignDeliveryEvents` with `eventType='message_sent'`. Map both to the same `MessageRow` shape.

3. **Should CAMP-44-01 also add duplicate `fromMe` field tracking to messages.update?**
   - What we know: The webhook `key` object has a `fromMe` boolean. Campaign messages have `fromMe=true` (sent by us). The webhook handler does not filter by `fromMe`, so it processes both inbound and outbound status updates.
   - What's unclear: Whether processing status updates for inbound messages could corrupt data.
   - Recommendation: Add `if (key.fromMe === false) continue;` guard before processing — only outbound messages need delivery tracking. This is a minor hardening step.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `src/lib/ai-analysis.ts` — `getRecentMessages` implementation confirmed
- Direct code inspection: `src/lib/gemini.ts` — `ANALYSIS_PROMPT` confirmed, no taxonomy constraint
- Direct code inspection: `src/lib/conversion-tracking.ts` — `updateMessageDeliveryStatus` lookup by `evolutionMessageId` confirmed
- Direct code inspection: `src/lib/campaign-delivery.ts` — confirmed uses `sendText` directly, no `enqueueMessages` call
- Direct code inspection: `src/lib/db-campaigns.ts:377-396` — `hydrateCampaign` uses `enqueueMessages` with `campaignId` correctly set
- Direct code inspection: `src/db/schema.ts` — `conversationMessages.sender` enum `['voter','bot','agent']` confirmed
- Direct code inspection: `src/db/schema.ts` — `campaignDeliveryEvents` fields confirmed
- Direct code inspection: `src/app/api/webhook/route.ts:515-526` — `messages.update` handler confirmed, no fallback on not-found

### Secondary (MEDIUM confidence)
- Inference from code: Evolution API `key.id` in send response and `messages.update` webhook should match (same message key) — cannot verify without live test

---

## Metadata

**Confidence breakdown:**
- AI analysis fixes (AI-44-01, AI-44-02): HIGH — all changes are self-contained in `ai-analysis.ts` and `gemini.ts`, schema supports it, no external dependencies
- Campaign tracking root cause (CAMP-44-01, CAMP-44-02): HIGH — two-path architecture confirmed by code inspection, root cause is clear
- CAMP-44-01 fix scope: MEDIUM — the fix is "add debug log + document limitation"; actual tracking improvement is only for future queue-based campaigns
- CAMP-44-02 fix: HIGH — fallback to `campaignDeliveryEvents` is the correct and complete fix

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (codebase is stable; these are isolated bug fixes)
