# Phase 10: Real-Time Chat via SSE - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning
**Source:** Direct user request + current project state

<domain>
## Phase Boundary

This phase upgrades the operator chat experience from polling to real-time updates where that materially improves response time and queue awareness.

Primary target:
- `/conversas` queue and active thread updates

Secondary target:
- dashboard chat queue surfaces that currently rely on polling and stale refresh windows

This phase should preserve the existing persistence model:
- inbound events still arrive through webhook persistence
- outbound agent replies still write through the existing API/database path
- real-time transport fans out already-persisted events; it should not become a separate source of truth

Out of scope unless research proves unavoidable:
- full bi-directional socket infrastructure for every page
- replacing all API fetches in the app with subscriptions
- delivery-status websockets for campaign monitoring
- mobile/offline flows

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- Real-time chat is the goal; transport may be SSE or WebSocket depending on what best fits the deployed Next.js 16 architecture.
- The current polling behavior in `/conversas` is insufficient and should be replaced for the core chat workflow.
- Existing webhook + database persistence remains canonical; transport streams should publish persisted state changes, not bypass storage.
- The phase should minimize infrastructure complexity and fit the current stack (Next.js 16, React 19, Drizzle, deployed app model).
- The user asked for WebSocket/SSE specifically, so the research and plans must compare them and justify the chosen transport.

### Claude's Discretion
- Exact stream topology: single stream per operator, per conversation, or split queue/message channels
- Whether dashboard chat queue joins the same stream in this phase or stays deferred
- Reconnection/backoff strategy and fallback-to-polling behavior
- Whether to use EventSource directly or wrap it in a small client abstraction/hook
- Exact file boundaries, route layout, and helper extraction

</decisions>

<specifics>
## Specific Ideas

- Replace the 10s conversation queue polling in `src/app/conversas/page.tsx`
- Replace the 5s active-message polling in `src/app/conversas/page.tsx`
- Reuse existing persisted conversation/message records so SSE events can stay thin
- Account for current webhook ingestion in `src/app/api/webhook/route.ts`
- Preserve auth boundaries for real-time routes
- Prefer a design that works in the current hosting/deployment model without introducing a separate realtime vendor unless absolutely necessary

</specifics>

<deferred>
## Deferred Ideas

- Realtime campaign monitor delivery events
- Presence/typing indicators
- Read receipts or live delivery acknowledgements from WhatsApp provider
- Global app-wide realtime bus for every module

</deferred>

---

*Phase: 10-real-time-chat-via-sse*
*Context gathered: 2026-03-06 via direct request*
