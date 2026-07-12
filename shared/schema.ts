import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  bio: text("bio"),
  skills: text("skills").array(),
  preferences: jsonb("preferences"),
  contactInfo: jsonb("contact_info"),
  isActive: boolean("is_active").default(true),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, pro, label
  role: varchar("role").default("user"), // user, admin
  // Stripe Connect Express — per-contributor payout account
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  stripeConnectOnboarded: boolean("stripe_connect_onboarded").default(false),
  stripeConnectChargesEnabled: boolean("stripe_connect_charges_enabled").default(false),
  stripeConnectPayoutsEnabled: boolean("stripe_connect_payouts_enabled").default(false),
  // Terms of Service / Privacy Policy acceptance
  termsAcceptedAt: timestamp("terms_accepted_at"),
  termsVersion: varchar("terms_version"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract templates
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // split-sheet, performance, producer, management
  description: text("description"),
  template: jsonb("template").notNull(), // JSON structure of the template
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  type: varchar("type").notNull(),
  status: varchar("status").default("draft"), // draft, pending, signed, cancelled
  templateId: varchar("template_id").references(() => contractTemplates.id),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  data: jsonb("data").notNull(), // Contract form data
  metadata: jsonb("metadata"), // Additional metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract collaborators
export const contractCollaborators = pgTable("contract_collaborators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email"), // For non-registered users
  name: varchar("name").notNull(),
  role: varchar("role").notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }),
  status: varchar("status").default("pending"), // pending, signed, declined
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contract signatures
export const contractSignatures = pgTable("contract_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id).notNull(),
  collaboratorId: varchar("collaborator_id").references(() => contractCollaborators.id).notNull(),
  signatureData: text("signature_data"), // Base64 encoded signature
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").defaultNow(),
});

