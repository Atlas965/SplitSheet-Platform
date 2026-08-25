import { sql } from 'drizzle-orm';
import {
  index,
  unique,
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
  /** Auth0 subject (`sub`) — links Universal Login identity without destroying legacy ids */
  auth0Sub: varchar("auth0_sub"),
  /** Currently selected tenant for operator session context */
  activeOrganizationId: varchar("active_organization_id"),
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

// Contract templates — Entertainment Agreement Template Library
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // stable slug key (also used as contracts.type)
  slug: varchar("slug"),
  description: text("description"),
  category: varchar("category"),
  subcategory: varchar("subcategory"),
  industry: varchar("industry").default("music"),
  agreementType: varchar("agreement_type"),
  version: varchar("version").default("1.0"),
  /** draft | internal_review | legal_review | approved | active | deprecated | archived */
  status: varchar("status").default("draft"),
  jurisdiction: varchar("jurisdiction"),
  /** NOT_REVIEWED | INTERNAL_REVIEW | COUNSEL_REVIEW | COUNSEL_APPROVED | REQUIRES_UPDATE | DEPRECATED */
  legalReviewStatus: varchar("legal_review_status").default("NOT_REVIEWED"),
  legalReviewDate: timestamp("legal_review_date"),
  rightsCategories: jsonb("rights_categories").$type<string[]>().default([]),
  requiredParties: jsonb("required_parties").$type<string[]>().default([]),
  optionalParties: jsonb("optional_parties").$type<string[]>().default([]),
  riskLevel: varchar("risk_level").default("medium"),
  workflowType: varchar("workflow_type"),
  supportedTransactions: jsonb("supported_transactions").$type<string[]>().default([]),
  parentTemplateId: varchar("parent_template_id"),
  template: jsonb("template").notNull(), // field engine config + sections + placeholder clauses
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Audit log for administrative template changes */
export const templateAuditLog = pgTable("template_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => contractTemplates.id),
  actorId: varchar("actor_id").references(() => users.id),
  action: varchar("action").notNull(), // create | update | version | activate | archive | duplicate | legal_review
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Copilot Voice Assistant — session orchestration (not UI) */
export const voiceSessions = pgTable("voice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  organizationId: varchar("organization_id"),
  status: varchar("status").default("active"), // active | closed | expired
  pageContext: varchar("page_context"),
  projectId: varchar("project_id"),
  contractId: varchar("contract_id"),
  locale: varchar("locale").default("en-CA"),
  metadata: jsonb("metadata"),
  expiresAt: timestamp("expires_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const voiceTurns = pgTable("voice_turns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => voiceSessions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  role: varchar("role").notNull(), // user | assistant | system
  transcript: text("transcript"),
  transcriptConfidence: decimal("transcript_confidence", { precision: 5, scale: 4 }),
  intent: varchar("intent"),
  intentConfidence: decimal("intent_confidence", { precision: 5, scale: 4 }),
  entities: jsonb("entities"),
  validation: jsonb("validation"),
  responseText: text("response_text"),
  riskLevel: varchar("risk_level"),
  requiresConfirmation: boolean("requires_confirmation").default(false),
  audioRetentionUntil: timestamp("audio_retention_until"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Pending consequential actions awaiting explicit confirmation (voice never auto-executes these) */
export const voicePendingActions = pgTable("voice_pending_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => voiceSessions.id).notNull(),
  turnId: varchar("turn_id").references(() => voiceTurns.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  actionType: varchar("action_type").notNull(),
  payload: jsonb("payload").notNull(),
  status: varchar("status").default("pending"), // pending | confirmed | rejected | expired | executed | failed
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  expiresAt: timestamp("expires_at"),
  confirmedAt: timestamp("confirmed_at"),
  executedAt: timestamp("executed_at"),
  result: jsonb("result"),
  createdAt: timestamp("created_at").defaultNow(),
});

/** Provenance chain: spoken instruction → structured field */
export const voiceProvenance = pgTable("voice_provenance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => voiceSessions.id),
  turnId: varchar("turn_id").references(() => voiceTurns.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  source: varchar("source").notNull(), // voice | text | system
  fieldPath: varchar("field_path").notNull(),
  extractedValue: jsonb("extracted_value"),
  confidence: decimal("confidence", { precision: 5, scale: 4 }),
  confirmationStatus: varchar("confirmation_status"), // none | pending | confirmed | rejected
  resultRef: varchar("result_ref"), // contract id, asset id, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

/** Persistent user-authorized Copilot memory (separate from canonical rights records) */
export const voiceUserMemory = pgTable("voice_user_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  key: varchar("key").notNull(),
  value: jsonb("value").notNull(),
  category: varchar("category").default("preference"), // preference | collaborator | workflow | terminology
  authorized: boolean("authorized").default(true),
  expiresAt: timestamp("expires_at"),
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
  /** Snapshot of template version at creation time */
  templateVersion: varchar("template_version"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  /** Tenant that owns this agreement/project (Phase 3 multi-tenant) */
  organizationId: varchar("organization_id"),
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
  slSongId: varchar("sl_song_id").unique(), // permanent external ID: SL-SONG-XXXXXXXX
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  contractId: varchar("contract_id").references(() => contracts.id),
  /** Tenant that owns this ledger asset */
  organizationId: varchar("organization_id"),
  status: varchar("status").default("active"), // active, archived
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** License records created from completed license agreements (append-friendly via version) */
export const licenseRecords = pgTable("license_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id),
  assetId: varchar("asset_id").references(() => songAssets.id),
  licenseType: varchar("license_type").notNull(),
  licensorName: varchar("licensor_name"),
  licenseeName: varchar("licensee_name"),
  territory: varchar("territory"),
  term: varchar("term"),
  exclusivity: varchar("exclusivity"),
  rightsGranted: jsonb("rights_granted").$type<string[]>().default([]),
  fee: decimal("fee", { precision: 12, scale: 2 }),
  metadata: jsonb("metadata"),
  version: integer("version").default(1),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
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
  // Global rights framework — which right this record applies to, where, and for how long.
  ownershipType: varchar("ownership_type").default("composition"), // composition, master, publishing, neighboring_rights, mechanical_rights, performance_rights
  territory: varchar("territory"), // CA, US, UK, EU, AU, OTHER
  expirationDate: timestamp("expiration_date"),
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
  role: varchar("role").notNull().default("operator"), // owner, admin, operator, reviewer, finance, viewer
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
/** @deprecated Prefer ORG_ROLES from shared/org-rbac.ts — kept for insert schema compat */
export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "operator",
  "reviewer",
  "finance",
  "viewer",
  "member", // legacy alias accepted on write → normalized to operator
] as const;

// ─── GLOBAL RIGHTS FRAMEWORK ─────────────────────────────────────────────────
// Territories and right-types are closed enums (TypeScript consts), not DB
// tables — same pattern as ORGANIZATION_TYPES/ORGANIZATION_ROLES above.
export const TERRITORIES = ["CA", "US", "UK", "EU", "AU", "OTHER"] as const;
export const OWNERSHIP_RIGHT_TYPES = [
  "composition",
  "master",
  "publishing",
  "neighboring_rights",
  "mechanical_rights",
  "performance_rights",
] as const;

// Rights organizations (PROs/CMOs/MROs) — small seeded reference table.
// Read-only from the API; seeded once in server/db-migrations.ts.
export const rightsOrganizations = pgTable("rights_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  territory: varchar("territory").notNull(), // CA, US, UK, EU, AU, OTHER
  organizationType: varchar("organization_type").notNull().default("pro"), // pro, mro, neighboring_rights, cmo
  website: varchar("website"),
  supportedRights: text("supported_rights").array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").defaultNow(),
});

// Creators — permanent roster of songwriters/producers/artists/publishers,
// each assigned a permanent SL-CREATOR-XXXXXXXX id (see .agents/memory/identity-layer.md).
// Distinct from `creatorRightsProfiles` below, which is a platform *user's own*
// PRO/territory settings — `creators` is a roster an operator manages of
// other people (who may or may not have a SplitSheet account).
export const creators = pgTable("creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slCreatorId: varchar("sl_creator_id").notNull().unique(), // permanent external ID: SL-CREATOR-XXXXXXXX
  name: varchar("name").notNull(),
  type: varchar("type").notNull().default("songwriter"), // songwriter, producer, artist, publisher
  email: varchar("email"),
  pro: varchar("pro"), // PRO affiliation display name (e.g. "SOCAN")
  ipi: varchar("ipi"), // IPI / CAE number
  isni: varchar("isni"),
  bio: text("bio"),
  website: varchar("website"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Creator rights profiles — one per platform user, powers Settings → Rights Profile.
export const creatorRightsProfiles = pgTable("creator_rights_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  ipiNumber: varchar("ipi_number"),
  proAffiliation: varchar("pro_affiliation"), // references rightsOrganizations.name (free text for orgs not in the seed list)
  territory: varchar("territory").default("CA"), // CA, US, UK, EU, AU, OTHER
  songwriterStatus: boolean("songwriter_status").default(false),
  publisherStatus: boolean("publisher_status").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── MASTER VS COMPOSITION RIGHTS ────────────────────────────────────────────
// Each song asset may have one composition-rights record and one
// master-rights record — the two halves of music ownership tracked separately.
export const compositionAssets = pgTable("composition_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songAssetId: varchar("song_asset_id").references(() => songAssets.id).notNull().unique(),
  title: varchar("title").notNull(),
  iswc: varchar("iswc"), // International Standard Musical Work Code
  ownershipStatus: varchar("ownership_status").default("pending"), // pending, complete, disputed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const masterAssets = pgTable("master_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songAssetId: varchar("song_asset_id").references(() => songAssets.id).notNull().unique(),
  recordingTitle: varchar("recording_title").notNull(),
  isrc: varchar("isrc"), // International Standard Recording Code
  artistOwner: varchar("artist_owner"),
  labelOwner: varchar("label_owner"),
  distributor: varchar("distributor"),
  releaseDate: timestamp("release_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── LICENSING READINESS SYSTEM ──────────────────────────────────────────────
export const licenseReadiness = pgTable("license_readiness", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  songAssetId: varchar("song_asset_id").references(() => songAssets.id).notNull().unique(),
  ownershipComplete: boolean("ownership_complete").default(false),
  contributorConfirmed: boolean("contributor_confirmed").default(false),
  agreementsComplete: boolean("agreements_complete").default(false),
  metadataComplete: boolean("metadata_complete").default(false),
  sampleClearanceStatus: varchar("sample_clearance_status").default("pending"), // clear, pending, not_cleared, not_applicable
  licenseScore: integer("license_score").notNull().default(0),
  lastCheckedAt: timestamp("last_checked_at").defaultNow(),
});

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

// ─── LEGAL DOCUMENT VERSIONING & ACCEPTANCE ─────────────────────────────────
// Counsel-editable Terms/Privacy/DPA/contributor-consent text, decoupled from
// code deploys. `legal_documents` is an append-only version history (publish
// = new row, never mutate a published version); `legal_acceptances` is the
// authoritative per-user, per-doc-type acceptance ledger. `users.termsAcceptedAt`
// / `users.termsVersion` remain as a denormalized fast-path cache of the
// user's latest `tos` acceptance only, read by the global per-request
// requireTermsAccepted middleware — legal_acceptances is the source of truth.
export const LEGAL_DOC_TYPES = ["tos", "privacy", "dpa", "contributor_consent"] as const;
export type LegalDocType = typeof LEGAL_DOC_TYPES[number];

export const legalDocuments = pgTable("legal_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  docType: varchar("doc_type").notNull(), // tos, privacy, dpa, contributor_consent
  version: varchar("version").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  markdownBody: text("markdown_body").notNull(),
  publishedBy: varchar("published_by").references(() => users.id),
  publishedAt: timestamp("published_at").defaultNow(),
}, (table) => [
  unique("uq_legal_documents_type_version").on(table.docType, table.version),
]);

export const legalAcceptances = pgTable("legal_acceptances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  docType: varchar("doc_type").notNull(),
  version: varchar("version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
}, (table) => [
  index("idx_legal_acceptances_user").on(table.userId),
]);

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

export const creatorsRelations = relations(creators, ({ one }) => ({
  creator: one(users, {
    fields: [creators.createdBy],
    references: [users.id],
  }),
}));

export const creatorRightsProfilesRelations = relations(creatorRightsProfiles, ({ one }) => ({
  user: one(users, {
    fields: [creatorRightsProfiles.userId],
    references: [users.id],
  }),
}));

export const compositionAssetsRelations = relations(compositionAssets, ({ one }) => ({
  songAsset: one(songAssets, {
    fields: [compositionAssets.songAssetId],
    references: [songAssets.id],
  }),
}));

export const masterAssetsRelations = relations(masterAssets, ({ one }) => ({
  songAsset: one(songAssets, {
    fields: [masterAssets.songAssetId],
    references: [songAssets.id],
  }),
}));

export const licenseReadinessRelations = relations(licenseReadiness, ({ one }) => ({
  songAsset: one(songAssets, {
    fields: [licenseReadiness.songAssetId],
    references: [songAssets.id],
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
export type TemplateAuditLog = typeof templateAuditLog.$inferSelect;
export type LicenseRecord = typeof licenseRecords.$inferSelect;
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

// Global Rights Framework
export const insertRightsOrganizationSchema = createInsertSchema(rightsOrganizations).omit({
  id: true,
  createdAt: true,
});
export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  slCreatorId: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCreatorRightsProfileSchema = createInsertSchema(creatorRightsProfiles).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type RightsOrganization = typeof rightsOrganizations.$inferSelect;
export type InsertRightsOrganization = z.infer<typeof insertRightsOrganizationSchema>;
export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type CreatorRightsProfile = typeof creatorRightsProfiles.$inferSelect;
export type InsertCreatorRightsProfile = z.infer<typeof insertCreatorRightsProfileSchema>;

// Master vs Composition Rights
export const insertCompositionAssetSchema = createInsertSchema(compositionAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertMasterAssetSchema = createInsertSchema(masterAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CompositionAsset = typeof compositionAssets.$inferSelect;
export type InsertCompositionAsset = z.infer<typeof insertCompositionAssetSchema>;
export type MasterAsset = typeof masterAssets.$inferSelect;
export type InsertMasterAsset = z.infer<typeof insertMasterAssetSchema>;

// Licensing Readiness System
export const insertLicenseReadinessSchema = createInsertSchema(licenseReadiness).omit({
  id: true,
  lastCheckedAt: true,
});
export type LicenseReadiness = typeof licenseReadiness.$inferSelect;
export type InsertLicenseReadiness = z.infer<typeof insertLicenseReadinessSchema>;

// Legal document versioning & acceptance
export const insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({
  id: true,
  publishedAt: true,
}).extend({
  docType: z.enum(LEGAL_DOC_TYPES),
  effectiveDate: z.coerce.date(),
});
export type LegalDocument = typeof legalDocuments.$inferSelect;
export type InsertLegalDocument = z.infer<typeof insertLegalDocumentSchema>;

export const insertLegalAcceptanceSchema = createInsertSchema(legalAcceptances).omit({
  id: true,
  acceptedAt: true,
}).extend({
  docType: z.enum(LEGAL_DOC_TYPES),
});
export type LegalAcceptance = typeof legalAcceptances.$inferSelect;
export type InsertLegalAcceptance = z.infer<typeof insertLegalAcceptanceSchema>;

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