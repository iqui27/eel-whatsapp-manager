# Phase 12: Campaign Personalization Completion - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** Production UAT on `/campanhas` + direct user request

<domain>
## Phase Boundary

This phase closes the remaining personalization gaps in the campaign editor and send pipeline so operators can trust that what they configure is what voters receive.

Primary target:
- `/campanhas/nova`
- `/campanhas/[id]/editar`
- `/campanhas/[id]/agendar`
- outbound send execution for manual and scheduled campaigns

Support target:
- `/settings` as the source of truth for candidate profile information

This phase must unify four currently divergent layers:
- candidate configuration
- variable toolbar / template authoring
- WhatsApp preview rendering
- delivery-time interpolation

Out of scope unless research proves unavoidable:
- multi-candidate or multi-tenant campaign management
- AI-generated copy or prompt-based template authoring
- new analytics/reporting surfaces beyond what is needed to verify personalization parity
- generalized templating features like loops, conditionals, or arbitrary custom variables

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- Candidate information must have a real configuration source of truth; mock values like `Dr. Silva` are no longer acceptable.
- The list of supported campaign variables must be shared across editor, preview, persistence, and delivery; no page-local variable definitions should remain.
- Preview output and outbound delivery must resolve the same placeholders with the same semantics.
- Unsupported or unconfigured placeholders must be surfaced before save/send; the operator should not discover them only after dispatch.
- The phase must stay within the existing stack and existing configuration model (`config` table, Next.js app routes, Drizzle, current settings page).

### Claude's Discretion
- Exact candidate fields to add to settings beyond the minimum required display name
- Whether campaign send should resolve `{data}` from scheduled execution time, saved schedule time, or immediate dispatch time
- How strictly to block save vs block schedule/send when candidate configuration is incomplete
- Whether to snapshot resolved variable metadata into `campaigns.variables` only or add further persistence
- Exact UI affordances for explaining missing candidate configuration and unsupported placeholders

</decisions>

<specifics>
## Specific Ideas

- Replace the page-local `VARIABLES` arrays in the campaign pages with a shared registry module
- Use one shared resolver for preview values and actual delivery interpolation
- Expand `/settings` so operators can configure candidate details in the same place they configure the WhatsApp provider
- Make `campaigns.variables` represent the actual placeholders used by the saved template
- Include voter-backed variables already available in the data model, especially `{zona}` and `{secao}`, instead of hiding them from operators

</specifics>

<deferred>
## Deferred Ideas

- Multiple candidate profiles with per-campaign switching
- Advanced template syntax (conditional blocks, helper functions, computed segments)
- Template library / reusable snippet management
- Candidate media assets and branded preview chrome

</deferred>

---

*Phase: 12-campaign-personalization-completion*
*Context gathered: 2026-03-09 via direct request*
