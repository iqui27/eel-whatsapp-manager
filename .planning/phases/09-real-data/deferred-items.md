# Deferred Items

## 2026-03-06

- `src/app/relatorios/page.tsx`: project-wide `tsc --noEmit` is currently blocked by `TS2339` (`Property 'label' does not exist on type 'DayBar'`) around line 177. This file is outside plan `09-03` scope and already modified in the dirty worktree, so it was left untouched.
