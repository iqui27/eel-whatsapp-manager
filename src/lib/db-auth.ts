/**
 * Session auth — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based auth.ts
 */
import { db, sessions } from '@/db';
import { eq, lt } from 'drizzle-orm';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

/** Creates a new session token and persists it. Returns the token. */
export async function createSession(): Promise<string> {
  // Purge expired sessions first
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({ token, expiresAt });
  return token;
}

/** Returns true if the token corresponds to a valid, non-expired session. */
export async function validateSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (rows.length === 0) return false;
  return true;
}

/** Removes a session token (logout). */
export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}
