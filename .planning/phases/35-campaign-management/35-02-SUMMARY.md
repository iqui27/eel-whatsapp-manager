---
phase: 35-campaign-management
plan: "02"
subsystem: database
tags: [schema, migration, campaigns, chips, send-config, proxy]
dependency_graph:
  requires: [35-01]
  provides: [35-03, 35-04, 35-05]
  affects: [src/db/schema.ts, drizzle/0014_campaign_send_config.sql]
tech_stack:
  added: []
  patterns: [drizzle-orm, pg-column-defaults]
key_files:
  created:
    - drizzle/0014_campaign_send_config.sql
  modified:
    - src/db/schema.ts
decisions:
  - "Migration numbered 0014 (not 0013 as originally planned) because 0013_cron_locks.sql was added in Phase 34 between planning and execution"
  - "Generated migration included CREATE TABLE cron_locks — removed that statement since the table already exists in production from Phase 34"
  - "All 21 new columns have sensible defaults matching current hardcoded values in cron/send-queue/route.ts"
metrics:
  duration: "12 min"
  completed_date: "2026-03-20"
  tasks_completed: 2
  files_changed: 2
---

# Phase 35 Plan 02: Campaign DB Schema Expansion Summary

**One-liner:** Extended campaigns table with 16 send-config columns and chips table with 5 proxy columns; migration 0014 applied to production without data loss.

## What Was Built

### campaigns table — new columns (send configuration)
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `batch_size` | integer | 10 | Messages per batch |
| `min_delay_ms` | integer | 15000 | Min delay between messages |
| `max_delay_ms` | integer | 60000 | Max delay between messages |
| `send_rate` | text enum | 'normal' | Speed preset (slow/normal/fast) |
| `typing_delay_min` | integer | 2000 | Min typing simulation delay |
| `typing_delay_max` | integer | 5000 | Max typing simulation delay |
| `max_daily_per_chip` | integer | 200 | Daily cap per chip |
| `max_hourly_per_chip` | integer | 25 | Hourly cap per chip |
| `pause_on_chip_degraded` | boolean | true | Auto-pause if chip degrades |
| `selected_chip_ids` | text[] | '{}' | Multi-chip array for campaign |
| `chip_strategy` | text enum | 'round_robin' | round_robin / least_loaded / affinity |
| `rest_pause_every` | integer | 20 | Rest every N messages |
| `rest_pause_duration_ms` | integer | 180000 | 3-min rest pause |
| `long_break_every` | integer | 100 | Long break every N messages |
| `long_break_duration_ms` | integer | 900000 | 15-min long break |
| `circuit_breaker_threshold` | integer | 5 | Errors before circuit breaks |

### chips table — new columns (proxy configuration)
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `proxy_host` | text | null | Proxy server hostname |
| `proxy_port` | integer | null | Proxy port |
| `proxy_protocol` | text enum | null | http/https/socks4/socks5 |
| `proxy_username` | text | null | Proxy auth username |
| `proxy_password` | text | null | Proxy auth password |

## Verification

- `npx tsc --noEmit` → clean (no errors)
- `drizzle/0014_campaign_send_config.sql` → created and applied
- Production DB verified:
  - `campaigns.batch_size` ✅
  - `campaigns.selected_chip_ids` ✅
  - `campaigns.chip_strategy` ✅
  - `campaigns.circuit_breaker_threshold` ✅
  - `chips.proxy_host` ✅
  - `chips.proxy_protocol` ✅

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `5dd5076` | feat(35-02): extend campaigns and chips schema |
| Task 2 | `a498ad2` | chore(35-02): add migration 0014 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Migration included stale CREATE TABLE cron_locks**
- **Found during:** Task 2 (reviewing generated SQL)
- **Issue:** drizzle-kit diffed from its snapshot and regenerated the `cron_locks` table that was already applied in production via a separate migration (Phase 34, manually)
- **Fix:** Removed the `CREATE TABLE "cron_locks"` block from the generated migration before applying — only the new campaign/chip columns were needed
- **Files modified:** `drizzle/0014_campaign_send_config.sql`
- **Commit:** `a498ad2`

**2. [Rule 1 - Bug] Migration numbered 0014 instead of 0013**
- **Found during:** Task 2
- **Issue:** Plan was written expecting next migration to be 0013, but Phase 34 already created `0013_cron_locks.sql`
- **Fix:** Named the migration `0014_campaign_send_config.sql` to maintain sequence integrity
- **Files modified:** Migration filename only

## Self-Check: PASSED

- `src/db/schema.ts` — modified ✅
- `drizzle/0014_campaign_send_config.sql` — created ✅
- Commit `5dd5076` — exists ✅
- Commit `a498ad2` — exists ✅
- Production columns verified via psql query ✅
