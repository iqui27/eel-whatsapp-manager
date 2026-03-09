---
phase: 13
slug: zero-pendency-release-closure
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-09
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for closing all remaining milestone gaps with a production-backed sign-off.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js/TypeScript build gates + route/API smoke + production-backed UAT |
| **Config file** | `tsconfig.json` / `package.json` |
| **Quick run command** | `node_modules/.bin/tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~10-20 minutes per plan + live deploy/UAT time for final sign-off |

---

## Sampling Rate

- **After every task commit:** Run `node_modules/.bin/tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before phase sign-off:** full suite plus final production-backed page/API/UAT sweep must be green
- **Max feedback latency:** 10 minutes for local validation, longer only for deploy/UAT

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | CLOSE-01 | build + manual | `node_modules/.bin/tsc --noEmit` | ✅ | ✅ green |
| 13-01-02 | 01 | 1 | CLOSE-02 | build + manual | `npm run build` | ✅ | ✅ green |
| 13-02-01 | 02 | 1 | SEC-01 | API smoke + build | `node_modules/.bin/tsc --noEmit` | ✅ | ✅ green |
| 13-02-02 | 02 | 1 | SEC-02 | UI/authz + build | `npm run build` | ✅ | ✅ green |
| 13-03-01 | 03 | 2 | CRM-01, MOB-01 | persistence/mobile + build | `node_modules/.bin/tsc --noEmit` | ✅ | ✅ green |
| 13-03-02 | 03 | 2 | MOB-02 | mobile workflow + build | `npm run build` | ✅ | ✅ green |
| 13-04-01 | 04 | 3 | REP-02 | export/cron + build | `node_modules/.bin/tsc --noEmit` | ✅ | ✅ green |
| 13-04-02 | 04 | 3 | REP-02 | report scheduling UAT | `npm run build` | ✅ | ✅ green |
| 13-05-01 | 05 | 4 | REL-01 | deploy parity + live smoke | `node_modules/.bin/tsc --noEmit` | ✅ | ✅ green |
| 13-05-02 | 05 | 4 | REL-02 | final zero-pendency verdict | `npm run build` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⛔ blocked*

---

## Wave 0 Requirements

Execution depends on the following prerequisites:

- at least one admin-capable authenticated account
- at least one lower-privilege account or safe fixture for authz verification
- a writable target database for any CRM/report schedule persistence changes
- a safe delivery/reporting environment for scheduled job verification
- deploy access to the real production host before final sign-off

If a prerequisite is missing, the affected verification must be marked `⛔ blocked` with the exact reason.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Configured setup state | CLOSE-01 | Must verify UX state, not just API response | Open `/setup` in a configured environment and confirm it redirects or shows an explicit already-configured state |
| Real shell contract | CLOSE-02 | Search/period/alerts/profile meaning must be checked visually | Open multiple pages and confirm the topbar reflects real state or intentionally reduced functionality |
| Role/region authorization | SEC-01, SEC-02 | Needs real `401` vs `403` behavior plus blocked UI actions | Exercise sensitive routes/actions with multiple roles and confirm forbidden actions are blocked consistently |
| CRM persistence | CRM-01 | Requires cross-reload/device confidence | Save notes/checklist on a voter, reload, and confirm the data persists from the shared backend |
| Mobile offline workflows | MOB-01, MOB-02 | Offline/reconnect and responsive UX cannot be proven statically | Simulate offline capture, reconnect, sync, and urgent inbox handling on a mobile viewport |
| Scheduled report automation | REP-02 | Requires timing/configuration behavior review | Create a schedule, confirm export payload generation, and verify dry-run/live dispatch behavior |
| Final live sign-off | REL-01, REL-02 | “No pending items” is a production claim | Deploy current HEAD, walk all shipped routes, and record explicit PASS/FAIL evidence |

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual-only coverage
- [x] Sampling continuity preserved across the 5 plans
- [x] Wave 0 prerequisites documented
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
