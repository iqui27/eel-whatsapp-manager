# Phase 45: Performance Optimization v2 - Planning Context

## Current State Analysis

### What's Already Been Done (Phases 33-34)
✅ Bundle optimization (framer-motion removed, recharts lazy-loaded)
✅ Auth session cache with 60s TTL
✅ Polling hardening with visibility guards
✅ SSE optimization (poll interval 1.5s → 5s, voter caching)
✅ DB indexes and SQL pagination
✅ Cron overlap protection
✅ SSE connection limits (3/user, 50 global)
✅ SidebarLayout SWR caching

### Current Performance Baseline

**SWR Usage:** 3 instances only (very low adoption)
- SWR is already installed (v2.4.1)
- Most data fetching still uses raw useEffect+fetch

**Dynamic Imports:** 1 instance only
- Only recharts on /relatorios is lazy-loaded
- Heavy components load eagerly:
  - gemini-message-assistant.tsx: 617 lines
  - SendConfigPanel.tsx: 578 lines
  - message-analytics-charts.tsx: 438 lines
  - chip-profile-editor.tsx: 407 lines
  - command-palette.tsx: 373 lines
  - create-group-dialog.tsx: 343 lines
  - ChatQueuePanel.tsx: 213 lines

**Server Components:** 39 client components in src/app
- Many pages have 'use client' but could be server components
- Client directive could be pushed down to leaf components

**Barrel Imports:** NOT AN ISSUE
- No barrel files found (src/lib/index.ts doesn't exist)
- All imports are already direct

## Actual Performance Opportunities

### Priority 1: Expand SWR Usage (HIGH IMPACT)
**Rule:** client-swr-dedup
**Current:** 3 instances of useSWR
**Target:** 20-30 instances across data-fetching components

**Benefits:**
- Automatic request deduplication
- Built-in caching and revalidation
- Error handling and retry logic
- Loading states out of the box

**Candidates for SWR migration:**
- All pages with useEffect+fetch patterns
- Components fetching data on mount
- Repeated API calls across navigation

### Priority 2: Lazy Load Heavy Components (HIGH IMPACT)
**Rule:** bundle-dynamic-imports
**Current:** 1 dynamic import (recharts)
**Target:** 8-10 dynamic imports for heavy components

**Candidates:**
- GeminiMessageAssistant (617 lines) - loaded only when user clicks AI button
- ChipProfileEditor (407 lines) - loaded only when editing chip profile
- ChatQueuePanel (213 lines) - could be deferred
- SendConfigPanel (578 lines) - campaign-specific, not needed globally
- MessageAnalyticsCharts (438 lines) - only on campaign detail
- CommandPalette (373 lines) - only when Cmd+K pressed
- CreateGroupDialog (343 lines) - only when creating group

### Priority 3: Server Component Migration (MEDIUM-HIGH IMPACT)
**Rule:** server-serialization
**Current:** 39 client components in src/app
**Target:** Reduce to 20-25 by migrating static pages

**Candidates for RSC migration:**
- Static pages without interactivity
- Pages that only need client components for specific features
- Layout components that could fetch server-side

**Approach:**
1. Identify pages with 'use client' but minimal client-side logic
2. Move 'use client' to specific interactive components
3. Fetch data server-side where possible
4. Pass data as props to client components

### Priority 4: Derived State Cleanup (MEDIUM IMPACT)
**Rule:** rerender-derived-state-no-effect
**Pattern:** Remove useEffect for computed state

**Example:**
```typescript
// ❌ Avoid
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// ✅ Prefer
const fullName = `${firstName} ${lastName}`;
```

## Requirements (Revised based on actual state)

- PERF-45-01: Expand SWR usage from 3 to 25+ instances across data-fetching components
- PERF-45-02: Add 8-10 dynamic imports for heavy components (600+ lines)
- PERF-45-03: Migrate 10-15 pages from client to server components
- PERF-45-04: Remove unnecessary useEffect for derived state
- PERF-45-05: Add next/dynamic preload hints for interactive components

## Expected Outcomes

**Bundle Size Reduction:**
- Lazy loading heavy components: ~150-200KB reduction
- Better code splitting: Smaller initial chunks

**First Load JS Reduction:**
- Server components: Less JavaScript sent to client
- Dynamic imports: Components loaded on-demand
- Target: ~150KB → ~100KB (-33%)

**Time to Interactive Improvement:**
- Less JavaScript to parse and execute
- Deferred non-critical components
- Target: ~2.5s → ~1.8s (-28%)

**Runtime Performance:**
- SWR caching reduces redundant API calls
- Derived state computed during render (not effects)
- Better memory usage from lazy loading

## Dependencies

**Phase 44** (AI Analysis Enhancement) - complete
**SWR** - already installed (v2.4.1)
**Next.js 16** - supports RSC and dynamic imports
**vercel-react-best-practices** skill - available for patterns