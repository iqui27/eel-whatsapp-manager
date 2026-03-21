## Pre-existing TypeScript error (out of scope for 42-02)

**File:** src/lib/conversion-tracking.ts  
**Errors:** TS2304: Cannot find name 'sql' at lines 59, 95, 116, 240, 244, 248  
**Cause:** Missing `import { sql } from 'drizzle-orm'` in conversion-tracking.ts  
**Status:** Pre-existing before 42-02; not caused by this plan's changes  
**Action needed:** Add `sql` to the drizzle-orm import in conversion-tracking.ts  
