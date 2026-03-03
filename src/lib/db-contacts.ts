/**
 * Contacts + Clusters data access — Drizzle / Supabase
 * Drop-in replacement for the old JSON-based contacts.ts
 */
import { db, contacts, clusters, contactClusters, type Contact, type Cluster, type NewContact, type NewCluster } from '@/db';
import { eq, inArray } from 'drizzle-orm';

export type { Contact, Cluster, NewContact, NewCluster };

// ─── Contacts ────────────────────────────────────────────────────────────────

export async function loadContacts(): Promise<Contact[]> {
  return db.select().from(contacts).orderBy(contacts.createdAt);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const rows = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
  return rows[0];
}

export async function addContact(contact: Omit<NewContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
  const rows = await db.insert(contacts).values(contact).returning();
  return rows[0];
}

export async function updateContact(
  id: string,
  updates: Partial<Omit<NewContact, 'id' | 'createdAt'>>,
): Promise<Contact | undefined> {
  const rows = await db
    .update(contacts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();
  return rows[0];
}

export async function deleteContact(id: string): Promise<void> {
  await db.delete(contacts).where(eq(contacts.id, id));
}

// ─── Contact ↔ Cluster relationships ────────────────────────────────────────

export async function getContactClusterIds(contactId: string): Promise<string[]> {
  const rows = await db
    .select({ clusterId: contactClusters.clusterId })
    .from(contactClusters)
    .where(eq(contactClusters.contactId, contactId));
  return rows.map((r) => r.clusterId);
}

export async function setContactClusters(contactId: string, clusterIds: string[]): Promise<void> {
  await db.delete(contactClusters).where(eq(contactClusters.contactId, contactId));
  if (clusterIds.length > 0) {
    await db.insert(contactClusters).values(
      clusterIds.map((clusterId) => ({ contactId, clusterId })),
    );
  }
}

// ─── Clusters ────────────────────────────────────────────────────────────────

export async function loadClusters(): Promise<Cluster[]> {
  return db.select().from(clusters).orderBy(clusters.priority);
}

export async function getCluster(id: string): Promise<Cluster | undefined> {
  const rows = await db.select().from(clusters).where(eq(clusters.id, id)).limit(1);
  return rows[0];
}

export async function addCluster(cluster: Omit<NewCluster, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cluster> {
  const rows = await db.insert(clusters).values(cluster).returning();
  return rows[0];
}

export async function updateCluster(
  id: string,
  updates: Partial<Omit<NewCluster, 'id' | 'createdAt'>>,
): Promise<Cluster | undefined> {
  const rows = await db
    .update(clusters)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(clusters.id, id))
    .returning();
  return rows[0];
}

export async function deleteCluster(id: string): Promise<void> {
  // contactClusters and chipClusters cascade on delete
  await db.delete(clusters).where(eq(clusters.id, id));
}
