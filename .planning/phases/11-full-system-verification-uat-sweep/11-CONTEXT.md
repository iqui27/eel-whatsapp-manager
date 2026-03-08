# Phase 11: Full-System Verification + UAT Sweep - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning
**Source:** Direct user request + current project state

<domain>
## Phase Boundary

This phase verifies the shipped product end-to-end before release preparation. It is a verification/UAT phase, not a feature-expansion phase.

Primary targets:
- authentication, session handling, and protected-route behavior
- setup and operational baseline (`setup`, `settings`, `chips`, `contacts`, `clusters`, `history`, warming/log flows)
- electoral core flows (`importar`, `segmentacao`, `crm`, `campanhas`, scheduling, monitor)
- operator realtime flows (`/`, `ChatQueuePanel`, `/conversas`, webhook ingress, SSE stream, outbound replies)
- governance surfaces (`compliance`, `admin`, `relatorios`)

Outputs:
- one consolidated verification ledger with PASS/FAIL/BLOCKED evidence
- per-plan execution summaries
- an explicit gap list for anything that fails materially

Out of scope unless execution proves it is unavoidable:
- broad feature redesign or roadmap expansion
- load/performance benchmarking
- formal security/pentest work
- building a permanent end-to-end automation framework from scratch

</domain>

<decisions>
## Implementation Decisions

### Locked Decisions
- Phase 10 finished delivery; the next meaningful step is a complete verification/UAT sweep.
- Verification must include both the newer electoral surfaces and the older operational pages still present in the shell and API.
- Recent Phase 09 and Phase 10 changes raise regression risk around real data, scheduling, monitoring, CRM deep links, and SSE chat behavior.
- Execution must produce durable artifacts, not ad hoc notes.
- Failures found during execution should be documented first and routed into gap work; the verification phase should not silently redefine scope.

### Claude's Discretion
- Exact split between manual UI verification and lightweight CLI/API smoke checks
- Whether to add a tiny helper artifact during execution if it reduces omission risk
- Ordering of verification blocks, as long as prerequisites and destructive-action safeguards are respected

</decisions>

<specifics>
## Specific Ideas

- Verify `/login` and protected-route redirects before deeper UAT to avoid false negatives.
- Confirm `setup` and `settings` are stable before testing chip-backed flows.
- Cover every user-facing page under `src/app`, including legacy operational pages that remain in navigation.
- Use safe, tightly scoped test data for campaign send/schedule verification; avoid uncontrolled dispatch to real audiences.
- Validate CRM deep links into `/conversas` and campaign creation because those were changed in Phase 09.
- Explicitly re-verify `/conversas` and the dashboard queue after the Phase 10 SSE rollout and subsequent hotfixes.
- Record blockers caused by external dependencies such as live session state, provider availability, or production-only integrations.

</specifics>

<deferred>
## Deferred Ideas

- Browser-matrix testing beyond primary desktop plus responsive smoke
- Synthetic load or soak testing for SSE
- Formal permission/security audit beyond functional role-based checks
- Full automated regression coverage via Playwright or similar

</deferred>

---

*Phase: 11-full-system-verification-uat-sweep*
*Context gathered: 2026-03-07 via direct request*
