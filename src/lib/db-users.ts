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

export type { User, NewUser };

export async function loadUsers(): Promise<User[]> {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUser(id: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function addUser(
  data: Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<User> {
  const rows = await db.insert(users).values(data).returning();
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
