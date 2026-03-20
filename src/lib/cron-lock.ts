import { db } from '@/db';
import { cronLocks } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Attempt to acquire a named cron lock.
 *
 * Uses an atomic INSERT...ON CONFLICT DO UPDATE...WHERE to ensure only one
 * instance of a cron can run at a time. If the existing lock has not expired,
 * the WHERE condition fails and no rows are updated → returns false.
 *
 * @param name  - Unique cron name, e.g. "send-queue"
 * @param ttlMs - Lock time-to-live in milliseconds (safety valve if cron crashes)
 * @returns true if lock was acquired, false if another instance holds it
 */
export async function acquireCronLock(name: string, ttlMs: number): Promise<boolean> {
  const expiresAt = new Date(Date.now() + ttlMs);

  try {
    // Atomic upsert: insert or update only if the existing lock has expired.
    // If the WHERE clause fails (lock still active), no rows are returned.
    const result = await db.execute(sql`
      INSERT INTO cron_locks (name, locked_at, expires_at)
      VALUES (${name}, NOW(), ${expiresAt})
      ON CONFLICT (name) DO UPDATE
        SET locked_at = NOW(), expires_at = ${expiresAt}
        WHERE cron_locks.expires_at < NOW()
      RETURNING name
    `);

    // postgres-js returns an array-like result; non-empty = lock acquired
    return Array.isArray(result) ? result.length > 0 : false;
  } catch {
    // On unexpected DB errors, deny the lock to be safe
    return false;
  }
}

/**
 * Release a named cron lock immediately.
 * Call this in a finally block after the cron completes.
 */
export async function releaseCronLock(name: string): Promise<void> {
  try {
    await db.delete(cronLocks).where(eq(cronLocks.name, name));
  } catch (err) {
    console.error(`[cron-lock] Failed to release lock "${name}":`, err);
    // Do not throw — release failure is non-fatal; lock will expire via TTL
  }
}

type LockResult<T> =
  | { locked: false }
  | { locked: true; result: T };

/**
 * Convenience wrapper: acquire lock, run fn, release lock.
 *
 * @param name  - Cron name used as lock key
 * @param ttlMs - Lock TTL in ms (safety valve for crash-without-release)
 * @param fn    - Cron body to execute while holding the lock
 * @returns `{ locked: false }` if lock not acquired, `{ locked: true, result }` otherwise
 */
export async function withCronLock<T>(
  name: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<LockResult<T>> {
  const acquired = await acquireCronLock(name, ttlMs);
  if (!acquired) {
    return { locked: false };
  }

  try {
    const result = await fn();
    return { locked: true, result };
  } finally {
    await releaseCronLock(name);
  }
}
