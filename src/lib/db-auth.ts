/**
 * Session auth — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based auth.ts
 */
import { db, sessions } from '@/db';
import { eq, lt } from 'drizzle-orm';
import { resolvePermissions, type AppRole, type Permission, type SessionActor } from '@/lib/authorization';
import { getUser } from '@/lib/db-users';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

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
  // Purge expired sessions first
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

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
  const session = await getStoredSession(token);
  if (!session) return null;

  if (session.userId) {
    const user = await getUser(session.userId);
    const isEnabled = user?.enabled ?? true;
    if (!user || !isEnabled) {
      await destroySession(token!);
      return null;
    }

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: (user.role ?? 'voluntario') as AppRole,
      regionScope: user.regionScope ?? null,
      permissions: resolvePermissions((user.role ?? 'voluntario') as AppRole, user.permissions),
      enabled: isEnabled,
      source: 'user',
    };
  }

  const role = (session.actorRole ?? 'admin') as AppRole;

  return {
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

/** Returns true if the token corresponds to a valid, non-expired session. */
export async function validateSession(token: string | undefined): Promise<boolean> {
  return (await getSessionActor(token)) !== null;
}

/** Removes a session token (logout). */
export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}
