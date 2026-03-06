---
phase: 10
slug: real-time-chat-via-sse
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-06
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | TypeScript + Next.js build verification |
| **Config file** | `tsconfig.json` / `package.json` |
| **Quick run command** | `node_modules/.bin/tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node_modules/.bin/tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | realtime stream route | integration | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | delta query helpers | build | `npm run build` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 2 | `/conversas` realtime queue updates | build | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 2 | active thread realtime updates | build | `npm run build` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 3 | dashboard queue realtime updates | build | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Queue updates appear without polling delay | realtime queue | Requires browser stream lifecycle | Open `/conversas`, trigger inbound message via webhook or second session, confirm queue row updates immediately |
| Active thread receives persisted messages live | realtime thread | Requires cross-request event propagation | Keep one conversation open, send reply or inbound message, verify thread updates without 5s polling wait |
| Stream reconnects cleanly | reconnect UX | Needs browser/network interruption | Disconnect/reconnect network or reload tab, confirm stream resumes and last cursor prevents gaps/duplication |
| Unauthorized access is rejected | auth boundary | Requires cookie/session setup | Call SSE route without auth cookie and confirm `401` |
| Dashboard queue panel updates live | dashboard queue | Needs visual verification on dashboard | Open dashboard and trigger open-conversation changes, confirm panel count/list updates if in scope |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
