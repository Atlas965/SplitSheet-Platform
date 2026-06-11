import { sql } from "drizzle-orm";
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract templates
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  type: varchar("type").notNull(),
  status: varchar("status").default("draft"), // draft, pending, signed, cancelled
  templateId: varchar("template_id").references(() => contractTemplates.id),
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  data: jsonb("data").notNull(), // Contract form data
  metadata: jsonb("metadata"), // Additional metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract collaborators
export const contractCollaborators = pgTable("contract_collaborators", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id")
    .references(() => contracts.id)
    .notNull(),
  userId: varchar("user_id").references(() => users.id),
  email: varchar("email"), // For non-registered users
  name: varchar("name").notNull(),
  role: varchar("role").notNull(),
  ownershipPercentage: decimal("ownership_percentage", {
    precision: 5,
    scale: 2,
  }),
  status: varchar("status").default("pending"), // pending, signed, declined
  signedAt: timestamp("signed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contract signatures
export const contractSignatures = pgTable("contract_signatures", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id")
    .references(() => contracts.id)
    .notNull(),
  collaboratorId: varchar("collaborator_id")
    .references(() => contractCollaborators.id)
    .notNull(),
  signatureData: text("signature_data"), // Base64 encoded signature
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").defaultNow(),
});

// User activity tracking
export const userActivity = pgTable("user_activity", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  activityType: varchar("activity_type").notNull(), // login, profile_view, negotiation_start, etc.
  activityData: jsonb("activity_data"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profile views tracking
export const profileViews = pgTable("profile_views", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  viewerId: varchar("viewer_id").references(() => users.id),
  profileId: varchar("profile_id")
    .references(() => users.id)
    .notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// AI Negotiations
export const negotiations = pgTable("negotiations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  status: varchar("status").default("active"), // active, completed, cancelled
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  participants: varchar("participants").array(),
  aiAssistantEnabled: boolean("ai_assistant_enabled").default(true),
  negotiationData: jsonb("negotiation_data"),
  outcome: jsonb("outcome"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Negotiation conversations
export const negotiationConversations = pgTable("negotiation_conversations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  negotiationId: varchar("negotiation_id")
    .references(() => negotiations.id)
    .notNull(),
  senderId: varchar("sender_id")
    .references(() => users.id)
    .notNull(),
  message: text("message").notNull(),
  messageType: varchar("message_type").default("text"), // text, ai_suggestion, system
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User matching/recommendations
export const userMatches = pgTable("user_matches", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  matchedUserId: varchar("matched_user_id")
    .references(() => users.id)
    .notNull(),
  matchScore: decimal("match_score", { precision: 5, scale: 2 }),
  matchReason: text("match_reason"),
  status: varchar("status").default("suggested"), // suggested, connected, dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages between users
export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: varchar("receiver_id")
    .references(() => users.id)
    .notNull(),
  content: text("content").notNull(),
  messageType: varchar("message_type").default("text"), // text, image, file
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// System notifications
export const notifications = pgTable("notifications", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull(), // info, warning, success, error
  isRead: boolean("is_read").default(false),
  actionUrl: varchar("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Split Sheet Confirmations
export const confirmations = pgTable("confirmations", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id")
    .references(() => contracts.id)
    .notNull(),
  collaboratorId: varchar("collaborator_id")
    .references(() => contractCollaborators.id)
    .notNull(),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slSongId: varchar("sl_song_id").unique(), // Permanent SoundLedger ID: SL-SONG-xxxxxxxx
  title: varchar("title").notNull(),
  artistName: varchar("artist_name"),
  isrc: varchar("isrc"),  // International Standard Recording Code
  iswc: varchar("iswc"),  // International Standard Musical Work Code
  lyrics: text("lyrics"),
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  contractId: varchar("contract_id").references(() => contracts.id),
  status: varchar("status").default("active"), // active, archived, deactivated
  type: varchar("type").default("original"),   // original, cover, sample-based, arrangement
  metadata: jsonb("metadata"),
  proRegistrationStatus: varchar("pro_registration_status"),
  publishingStatus: varchar("publishing_status"),
  externalDistributorId: varchar("external_distributor_id"),
  iswcRegistered: boolean("iswc_registered").default(false),
  archivedAt: timestamp("archived_at"),
  archivedBy: varchar("archived_by"),
  deactivatedAt: timestamp("deactivated_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ownership records — append-only ledger, never overwrite, only append
export const ownershipRecords = pgTable("ownership_records", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id")
    .references(() => songAssets.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  ownershipPercentage: decimal("ownership_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  role: varchar("role").notNull(), // writer, producer, performer, publisher
  version: integer("version").notNull(),
  changeReason: text("change_reason"),
  effectiveAt: timestamp("effective_at").defaultNow(),
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revenue events — incoming money per asset
export const revenueEvents = pgTable("revenue_events", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id")
    .references(() => songAssets.id)
    .notNull(),
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
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  revenueEventId: varchar("revenue_event_id")
    .references(() => revenueEvents.id)
    .notNull(),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  assetId: varchar("asset_id")
    .references(() => songAssets.id)
    .notNull(),
  ownershipPercentage: decimal("ownership_percentage", {
    precision: 5,
    scale: 2,
  }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  stripeTransferId: varchar("stripe_transfer_id"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User balance ledger — running totals per user
export const userBalances = pgTable("user_balances", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).default(
    "0",
  ),
  totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).default("0"),
  pendingBalance: decimal("pending_balance", {
    precision: 12,
    scale: 2,
  }).default("0"),
  currency: varchar("currency").default("USD"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NEW: Releases table
export const releases = pgTable("releases", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  projectId: varchar("project_id")
    .references(() => contracts.id)
    .notNull(), // Link to existing contracts (projects)
  status: varchar("status").default("draft"), // draft, scheduled, live, removed
  distributorName: varchar("distributor_name"), // DistroKid, TuneCore, manual
  releaseDate: timestamp("release_date"),
  platformDistributionTargets: text("platform_distribution_targets").array(), // Spotify, Apple, etc.
  externalId: varchar("external_id"), // For external integration mapping
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NEW: Revenue Entries table (for Layer 2)
export const revenueEntries = pgTable("revenue_entries", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  releaseId: varchar("release_id").references(() => releases.id), // Link to releases
  projectId: varchar("project_id")
    .references(() => contracts.id)
    .notNull(), // Link to existing contracts (projects)
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  source: varchar("source").notNull(), // Spotify, Apple Music, YouTube, PROs (SOCAN / ASCAP)
  reportingPeriodStart: timestamp("reporting_period_start"),
  reportingPeriodEnd: timestamp("reporting_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

// NEW: Payouts table (for Layer 4)
export const payouts = pgTable("payouts", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  contributorId: varchar("contributor_id")
    .references(() => contractCollaborators.id)
    .notNull(),
  projectId: varchar("project_id")
    .references(() => contracts.id)
    .notNull(),
  revenueEntryId: varchar("revenue_entry_id")
    .references(() => revenueEntries.id)
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency").default("USD"),
  status: varchar("status").default("pending"), // pending, paid
  transactionId: varchar("transaction_id"), // e.g., Stripe transfer ID
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
  releases: many(releases), // NEW: Relation to releases
  revenueEntries: many(revenueEntries), // NEW: Relation to revenue entries
  payouts: many(payouts), // NEW: Relation to payouts
}));

export const contractCollaboratorsRelations = relations(
  contractCollaborators,
  ({ one, many }) => ({
    contract: one(contracts, {
      fields: [contractCollaborators.contractId],
      references: [contracts.id],
    }),
    user: one(users, {
      fields: [contractCollaborators.userId],
      references: [users.id],
    }),
    signatures: many(contractSignatures),
    payouts: many(payouts), // NEW: Relation to payouts
  }),
);

export const contractSignaturesRelations = relations(
  contractSignatures,
  ({ one }) => ({
    contract: one(contracts, {
      fields: [contractSignatures.contractId],
      references: [contracts.id],
    }),
    collaborator: one(contractCollaborators, {
      fields: [contractSignatures.collaboratorId],
      references: [contractCollaborators.id],
    }),
  }),
);

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

// NEW: Relations for releases
export const releasesRelations = relations(releases, ({ one, many }) => ({
  project: one(contracts, {
    fields: [releases.projectId],
    references: [contracts.id],
  }),
  revenueEntries: many(revenueEntries), // NEW: Relation to revenue entries
}));

// NEW: Relations for revenue entries
export const revenueEntriesRelations = relations(revenueEntries, ({ one }) => ({
  release: one(releases, {
    fields: [revenueEntries.releaseId],
    references: [releases.id],
  }),
  project: one(contracts, {
    fields: [revenueEntries.projectId],
    references: [contracts.id],
  }),
}));

// NEW: Relations for payouts
export const payoutsRelations = relations(payouts, ({ one }) => ({
  contributor: one(contractCollaborators, {
    fields: [payouts.contributorId],
    references: [contractCollaborators.id],
  }),
  project: one(contracts, {
    fields: [payouts.projectId],
    references: [contracts.id],
  }),
  revenueEntry: one(revenueEntries, {
    fields: [payouts.revenueEntryId],
    references: [revenueEntries.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractTemplateSchema = createInsertSchema(
  contractTemplates,
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractCollaboratorSchema = createInsertSchema(
  contractCollaborators,
).omit({
  id: true,
  createdAt: true,
});

export const insertContractSignatureSchema = createInsertSchema(
  contractSignatures,
).omit({
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

export const insertNegotiationConversationSchema = createInsertSchema(
  negotiationConversations,
).omit({
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

// NEW: Insert schemas for new tables
export const insertReleaseSchema = createInsertSchema(releases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevenueEntrySchema = createInsertSchema(revenueEntries).omit(
  {
    id: true,
    createdAt: true,
  },
);

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = z.infer<
  typeof insertContractTemplateSchema
>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type ContractCollaborator = typeof contractCollaborators.$inferSelect;
export type InsertContractCollaborator = z.infer<
  typeof insertContractCollaboratorSchema
>;
export type ContractSignature = typeof contractSignatures.$inferSelect;
export type InsertContractSignature = z.infer<
  typeof insertContractSignatureSchema
>;
export type UserActivity = typeof userActivity.$inferSelect;
export type ProfileView = typeof profileViews.$inferSelect;
export type Negotiation = typeof negotiations.$inferSelect;
export type NegotiationConversation =
  typeof negotiationConversations.$inferSelect;
export type UserMatch = typeof userMatches.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Confirmation = typeof confirmations.$inferSelect;
export type InsertConfirmation = z.infer<typeof insertConfirmationSchema>;

export type SongAsset = typeof songAssets.$inferSelect;
export type InsertSongAsset = z.infer<typeof insertSongAssetSchema>;
export type OwnershipRecord = typeof ownershipRecords.$inferSelect;
export type InsertOwnershipRecord = z.infer<typeof insertOwnershipRecordSchema>;
export type RevenueEvent = typeof revenueEvents.$inferSelect;
export type InsertRevenueEvent = z.infer<typeof insertRevenueEventSchema>;
export type PayoutRecord = typeof payoutRecords.$inferSelect;
export type InsertPayoutRecord = z.infer<typeof insertPayoutRecordSchema>;
export type UserBalance = typeof userBalances.$inferSelect;

// NEW: Types for new tables
export type Release = typeof releases.$inferSelect;
export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type RevenueEntry = typeof revenueEntries.$inferSelect;
export type InsertRevenueEntry = z.infer<typeof insertRevenueEntrySchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;

// ─── SERVICE BUSINESS ──────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  operatorId: text("operator_id").notNull(),
  name:       text("name").notNull(),
  email:      text("email"),
  phone:      text("phone"),
  type:       text("type").notNull().default("artist"),
  notes:      text("notes"),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});

export const serviceProjects = pgTable("service_projects", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  operatorId: text("operator_id").notNull(),
  clientId:   text("client_id").references(() => clients.id, { onDelete: "set null" }),
  title:      text("title").notNull(),
  songTitle:  text("song_title").notNull(),
  status:     text("status").notNull().default("draft"),
  notes:      text("notes"),
  createdAt:  timestamp("created_at").defaultNow(),
  updatedAt:  timestamp("updated_at").defaultNow(),
});

export const projectContributors = pgTable("project_contributors", {
  id:                text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  projectId:         text("project_id").notNull().references(() => serviceProjects.id, { onDelete: "cascade" }),
  name:              text("name").notNull(),
  email:             text("email"),
  role:              text("role").notNull().default("songwriter"),
  pro:               text("pro"),
  ipi:               text("ipi"),
  ownershipPercentage: text("ownership_percentage").notNull().default("0"),
  confirmationToken: text("confirmation_token").unique(),
  confirmedAt:       timestamp("confirmed_at"),
  confirmationIp:    text("confirmation_ip"),
  createdAt:         timestamp("created_at").defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceProjectSchema = createInsertSchema(serviceProjects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectContributorSchema = createInsertSchema(projectContributors).omit({ id: true, createdAt: true });

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ServiceProject = typeof serviceProjects.$inferSelect;
export type InsertServiceProject = z.infer<typeof insertServiceProjectSchema>;
export type ProjectContributor = typeof projectContributors.$inferSelect;
export type InsertProjectContributor = z.infer<typeof insertProjectContributorSchema>;

// ─── IDENTITY LAYER ──────────────────────────────────────────────────────────

// Creators — persistent songwriter/producer/artist/publisher identities
export const creators = pgTable("creators", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slCreatorId: text("sl_creator_id").unique().notNull(), // SL-CREATOR-xxxxxxxx
  userId:      text("user_id").references(() => users.id, { onDelete: "set null" }),
  name:        text("name").notNull(),
  email:       text("email"),
  type:        text("type").notNull().default("songwriter"), // songwriter, producer, artist, publisher
  ipi:         text("ipi"),       // IPI/CAE number
  pro:         text("pro"),       // PRO affiliation: SOCAN, ASCAP, BMI, SESAC, PRS, etc.
  isni:        text("isni"),      // International Standard Name Identifier
  bio:         text("bio"),
  website:     text("website"),
  metadata:    jsonb("metadata"), // flexible extra fields
  createdBy:   text("created_by").references(() => users.id),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),
});

// Organizations — labels, studios, publishers, distributors
export const organizations = pgTable("organizations", {
  id:      text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slOrgId: text("sl_org_id").unique().notNull(), // SL-ORG-xxxxxxxx
  name:    text("name").notNull(),
  type:    text("type").notNull().default("label"), // label, studio, publisher, distributor, pro
  email:   text("email"),
  website: text("website"),
  country: text("country"),
  metadata: jsonb("metadata"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Organization members — RBAC: who belongs to which org with what role
export const organizationMembers = pgTable("organization_members", {
  id:       text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:    text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId:   text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role:     text("role").notNull().default("member"), // owner, admin, member, viewer
  joinedAt: timestamp("joined_at").defaultNow(),
});

// API keys — per-organization external API access
export const apiKeys = pgTable("api_keys", {
  id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId:       text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId:      text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name:        text("name").notNull(),
  keyHash:     text("key_hash").notNull().unique(), // store hashed; prefix shown to user
  keyPrefix:   text("key_prefix").notNull(),        // e.g. "sl_live_xxxx" for display
  scopes:      text("scopes").array().notNull().default([]), // ["read:songs","write:ownership",...]
  lastUsedAt:  timestamp("last_used_at"),
  expiresAt:   timestamp("expires_at"),
  revokedAt:   timestamp("revoked_at"),
  createdAt:   timestamp("created_at").defaultNow(),
});

// Ownership events — immutable append-only event ledger (never update, only insert)
export const ownershipEvents = pgTable("ownership_events", {
  id:            text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  songAssetId:   text("song_asset_id").notNull().references(() => songAssets.id, { onDelete: "cascade" }),
  eventType:     text("event_type").notNull(), // OwnershipCreated | OwnershipUpdated | ContributorAdded | ContributorRemoved | RightsTransferred | ContractSigned
  actorId:       text("actor_id").references(() => users.id),   // who performed the action
  actorName:     text("actor_name"),                             // snapshot of actor name
  previousState: jsonb("previous_state"),                        // full snapshot before
  newState:      jsonb("new_state"),                             // full snapshot after
  reason:        text("reason"),                                 // human-readable explanation
  metadata:      jsonb("metadata"),                              // extra context
  occurredAt:    timestamp("occurred_at").defaultNow(),          // immutable timestamp
});

// ─── INSERT SCHEMAS + TYPES ───────────────────────────────────────────────────

export const insertCreatorSchema = createInsertSchema(creators).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({ id: true, joinedAt: true });
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true });
export const insertOwnershipEventSchema = createInsertSchema(ownershipEvents).omit({ id: true, occurredAt: true });

export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = z.infer<typeof insertOrganizationMemberSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type OwnershipEvent = typeof ownershipEvents.$inferSelect;
export type InsertOwnershipEvent = z.infer<typeof insertOwnershipEventSchema>;

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
