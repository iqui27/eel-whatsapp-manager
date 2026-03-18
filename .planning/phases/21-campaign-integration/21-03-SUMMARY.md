---
phase: 21
plan: 03
name: automatic-group-overflow
subsystem: groups, notifications
tags: [overflow, groups, automation, notifications]
duration: 15 min
completed_at: "2026-03-18T03:30:00Z"
---

# Phase 21 Plan 03: Automatic Group Overflow - Summary

## One-liner
Automatic group overflow detection and creation when groups reach 90% capacity, with cache invalidation and dashboard alerts.

## Key Decisions
- **Overflow threshold**: 90% of maxSize (~922 members for 1024 max)
- **Cache invalidation**: Segment-based invalidation when overflow created
- **Notification system**: Centralized notifications for overflow events

## Files Created
- `src/app/api/cron/group-overflow/route.ts` - Overflow detection cron endpoint

## Files Modified
- `src/lib/group-link-cache.ts` - Added `invalidateGroupCache()` function
- `src/lib/notifications.ts` - Added `sendGroupOverflowNotification()`, `sendGroupCapacityWarning()`, exported `StoredNotification` type
- `src/components/alerts-panel.tsx` - Added support for `group_overflow` and `group_capacity` alert types
- `src/app/api/dashboard/operations/route.ts` - Added group notifications to alerts

## Implementation Details

### Overflow Detection Cron
- Checks all active groups where `currentSize >= maxSize * 0.9`
- Finds appropriate chip for overflow (same segment or assigned chip)
- Creates overflow group using existing `createOverflowGroup()` function
- Invalidates cache for affected segment
- Sends notification to dashboard

### Cache Invalidation
- `invalidateGroupCache(segmentTag)` clears all cached links for a segment
- Called when overflow group is created
- Ensures next campaign uses new group link

### Dashboard Alerts
- Group overflow alerts shown with green icon
- Group capacity warnings shown with yellow icon
- Displays group name and segment tag

## Success Criteria Met
- [x] Overflow cron detects groups at 90%+
- [x] New group created automatically
- [x] Campaign links updated (via cache invalidation)
- [x] Notifications sent
- [x] Dashboard shows alerts

## Commits
- `f5f2edc`: feat(21-03): implement automatic group overflow system