// User activity tracking
export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  activityType: varchar("activity_type").notNull(), // login, profile_view, negotiation_start, etc.
  activityData: jsonb("activity_data"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profile views tracking
export const profileViews = pgTable("profile_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  viewerId: varchar("viewer_id").references(() => users.id),
  profileId: varchar("profile_id").references(() => users.id).notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// AI Negotiations
export const negotiations = pgTable("negotiations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").default("active"), // active, completed, cancelled
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  participants: varchar("participants").array(),
  aiAssistantEnabled: boolean("ai_assistant_enabled").default(true),
  negotiationData: jsonb("negotiation_data"),
  outcome: jsonb("outcome"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Negotiation conversations
export const negotiationConversations = pgTable("negotiation_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  negotiationId: varchar("negotiation_id").references(() => negotiations.id).notNull(),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  messageType: varchar("message_type").default("text"), // text, ai_suggestion, system
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User matching/recommendations
export const userMatches = pgTable("user_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  matchedUserId: varchar("matched_user_id").references(() => users.id).notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  matchReason: text("match_reason"),
  status: varchar("status").default("suggested"), // suggested, connected, dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages between users
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // text, image, file
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// System notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull(), // info, warning, success, error
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Split Sheet Confirmations
export const confirmations = pgTable("confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id).notNull(),
  collaboratorId: varchar("collaborator_id").references(() => contractCollaborators.id).notNull(),
  status: varchar("status").default("pending"), // pending, confirmed, requested_change
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  confirmedAt: timestamp("confirmed_at"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  notes: text("notes"), // For "Request Change" feedback
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── OWNERSHIP LEDGER SYSTEM ────────────────────────────────────────────────

// Song assets — each song is treated like a startup cap table
export const songAssets = pgTable("song_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  artistName: varchar("artist_name"),
  isrc: varchar("isrc"), // International Standard Recording Code
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  contractId: varchar("contract_id").references(() => contracts.id),
  status: varchar("status").default("active"), // active, archived
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ownership records — append-only ledger, never overwrite, only append
export const ownershipRecords = pgTable("ownership_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => songAssets.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  role: varchar("role").notNull(), // writer, producer, performer, publisher
  version: integer("version").notNull(),
  changeReason: text("change_reason"),
  effectiveAt: timestamp("effective_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revenue events — incoming money per asset
export const revenueEvents = pgTable("revenue_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").references(() => songAssets.id).notNull(),
  source: varchar("source").notNull(), // streaming, sync, performance, mechanical, other
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  description: text("description"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payout records — per-user split of each revenue event
export const payoutRecords = pgTable("payout_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  revenueEventId: varchar("revenue_event_id").references(() => revenueEvents.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  assetId: varchar("asset_id").references(() => songAssets.id).notNull(),
  ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  stripeTransferId: varchar("stripe_transfer_id"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User balance ledger — running totals per user
export const userBalances = pgTable("user_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).default("0"),
  totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).default("0"),
  pendingBalance: decimal("pending_balance", { precision: 12, scale: 2 }).default("0"),
  currency: varchar("currency").default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── B2B2C SPLIT CONFIRMATIONS (public token-based contributor links) ───────
export const splitConfirmations = pgTable("split_confirmations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id).notNull(),
  collaboratorId: varchar("collaborator_id").references(() => contractCollaborators.id).notNull(),
  token: varchar("token").notNull().unique(),
  status: varchar("status").default("not_sent"), // not_sent, sent, confirmed, change_requested
  sentAt: timestamp("sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  expiresAt: timestamp("expires_at"),
  confirmedName: varchar("confirmed_name"),
  confirmedEmail: varchar("confirmed_email"),
  confirmationNote: text("confirmation_note"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── ORGANIZATIONS — enterprise multi-tenant identity layer ────────────────
// Labels, studios, publishers, distributors, and PROs get a permanent
// SL-ORG-XXXXXXXX id (see .agents/memory/sl-ids.md) plus RBAC membership so
// an enterprise client can share one workspace, API keys, and roster of
// contributors across multiple logged-in users instead of a single account.
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slOrgId: varchar("sl_org_id").notNull().unique(), // permanent external ID: SL-ORG-XXXXXXXX
  name: varchar("name").notNull(),
  type: varchar("type").notNull().default("label"), // label, studio, publisher, distributor, pro
  email: varchar("email"),
  website: varchar("website"),
  country: varchar("country"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization membership — RBAC join table between users and organizations.
// The user who creates an organization is automatically added here as "owner".
export const organizationMembers = pgTable("organization_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").notNull().default("member"), // owner, admin, member, viewer
  invitedBy: varchar("invited_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Organization-scoped API keys — separate from the personal keys in
// server/security.ts (`api_keys`, owner_id = a single user). Only the
// SHA-256 hash is ever stored; the raw key is returned once on creation.
export const organizationApiKeys = pgTable("organization_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name").notNull(),
  keyHash: varchar("key_hash").notNull().unique(),
  keyPrefix: varchar("key_prefix").notNull(),
  scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ORGANIZATION_TYPES = ["label", "studio", "publisher", "distributor", "pro"] as const;
export const ORGANIZATION_ROLES = ["owner", "admin", "member", "viewer"] as const;

// ─── PAYMENT WEBHOOK IDEMPOTENCY ─────────────────────────────────────────────
export const paymentEvents = pgTable("payment_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripeEventId: varchar("stripe_event_id").notNull().unique(),
  eventType: varchar("event_type").notNull(),
  payload: jsonb("payload"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── ERROR MONITORING / OBSERVABILITY ────────────────────────────────────────
export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: varchar("level").notNull().default("error"), // error, warn, fatal
  message: text("message").notNull(),
  stack: text("stack"),
  route: varchar("route"),
  userId: varchar("user_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── DB-BACKED RATE LIMITING (multi-instance / autoscale safe) ──────────────
export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: varchar("bucket_key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
});

// ─── IDENTITY VERIFICATION (KYC) CODES ───────────────────────────────────────
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  channel: varchar("channel").notNull().default("email"), // email, sms
  destination: varchar("destination").notNull(), // email address or phone number
  codeHash: varchar("code_hash").notNull(),
  purpose: varchar("purpose").notNull().default("identity_verification"),
  legalName: varchar("legal_name"),
  idType: varchar("id_type"),
  attempts: integer("attempts").notNull().default(0),
  consumedAt: timestamp("consumed_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── RELATIONS ───────────────────────────────────────────────────────────────

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contracts: many(contracts),
  collaborations: many(contractCollaborators),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  template: one(contractTemplates, {
    fields: [contracts.templateId],
    references: [contractTemplates.id],
  }),
  creator: one(users, {
    fields: [contracts.createdBy],
    references: [users.id],
  }),
  collaborators: many(contractCollaborators),
}));

export const contractCollaboratorsRelations = relations(contractCollaborators, ({ one, many }) => ({
  contract: one(contracts, {
    fields: [contractCollaborators.contractId],
    references: [contracts.id],
  }),
  user: one(users, {
    fields: [contractCollaborators.userId],
    references: [users.id],
  }),
  signatures: many(contractSignatures),
}));

export const contractSignaturesRelations = relations(contractSignatures, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractSignatures.contractId],
    references: [contracts.id],
  }),
  collaborator: one(contractCollaborators, {
    fields: [contractSignatures.collaboratorId],
    references: [contractCollaborators.id],
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
  }),
  members: many(organizationMembers),
  apiKeys: many(organizationApiKeys),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationMembers.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [organizationMembers.userId],
    references: [users.id],
  }),
}));

export const organizationApiKeysRelations = relations(organizationApiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationApiKeys.organizationId],
    references: [organizations.id],
  }),
}));

export const confirmationsRelations = relations(confirmations, ({ one }) => ({
  contract: one(contracts, {
    fields: [confirmations.contractId],
    references: [contracts.id],
  }),
  collaborator: one(contractCollaborators, {
    fields: [confirmations.collaboratorId],
    references: [contractCollaborators.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractCollaboratorSchema = createInsertSchema(contractCollaborators).omit({
  id: true,
  createdAt: true,
});

export const insertContractSignatureSchema = createInsertSchema(contractSignatures).omit({
  id: true,
  signedAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
  id: true,
  createdAt: true,
});

export const insertProfileViewSchema = createInsertSchema(profileViews).omit({
  id: true,
  viewedAt: true,
});

export const insertNegotiationSchema = createInsertSchema(negotiations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertNegotiationConversationSchema = createInsertSchema(negotiationConversations).omit({
  id: true,
  createdAt: true,
});

export const insertUserMatchSchema = createInsertSchema(userMatches).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertConfirmationSchema = createInsertSchema(confirmations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type ContractCollaborator = typeof contractCollaborators.$inferSelect;
export type InsertContractCollaborator = z.infer<typeof insertContractCollaboratorSchema>;
export type ContractSignature = typeof contractSignatures.$inferSelect;
export type InsertContractSignature = z.infer<typeof insertContractSignatureSchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type ProfileView = typeof profileViews.$inferSelect;
export type Negotiation = typeof negotiations.$inferSelect;
export type NegotiationConversation = typeof negotiationConversations.$inferSelect;
export type UserMatch = typeof userMatches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Confirmation = typeof confirmations.$inferSelect;
export type InsertConfirmation = z.infer<typeof insertConfirmationSchema>;

export const insertSongAssetSchema = createInsertSchema(songAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOwnershipRecordSchema = createInsertSchema(ownershipRecords).omit({
  id: true,
  createdAt: true,
});

export const insertRevenueEventSchema = createInsertSchema(revenueEvents).omit({
  id: true,
  createdAt: true,
});

export const insertPayoutRecordSchema = createInsertSchema(payoutRecords).omit({
  id: true,
  createdAt: true,
});

export const insertUserBalanceSchema = createInsertSchema(userBalances).omit({
  id: true,
});

export type SongAsset = typeof songAssets.$inferSelect;
export type InsertSongAsset = z.infer<typeof insertSongAssetSchema>;
export type OwnershipRecord = typeof ownershipRecords.$inferSelect;
export type InsertOwnershipRecord = z.infer<typeof insertOwnershipRecordSchema>;
export type RevenueEvent = typeof revenueEvents.$inferSelect;
export type InsertRevenueEvent = z.infer<typeof insertRevenueEventSchema>;
export type PayoutRecord = typeof payoutRecords.$inferSelect;
export type InsertPayoutRecord = z.infer<typeof insertPayoutRecordSchema>;
export type UserBalance = typeof userBalances.$inferSelect;

export const insertSplitConfirmationSchema = createInsertSchema(splitConfirmations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type SplitConfirmation = typeof splitConfirmations.$inferSelect;
export type InsertSplitConfirmation = z.infer<typeof insertSplitConfirmationSchema>;

export const insertPaymentEventSchema = createInsertSchema(paymentEvents).omit({
  id: true,
  createdAt: true,
});
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type InsertPaymentEvent = z.infer<typeof insertPaymentEventSchema>;

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
});
export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
  id: true,
  createdAt: true,
});
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;

// Organizations — enterprise multi-tenant workspaces
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  slOrgId: true,
  createdAt: true,
  updatedAt: true,
});
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
  id: true,
  createdAt: true,
});
export const insertOrganizationApiKeySchema = createInsertSchema(organizationApiKeys).omit({
  id: true,
  keyHash: true,
  keyPrefix: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type OrganizationApiKey = typeof organizationApiKeys.$inferSelect;
export type InsertOrganizationApiKey = z.infer<typeof insertOrganizationApiKeySchema>;

// Activity tracking schemas
export const activityEventSchema = z.object({
  activityType: z.string().min(1).max(50),
  activityData: z.any().optional(),
});

export const batchActivitiesSchema = z.object({
  activities: z.array(activityEventSchema).min(1).max(100), // Limit batch size
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;
export type BatchActivities = z.infer<typeof batchActivitiesSchema>;