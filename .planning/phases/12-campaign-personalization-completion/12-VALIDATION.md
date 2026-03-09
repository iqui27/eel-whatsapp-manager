---
phase: 12
slug: campaign-personalization-completion
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-09
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for campaign personalization integrity.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js/TypeScript build gates + targeted API smoke + manual campaign UAT |
| **Config file** | `tsconfig.json` / `package.json` |
| **Quick run command** | `node_modules/.bin/tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10-15 minutes per wave + 20 minutes of manual campaign verification |

---

## Sampling Rate

- **After every task commit:** Run `node_modules/.bin/tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before phase sign-off:** Full suite plus focused campaign editor/send UAT must be green
- **Max feedback latency:** 10 minutes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | PERS-01 | build + manual | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | PERS-02 | build + manual | `npm run build` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 2 | PERS-02, PERS-04 | build + manual | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 12-02-02 | 02 | 2 | PERS-04 | API smoke + build | `npm run build` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 3 | PERS-03 | build + manual send smoke | `node_modules/.bin/tsc --noEmit` | ✅ | ⬜ pending |
| 12-03-02 | 03 | 3 | PERS-05 | end-to-end UAT | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⛔ blocked*

---

## Wave 0 Requirements

Execution depends on the following prerequisites:

- an authenticated operator session
- a writable settings/config row in the target environment
- at least one voter fixture with `name`, `neighborhood`, `zone`, `section`, and `tags`
- at least one connected chip or a safe provider-ready environment for manual send verification
- a candidate profile configured before testing templates that use `{candidato}`

If a prerequisite is missing, the affected verification must be marked `⛔ blocked` with the exact reason.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Candidate profile persistence in settings | PERS-01 | Requires UI save/reload confidence | Open `/settings`, save candidate fields, reload, and confirm values remain consistent |
| Shared variable toolbar in new/edit flows | PERS-02 | Needs page-level UX validation | Compare `/campanhas/nova` and `/campanhas/[id]/editar`; verify both expose the same supported placeholders and guidance |
| Preview parity for `{candidato}` and `{data}` | PERS-03 | Visual rendering must match business semantics | Create a campaign using those placeholders, inspect preview before save, then inspect resolved output during send validation |
| Blocking unsupported placeholders | PERS-04 | Requires operator-visible error behavior | Attempt to save/schedule/send with an unknown placeholder and confirm the UI/API reject it with a clear message |
| No raw placeholders in delivered content | PERS-05 | Real provider-backed flow cannot be proven statically | Send a safe verification campaign and inspect the resolved outbound text or resulting delivery event payload |

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual-only coverage
- [x] Sampling continuity preserved across the 3 plans
- [x] Wave 0 prerequisites documented
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
