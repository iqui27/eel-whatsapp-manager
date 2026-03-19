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
  // Legacy status field (kept for backward compatibility)
  status: text('status', { enum: ['connected', 'disconnected', 'warming'] })
    .default('disconnected')
    .notNull(),
  warmCount: integer('warm_count').default(0),
  // ─── Health monitoring fields (Phase 14) ────────────────────────────────
  // 7-state health: healthy | degraded | cooldown | quarantined | banned | warming_up | disconnected
  healthStatus: text('health_status').default('disconnected').notNull(),
  messagesSentToday: integer('messages_sent_today').default(0).notNull(),
  messagesSentThisHour: integer('messages_sent_this_hour').default(0).notNull(),
  dailyLimit: integer('daily_limit').default(200).notNull(),
  hourlyLimit: integer('hourly_limit').default(25).notNull(),
  lastHealthCheck: timestamp('last_health_check', { withTimezone: true }),
  lastWebhookEvent: timestamp('last_webhook_event', { withTimezone: true }),
  cooldownUntil: timestamp('cooldown_until', { withTimezone: true }),
  bannedAt: timestamp('banned_at', { withTimezone: true }),
  errorCount: integer('error_count').default(0).notNull(),
  blockRate: integer('block_rate').default(0), // percentage * 100 (e.g., 250 = 2.5%)
  assignedSegments: text('assigned_segments').array(),
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
    userId: uuid('user_id'),
    actorName: text('actor_name'),
    actorEmail: text('actor_email'),
    actorRole: text('actor_role'),
    actorRegionScope: text('actor_region_scope'),
    actorPermissions: text('actor_permissions').array().default(sql`'{}'`),
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
  crmNotes: text('crm_notes'),
  crmChecklist: text('crm_checklist').array().default(sql`'{}'`),
  enabled: boolean('enabled').default(true),
  // AI analysis fields (Phase 18)
  aiTier: text('ai_tier', { enum: ['hot', 'warm', 'cold', 'dead'] }),
  aiSentiment: text('ai_sentiment', { enum: ['positive', 'neutral', 'negative'] }),
  aiLastAnalyzed: timestamp('ai_last_analyzed', { withTimezone: true }),
  aiAnalysisSummary: text('ai_analysis_summary'),
  aiRecommendedAction: text('ai_recommended_action'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_voters_phone').on(t.phone),
  index('idx_voters_zone').on(t.zone),
  index('idx_voters_opt_in').on(t.optInStatus),
  index('idx_voters_engagement').on(t.engagementScore),
  index('idx_voters_ai_tier').on(t.aiTier),
]);

// ─── Segments ─────────────────────────────────────────────────────────────────
// Declared before campaigns because campaigns references segments via FK
export const segments = pgTable('segments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  segmentTag: text('segment_tag').unique(),
  filters: text('filters').notNull(),
  audienceCount: integer('audience_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_segments_segment_tag').on(t.segmentTag),
]);

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
  // Conversion tracking (Phase 17)
  totalClicked: integer('total_clicked').default(0),
  totalJoinedGroup: integer('total_joined_group').default(0),
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
  permissions: text('permissions').array().default(sql`'{}'`),
  enabled: boolean('enabled').default(true),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_users_email').on(t.email),
  index('idx_users_role').on(t.role),
]);

export const reportSchedules = pgTable('report_schedules', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  recipients: text('recipients').array().notNull().default(sql`'{}'`),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'monthly'] }).notNull().default('weekly'),
  periodDays: integer('period_days').notNull().default(7),
  format: text('format', { enum: ['csv', 'pdf', 'both'] }).notNull().default('pdf'),
  active: boolean('active').notNull().default(true),
  nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  lastStatus: text('last_status', { enum: ['idle', 'sent', 'failed', 'dry_run'] }).notNull().default('idle'),
  lastError: text('last_error'),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_report_schedules_next_run').on(t.nextRunAt),
]);

export const reportDispatches = pgTable('report_dispatches', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: uuid('schedule_id').references(() => reportSchedules.id, { onDelete: 'set null' }),
  recipients: text('recipients').array().notNull().default(sql`'{}'`),
  format: text('format', { enum: ['csv', 'pdf', 'both'] }).notNull().default('pdf'),
  status: text('status', { enum: ['sent', 'failed', 'dry_run'] }).notNull(),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_report_dispatches_schedule').on(t.scheduleId),
  index('idx_report_dispatches_created_at').on(t.createdAt),
]);

// ─── Message Queue (Phase 15 - Mass Messaging) ────────────────────────────────
export const messageQueue = pgTable('message_queue', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  chipId: uuid('chip_id').references(() => chips.id, { onDelete: 'set null' }),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'set null' }),
  voterPhone: text('voter_phone').notNull(),
  voterName: text('voter_name'),
  // Original template (for reference)
  message: text('message').notNull(),
  // Resolved template with variables substituted and variations applied
  resolvedMessage: text('resolved_message').notNull(),
  // Status lifecycle: queued→assigned→sending→sent→delivered→read→failed→retry
  status: text('status', {
    enum: ['queued', 'assigned', 'sending', 'sent', 'delivered', 'read', 'failed', 'retry']
  }).default('queued').notNull(),
  // Evolution API message tracking
  evolutionMessageId: text('evolution_message_id'),
  // Timestamps for each status transition
  assignedAt: timestamp('assigned_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  readAt: timestamp('read_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failReason: text('fail_reason'),
  retryCount: integer('retry_count').default(0).notNull(),
  // Priority (higher = send first)
  priority: integer('priority').default(0).notNull(),
  // Segment affinity for chip selection
  segmentId: uuid('segment_id').references(() => segments.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_message_queue_status').on(t.status),
  index('idx_message_queue_campaign').on(t.campaignId),
  index('idx_message_queue_chip').on(t.chipId),
  index('idx_message_queue_created').on(t.createdAt),
]);

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;

