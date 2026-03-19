/**
 * Users data access — Drizzle / Supabase
 * App user management with roles and region scoping.
 */
import { db } from '@/db';
import {
  users,
  type User, type NewUser,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

// ─── Password helpers ────────────────────────────────────────────────────────

/**
 * Hash a plain-text password using scrypt.
 * Returns a "salt:hash" string safe to store in DB.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain-text password against a stored "salt:hash" string.
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

export type { User, NewUser };

export async function loadUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function loadEnabledUsers(): Promise<User[]> {
  return db
    .select()
    .from(users)
    .where(eq(users.enabled, true))
    .orderBy(desc(users.createdAt));
}

export async function getUser(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  return rows[0];
}

export async function addUser(
  data: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<User> {
  const rows = await db.insert(users).values({
    ...data,
    email: data.email.trim().toLowerCase(),
  }).returning();
  return rows[0];
}

export async function updateUser(
  id: string,
  data: Partial<Omit<NewUser, 'id' | 'createdAt'>>,
): Promise<User | undefined> {
  const rows = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return rows[0];
}

export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}
