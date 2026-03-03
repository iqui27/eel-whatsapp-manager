export interface Cluster {
  id: string;
  name: string;
  messages: string[];
  maxMessagesPerDay: number;
  priority: number;
  windowStart?: string;
  windowEnd?: string;
  enabled: boolean;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  clusterIds: string[];
  lastContacted?: string;
  contactCount: number;
  enabled: boolean;
}

interface ContactsData {
  clusters: Cluster[];
  contacts: Contact[];
}

const CONTACTS_FILE = '.eel-contacts.json';

const DEFAULT_DATA: ContactsData = {
  clusters: [],
  contacts: [],
};

async function getContactsPath() {
  const path = await import('path');
  const { getConfigPath } = await import('./config');
  return path.join(getConfigPath(), CONTACTS_FILE);
}

export async function loadContactsData(): Promise<ContactsData> {
  try {
    const fs = await import('fs/promises');
    const filePath = await getContactsPath();
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data) as Partial<ContactsData>;
    return {
      clusters: parsed.clusters ?? [],
      contacts: parsed.contacts ?? [],
    };
  } catch {
    return { ...DEFAULT_DATA };
  }
}

export async function saveContactsData(data: ContactsData): Promise<void> {
  const fs = await import('fs/promises');
  const filePath = await getContactsPath();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function loadClusters(): Promise<Cluster[]> {
  const data = await loadContactsData();
  return data.clusters;
}

export async function loadContacts(): Promise<Contact[]> {
  const data = await loadContactsData();
  return data.contacts;
}

export async function addCluster(cluster: Cluster): Promise<void> {
  const data = await loadContactsData();
  data.clusters.push(cluster);
  await saveContactsData(data);
}

export async function updateCluster(id: string, updates: Partial<Cluster>): Promise<void> {
  const data = await loadContactsData();
  const index = data.clusters.findIndex((c) => c.id === id);
  if (index !== -1) {
    data.clusters[index] = { ...data.clusters[index], ...updates };
    await saveContactsData(data);
  }
}

export async function deleteCluster(id: string): Promise<void> {
  const data = await loadContactsData();
  data.clusters = data.clusters.filter((c) => c.id !== id);
  data.contacts = data.contacts.map((contact) => ({
    ...contact,
    clusterIds: contact.clusterIds.filter((clusterId) => clusterId !== id),
  }));
  await saveContactsData(data);
}

export async function addContact(contact: Contact): Promise<void> {
  const data = await loadContactsData();
  data.contacts.push(contact);
  await saveContactsData(data);
}

export async function updateContact(id: string, updates: Partial<Contact>): Promise<void> {
  const data = await loadContactsData();
  const index = data.contacts.findIndex((c) => c.id === id);
  if (index !== -1) {
    data.contacts[index] = { ...data.contacts[index], ...updates };
    await saveContactsData(data);
  }
}

export async function deleteContact(id: string): Promise<void> {
  const data = await loadContactsData();
  data.contacts = data.contacts.filter((c) => c.id !== id);
  await saveContactsData(data);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  const contacts = await loadContacts();
  return contacts.find((c) => c.id === id);
}

export async function getCluster(id: string): Promise<Cluster | undefined> {
  const clusters = await loadClusters();
  return clusters.find((c) => c.id === id);
}
