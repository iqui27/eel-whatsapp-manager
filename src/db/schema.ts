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
  jsonb,
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
  candidateDisplayName: text('candidate_display_name'),
  candidateOffice: text('candidate_office'),
  candidateParty: text('candidate_party'),
  candidateRegion: text('candidate_region'),
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

// ─── Voters ──────────────────────────────────────────────────────────────────
export const voters = pgTable('voters', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  cpf: text('cpf'),
  phone: text('phone').notNull(),
  zone: text('zone'),
  section: text('section'),
  city: text('city'),
  neighborhood: text('neighborhood'),
  tags: text('tags').array().default(sql`'{}'`),
  engagementScore: integer('engagement_score').default(0),
  optInStatus: text('opt_in_status', { enum: ['active', 'expired', 'revoked', 'pending'] }).default('pending'),
  optInDate: timestamp('opt_in_date', { withTimezone: true }),
  lastContacted: timestamp('last_contacted', { withTimezone: true }),
  contactCount: integer('contact_count').default(0),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_voters_phone').on(t.phone),
  index('idx_voters_zone').on(t.zone),
  index('idx_voters_opt_in').on(t.optInStatus),
  index('idx_voters_engagement').on(t.engagementScore),
]);

// ─── Segments ─────────────────────────────────────────────────────────────────
// Declared before campaigns because campaigns references segments via FK
export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  filters: text('filters').notNull(),
  audienceCount: integer('audience_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  template: text('template').notNull(),
  variables: text('variables').array().default(sql`'{}'`),
  status: text('status', { enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'] }).default('draft'),
  segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
  chipId: uuid('chip_id').references(() => chips.id, { onDelete: 'set null' }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  windowStart: time('window_start').default('08:00'),
  windowEnd: time('window_end').default('22:00'),
  abEnabled: boolean('ab_enabled').default(false),
  abVariantB: text('ab_variant_b'),
  abSplitPercent: integer('ab_split_percent').default(50),
  totalSent: integer('total_sent').default(0),
  totalDelivered: integer('total_delivered').default(0),
  totalRead: integer('total_read').default(0),
  totalReplied: integer('total_replied').default(0),
  totalFailed: integer('total_failed').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_campaigns_status').on(t.status),
  index('idx_campaigns_segment').on(t.segmentId),
  index('idx_campaigns_chip').on(t.chipId),
]);

export const campaignDeliveryEvents = pgTable('campaign_delivery_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  chipId: uuid('chip_id').references(() => chips.id, { onDelete: 'set null' }),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'set null' }),
  voterPhone: text('voter_phone'),
  eventType: text('event_type').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_campaign_delivery_events_campaign').on(t.campaignId),
  index('idx_campaign_delivery_events_created_at').on(t.createdAt),
  index('idx_campaign_delivery_events_event_type').on(t.eventType),
]);

// ─── Junction: Segment ↔ Voter ────────────────────────────────────────────────
export const segmentVoters = pgTable(
  'segment_voters',
  {
    segmentId: uuid('segment_id')
      .notNull()
      .references(() => segments.id, { onDelete: 'cascade' }),
    voterId: uuid('voter_id')
      .notNull()
      .references(() => voters.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.segmentId, t.voterId] })],
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

export type Voter = typeof voters.$inferSelect;
export type NewVoter = typeof voters.$inferInsert;

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;

export type CampaignDeliveryEvent = typeof campaignDeliveryEvents.$inferSelect;
export type NewCampaignDeliveryEvent = typeof campaignDeliveryEvents.$inferInsert;

export type Segment = typeof segments.$inferSelect;
export type NewSegment = typeof segments.$inferInsert;

// ─── Conversations ────────────────────────────────────────────────────────────
export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'set null' }),
  chipId: uuid('chip_id').references(() => chips.id, { onDelete: 'set null' }),
  voterName: text('voter_name').notNull(),
  voterPhone: text('voter_phone').notNull(),
  status: text('status', { enum: ['open', 'assigned', 'waiting', 'resolved', 'bot'] }).default('bot'),
  assignedAgent: text('assigned_agent'),
  handoffReason: text('handoff_reason'),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  priority: integer('priority').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_conversations_voter').on(t.voterId),
  index('idx_conversations_chip').on(t.chipId),
  index('idx_conversations_status').on(t.status),
  index('idx_conversations_priority').on(t.priority),
]);

// ─── Conversation Messages ────────────────────────────────────────────────────
export const conversationMessages = pgTable('conversation_messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  sender: text('sender', { enum: ['voter', 'bot', 'agent'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_conv_messages_conv').on(t.conversationId),
]);

// ─── Consent Logs ────────────────────────────────────────────────────────────
export const consentLogs = pgTable('consent_logs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'cascade' }),
  action: text('action', { enum: ['opt_in', 'opt_out', 'renew', 'revoke'] }).notNull(),
  channel: text('channel').default('whatsapp'),
  ipAddress: text('ip_address'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_consent_voter').on(t.voterId),
]);

// ─── Users (app users, not voters) ───────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: text('role', { enum: ['coordenador', 'cabo', 'voluntario', 'admin'] }).default('voluntario'),
  regionScope: text('region_scope'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_users_email').on(t.email),
  index('idx_users_role').on(t.role),
]);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;

export type ConsentLog = typeof consentLogs.$inferSelect;
export type NewConsentLog = typeof consentLogs.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
