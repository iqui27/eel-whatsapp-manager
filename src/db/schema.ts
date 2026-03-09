import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  time,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Config ─────────────────────────────────────────────────────────────────
export const config = pgTable('config', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  evolutionApiUrl: text('evolution_api_url').notNull(),
  evolutionApiKey: text('evolution_api_key').notNull(),
  authPassword: text('auth_password').notNull(),
  warmingEnabled: boolean('warming_enabled').default(true),
  warmingIntervalMinutes: integer('warming_interval_minutes').default(60),
  warmingMessage: text('warming_message').default(''),
  instanceName: text('instance_name').notNull(),
  lastCronRun: timestamp('last_cron_run', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Chips ───────────────────────────────────────────────────────────────────
export const chips = pgTable('chips', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  instanceName: text('instance_name'),
  groupId: text('group_id'),
  enabled: boolean('enabled').default(true),
  lastWarmed: timestamp('last_warmed', { withTimezone: true }),
  status: text('status', { enum: ['connected', 'disconnected', 'warming'] })
    .default('disconnected')
    .notNull(),
  warmCount: integer('warm_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Contacts ────────────────────────────────────────────────────────────────
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  enabled: boolean('enabled').default(true),
  lastContacted: timestamp('last_contacted', { withTimezone: true }),
  contactCount: integer('contact_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Clusters ────────────────────────────────────────────────────────────────
export const clusters = pgTable('clusters', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  messages: text('messages').array().default(sql`'{}'`),
  maxMessagesPerDay: integer('max_messages_per_day').default(10),
  priority: integer('priority').default(1),
  windowStart: time('window_start').default('08:00'),
  windowEnd: time('window_end').default('22:00'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Junction: Chip ↔ Cluster ────────────────────────────────────────────────
export const chipClusters = pgTable(
  'chip_clusters',
  {
    chipId: uuid('chip_id')
      .notNull()
      .references(() => chips.id, { onDelete: 'cascade' }),
    clusterId: uuid('cluster_id')
      .notNull()
      .references(() => clusters.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.chipId, t.clusterId] })],
);

// ─── Junction: Contact ↔ Cluster ─────────────────────────────────────────────
export const contactClusters = pgTable(
  'contact_clusters',
  {
    contactId: uuid('contact_id')
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    clusterId: uuid('cluster_id')
      .notNull()
      .references(() => clusters.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.contactId, t.clusterId] })],
);

// ─── Logs ────────────────────────────────────────────────────────────────────
export const logs = pgTable(
  'logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    chipId: uuid('chip_id').references(() => chips.id, { onDelete: 'set null' }),
    chipName: text('chip_name').notNull(),
    phone: text('phone').notNull(),
    status: text('status', { enum: ['success', 'error'] }).notNull(),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  },
  (t) => [
    index('idx_logs_created_at').on(t.createdAt),
    index('idx_logs_chip_id').on(t.chipId),
    index('idx_logs_status').on(t.status),
  ],
);

// ─── Sessions ────────────────────────────────────────────────────────────────
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    token: text('token').unique().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  },
  (t) => [index('idx_sessions_token').on(t.token)],
);

// ─── Types (inferred from schema) ───────────────────────────────────────────
export type Config = typeof config.$inferSelect;
export type NewConfig = typeof config.$inferInsert;

export type Chip = typeof chips.$inferSelect;
export type NewChip = typeof chips.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type Cluster = typeof clusters.$inferSelect;
export type NewCluster = typeof clusters.$inferInsert;

export type Log = typeof logs.$inferSelect;
export type NewLog = typeof logs.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
