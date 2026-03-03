/**
 * Session-based auth — never stores the raw password in the cookie.
 * A random token is generated at login, saved to .eel-sessions.json,
 * and the cookie holds only that token.
 */

const SESSIONS_FILE = '.eel-sessions.json';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

interface Session {
  token: string;
  createdAt: string;
}

async function getSessionsPath(): Promise<string> {
  const path = await import('path');
  const { getConfigPath } = await import('./config');
  return path.join(getConfigPath(), SESSIONS_FILE);
}

async function loadSessions(): Promise<Session[]> {
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(await getSessionsPath(), 'utf-8');
    const all: Session[] = JSON.parse(data);
    // Purge expired
    const cutoff = Date.now() - SESSION_TTL_MS;
    return all.filter(s => new Date(s.createdAt).getTime() > cutoff);
  } catch {
    return [];
  }
}

async function saveSessions(sessions: Session[]): Promise<void> {
  const fs = await import('fs/promises');
  await fs.writeFile(await getSessionsPath(), JSON.stringify(sessions, null, 2));
}

/** Creates a new session token and persists it. Returns the token. */
export async function createSession(): Promise<string> {
  const token = crypto.randomUUID() + '-' + crypto.randomUUID();
  const sessions = await loadSessions();
  sessions.push({ token, createdAt: new Date().toISOString() });
  await saveSessions(sessions);
  return token;
}

/** Returns true if the token corresponds to a valid, non-expired session. */
export async function validateSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const sessions = await loadSessions();
  return sessions.some(s => s.token === token);
}

/** Removes a session token (logout). */
export async function destroySession(token: string): Promise<void> {
  const sessions = await loadSessions();
  await saveSessions(sessions.filter(s => s.token !== token));
}
