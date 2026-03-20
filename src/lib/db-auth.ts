/**
 * Session auth — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based auth.ts
 */
import { db, sessions } from '@/db';
import { eq, lt } from 'drizzle-orm';
import { resolvePermissions, type AppRole, type Permission, type SessionActor } from '@/lib/authorization';
import { getUser } from '@/lib/db-users';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

// ─── In-memory session cache ──────────────────────────────────────────────────
// Eliminates 1-2 DB round trips per authenticated API request.
// TTL: 60s — short enough to pick up role changes / logouts quickly.
interface CachedSession {
  actor: SessionActor;
  cachedAt: number;
}
const SESSION_CACHE_TTL_MS = 60_000; // 60 seconds
const SESSION_CACHE_MAX_SIZE = 500;  // max cached sessions
const sessionCache = new Map<string, CachedSession>();

// Lazy purge of expired DB sessions — every 5 min, fire-and-forget
let lastPurgeAt = 0;
const PURGE_INTERVAL_MS = 5 * 60_000; // 5 min

interface CreateSessionInput {
  userId?: string | null;
  name: string;
  email?: string | null;
  role: AppRole;
  regionScope?: string | null;
  permissions?: Permission[];
  source?: SessionActor['source'];
}

/** Creates a new session token and persists it. Returns the token. */
export async function createSession(actor: CreateSessionInput): Promise<string> {
  // Expired session purge moved to lazy background — no longer blocking login
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    token,
    expiresAt,
    userId: actor.userId ?? null,
    actorName: actor.name,
    actorEmail: actor.email ?? null,
    actorRole: actor.role,
    actorRegionScope: actor.regionScope ?? null,
    actorPermissions: actor.permissions ?? [],
  });
  return token;
}

async function getStoredSession(token: string | undefined) {
  if (!token) return null;

  // Lazy purge: fire-and-forget every 5 min to avoid blocking
  if (Date.now() - lastPurgeAt > PURGE_INTERVAL_MS) {
    lastPurgeAt = Date.now();
    db.delete(sessions).where(lt(sessions.expiresAt, new Date())).catch(() => {});
  }

  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  const session = rows[0];
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await destroySession(token);
    return null;
  }

  return session;
}

export async function getSessionActor(token: string | undefined): Promise<SessionActor | null> {
  if (!token) return null;

  // ─── Cache hit: return immediately without any DB queries ────────────────
  const cached = sessionCache.get(token);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    return cached.actor;
  }

  // ─── Cache miss: full DB lookup ───────────────────────────────────────────
  const session = await getStoredSession(token);
  if (!session) return null;

  let actor: SessionActor;

  if (session.userId) {
    const user = await getUser(session.userId);
    const isEnabled = user?.enabled ?? true;
    if (!user || !isEnabled) {
      await destroySession(token);
      return null;
    }

    actor = {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: (user.role ?? 'voluntario') as AppRole,
      regionScope: user.regionScope ?? null,
      permissions: resolvePermissions((user.role ?? 'voluntario') as AppRole, user.permissions),
      enabled: isEnabled,
      source: 'user',
    };
  } else {
    const role = (session.actorRole ?? 'admin') as AppRole;
    actor = {
      userId: null,
      name: session.actorName ?? 'Administrador',
      email: session.actorEmail ?? null,
      role,
      regionScope: session.actorRegionScope ?? null,
      permissions: resolvePermissions(role, session.actorPermissions),
      enabled: true,
      source: 'bootstrap',
    };
  }

  // ─── Store in cache (with size guard) ────────────────────────────────────
  if (sessionCache.size >= SESSION_CACHE_MAX_SIZE) {
    // Evict oldest 100 entries (Map preserves insertion order)
    let evicted = 0;
    for (const key of sessionCache.keys()) {
      sessionCache.delete(key);
      evicted++;
      if (evicted >= 100) break;
    }
  }
  sessionCache.set(token, { actor, cachedAt: Date.now() });

  return actor;
}

/** Returns true if the token corresponds to a valid, non-expired session. */
export async function validateSession(token: string | undefined): Promise<boolean> {
  return (await getSessionActor(token)) !== null;
}

/** Removes a session token (logout). Invalidates cache immediately. */
export async function destroySession(token: string): Promise<void> {
  sessionCache.delete(token); // immediate cache invalidation on logout
  await db.delete(sessions).where(eq(sessions.token, token));
}