export type ConsentLog = typeof consentLogs.$inferSelect;
export type NewConsentLog = typeof consentLogs.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type NewReportSchedule = typeof reportSchedules.$inferInsert;

export type ReportDispatch = typeof reportDispatches.$inferSelect;
export type NewReportDispatch = typeof reportDispatches.$inferInsert;

export type MessageQueue = typeof messageQueue.$inferSelect;
export type NewMessageQueue = typeof messageQueue.$inferInsert;

// ─── WhatsApp Groups (Phase 16 - Group Management) ─────────────────────────────
export const whatsappGroups = pgTable('whatsapp_groups', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  groupJid: text('group_jid').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  inviteUrl: text('invite_url'),
  inviteCode: text('invite_code'),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  segmentTag: text('segment_tag'),
  chipId: uuid('chip_id').references(() => chips.id, { onDelete: 'set null' }),
  chipInstanceName: text('chip_instance_name'),
  currentSize: integer('current_size').default(0).notNull(),
  maxSize: integer('max_size').default(1024).notNull(),
  status: text('status', { enum: ['active', 'full', 'archived'] }).default('active').notNull(),
  admins: text('admins').array().default(sql`'{}'`),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_whatsapp_groups_campaign').on(t.campaignId),
  index('idx_whatsapp_groups_chip').on(t.chipId),
  index('idx_whatsapp_groups_status').on(t.status),
]);

export type WhatsappGroup = typeof whatsappGroups.$inferSelect;
export type NewWhatsappGroup = typeof whatsappGroups.$inferInsert;

// ─── Conversion Events (Phase 17 - Delivery Tracking) ──────────────────────────
export const conversionEvents = pgTable('conversion_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'set null' }),
  voterPhone: text('voter_phone'),
  eventType: text('event_type', { enum: ['reply', 'click', 'group_join', 'conversion'] }).notNull(),
  groupJid: text('group_jid'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_conversion_events_campaign').on(t.campaignId),
  index('idx_conversion_events_type').on(t.eventType),
  index('idx_conversion_events_created').on(t.createdAt),
  index('idx_conversion_events_voter').on(t.voterId),
]);

export type ConversionEvent = typeof conversionEvents.$inferSelect;
export type NewConversionEvent = typeof conversionEvents.$inferInsert;

// ─── AI Analyses (Phase 18 - AI Lead Analysis) ─────────────────────────────────
export const aiAnalyses = pgTable('ai_analyses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  voterId: uuid('voter_id').references(() => voters.id, { onDelete: 'set null' }),
  voterPhone: text('voter_phone'),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  messageType: text('message_type', { enum: ['inbound', 'outbound'] }).notNull(),
  messageText: text('message_text'),
  sentiment: text('sentiment', { enum: ['positive', 'neutral', 'negative'] }),
  intent: text('intent'),
  suggestedTags: text('suggested_tags').array(),
  recommendedAction: text('recommended_action'),
  confidence: integer('confidence'),
  summary: text('summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_ai_analyses_voter').on(t.voterId),
  index('idx_ai_analyses_conversation').on(t.conversationId),
  index('idx_ai_analyses_created').on(t.createdAt),
]);

export type AiAnalysis = typeof aiAnalyses.$inferSelect;
export type NewAiAnalysis = typeof aiAnalyses.$inferInsert;

// ─── Group Messages (Group Chat History) ───────────────────────────────────────
export const groupMessages = pgTable('group_messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  groupId: uuid('group_id').references(() => whatsappGroups.id, { onDelete: 'cascade' }).notNull(),
  groupJid: text('group_jid').notNull(),
  senderJid: text('sender_jid'),          // null = sent by us
  senderName: text('sender_name'),
  text: text('text').notNull(),
  fromMe: boolean('from_me').default(false).notNull(),
  evolutionMessageId: text('evolution_message_id'),
  // Gemini analysis
  aiSentiment: text('ai_sentiment', { enum: ['positive', 'neutral', 'negative'] }),
  aiIntent: text('ai_intent'),
  aiSuggestedTags: text('ai_suggested_tags').array(),
  aiAlert: text('ai_alert'),              // non-null = Gemini raised an alert
  aiSummary: text('ai_summary'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (t) => [
  index('idx_group_messages_group').on(t.groupId),
  index('idx_group_messages_created').on(t.createdAt),
  index('idx_group_messages_sender').on(t.senderJid),
]);

export type GroupMessage = typeof groupMessages.$inferSelect;
export type NewGroupMessage = typeof groupMessages.$inferInsert;
