---
phase: 30-header-cleanup
plan: "02"
subsystem: cleanup
tags: [cleanup, redirects, accents, deprecated-routes]
key_files: {modified: [src/app/history/, src/app/contacts/, src/app/clusters/, src/components/SidebarLayout.tsx]}
metrics: {duration: "10 min", completed: "2026-03-19", tasks: "2/2", files: "7"}
---
# Phase 30 Plan 02
**One-liner:** Deprecated routes (/history→/historico, /contacts→/crm, /clusters→/) replaced with server redirects; all sidebar nav labels corrected to proper Portuguese accents; zero placeholder emails remain
## Commits: `41d566a`
## Self-Check: PASSED
