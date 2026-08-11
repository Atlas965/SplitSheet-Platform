var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/loadEnv.ts
import fs from "fs";
import path from "path";
function applyRuntimeDefaults() {
  if (!process.env.DATABASE_URL && process.env.NEON_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
  }
  if ((process.env.VERCEL === "1" || process.env.VERCEL === "true") && !process.env.AUTH_PROVIDER) {
    process.env.AUTH_PROVIDER = "local";
  }
  if (process.env.LOCAL_DEV === "true" && process.env.NODE_TLS_REJECT_UNAUTHORIZED === void 0) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}
function loadEnv() {
  if (process.env.__ENV_LOADED__) return;
  const envPath = path.resolve(import.meta.dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const contents = fs.readFileSync(envPath, "utf-8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq4 = trimmed.indexOf("=");
      if (eq4 === -1) continue;
      const key = trimmed.slice(0, eq4).trim();
      let value = trimmed.slice(eq4 + 1).trim();
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
  applyRuntimeDefaults();
  process.env.__ENV_LOADED__ = "1";
}
var init_loadEnv = __esm({
  "server/loadEnv.ts"() {
    "use strict";
    loadEnv();
  }
});

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  LEGAL_DOC_TYPES: () => LEGAL_DOC_TYPES,
  ORGANIZATION_ROLES: () => ORGANIZATION_ROLES,
  ORGANIZATION_TYPES: () => ORGANIZATION_TYPES,
  OWNERSHIP_RIGHT_TYPES: () => OWNERSHIP_RIGHT_TYPES,
  TERRITORIES: () => TERRITORIES,
  activityEventSchema: () => activityEventSchema,
  batchActivitiesSchema: () => batchActivitiesSchema,
  compositionAssets: () => compositionAssets,
  compositionAssetsRelations: () => compositionAssetsRelations,
  confirmations: () => confirmations,
  confirmationsRelations: () => confirmationsRelations,
  contractCollaborators: () => contractCollaborators,
  contractCollaboratorsRelations: () => contractCollaboratorsRelations,
  contractSignatures: () => contractSignatures,
  contractSignaturesRelations: () => contractSignaturesRelations,
  contractTemplates: () => contractTemplates,
  contracts: () => contracts,
  contractsRelations: () => contractsRelations,
  creatorRightsProfiles: () => creatorRightsProfiles,
  creatorRightsProfilesRelations: () => creatorRightsProfilesRelations,
  creators: () => creators,
  creatorsRelations: () => creatorsRelations,
  errorLogs: () => errorLogs,
  insertCompositionAssetSchema: () => insertCompositionAssetSchema,
  insertConfirmationSchema: () => insertConfirmationSchema,
  insertContractCollaboratorSchema: () => insertContractCollaboratorSchema,
  insertContractSchema: () => insertContractSchema,
  insertContractSignatureSchema: () => insertContractSignatureSchema,
  insertContractTemplateSchema: () => insertContractTemplateSchema,
  insertCreatorRightsProfileSchema: () => insertCreatorRightsProfileSchema,
  insertCreatorSchema: () => insertCreatorSchema,
  insertErrorLogSchema: () => insertErrorLogSchema,
  insertLegalAcceptanceSchema: () => insertLegalAcceptanceSchema,
  insertLegalDocumentSchema: () => insertLegalDocumentSchema,
  insertLicenseReadinessSchema: () => insertLicenseReadinessSchema,
  insertMasterAssetSchema: () => insertMasterAssetSchema,
  insertMessageSchema: () => insertMessageSchema,
  insertNegotiationConversationSchema: () => insertNegotiationConversationSchema,
  insertNegotiationSchema: () => insertNegotiationSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOrganizationApiKeySchema: () => insertOrganizationApiKeySchema,
  insertOrganizationMemberSchema: () => insertOrganizationMemberSchema,
  insertOrganizationSchema: () => insertOrganizationSchema,
  insertOwnershipRecordSchema: () => insertOwnershipRecordSchema,
  insertPaymentEventSchema: () => insertPaymentEventSchema,
  insertPayoutRecordSchema: () => insertPayoutRecordSchema,
  insertProfileViewSchema: () => insertProfileViewSchema,
  insertRevenueEventSchema: () => insertRevenueEventSchema,
  insertRightsOrganizationSchema: () => insertRightsOrganizationSchema,
  insertSongAssetSchema: () => insertSongAssetSchema,
  insertSplitConfirmationSchema: () => insertSplitConfirmationSchema,
  insertUserActivitySchema: () => insertUserActivitySchema,
  insertUserBalanceSchema: () => insertUserBalanceSchema,
  insertUserMatchSchema: () => insertUserMatchSchema,
  insertUserSchema: () => insertUserSchema,
  insertVerificationCodeSchema: () => insertVerificationCodeSchema,
  legalAcceptances: () => legalAcceptances,
  legalDocuments: () => legalDocuments,
  licenseReadiness: () => licenseReadiness,
  licenseReadinessRelations: () => licenseReadinessRelations,
  masterAssets: () => masterAssets,
  masterAssetsRelations: () => masterAssetsRelations,
  messages: () => messages,
  negotiationConversations: () => negotiationConversations,
  negotiations: () => negotiations,
  notifications: () => notifications,
  organizationApiKeys: () => organizationApiKeys,
  organizationApiKeysRelations: () => organizationApiKeysRelations,
  organizationMembers: () => organizationMembers,
  organizationMembersRelations: () => organizationMembersRelations,
  organizations: () => organizations,
  organizationsRelations: () => organizationsRelations,
  ownershipRecords: () => ownershipRecords,
  paymentEvents: () => paymentEvents,
  payoutRecords: () => payoutRecords,
  profileViews: () => profileViews,
  rateLimitBuckets: () => rateLimitBuckets,
  revenueEvents: () => revenueEvents,
  rightsOrganizations: () => rightsOrganizations,
  sessions: () => sessions,
  songAssets: () => songAssets,
  splitConfirmations: () => splitConfirmations,
  userActivity: () => userActivity,
  userBalances: () => userBalances,
  userMatches: () => userMatches,
  users: () => users,
  usersRelations: () => usersRelations,
  verificationCodes: () => verificationCodes
});
import { sql } from "drizzle-orm";
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
  integer
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var sessions, users, contractTemplates, contracts, contractCollaborators, contractSignatures, userActivity, profileViews, negotiations, negotiationConversations, userMatches, messages, notifications, confirmations, songAssets, ownershipRecords, revenueEvents, payoutRecords, userBalances, splitConfirmations, organizations, organizationMembers, organizationApiKeys, ORGANIZATION_TYPES, ORGANIZATION_ROLES, TERRITORIES, OWNERSHIP_RIGHT_TYPES, rightsOrganizations, creators, creatorRightsProfiles, compositionAssets, masterAssets, licenseReadiness, paymentEvents, errorLogs, rateLimitBuckets, verificationCodes, LEGAL_DOC_TYPES, legalDocuments, legalAcceptances, usersRelations, contractsRelations, contractCollaboratorsRelations, contractSignaturesRelations, organizationsRelations, organizationMembersRelations, organizationApiKeysRelations, confirmationsRelations, creatorsRelations, creatorRightsProfilesRelations, compositionAssetsRelations, masterAssetsRelations, licenseReadinessRelations, insertUserSchema, insertContractTemplateSchema, insertContractSchema, insertContractCollaboratorSchema, insertContractSignatureSchema, insertUserActivitySchema, insertProfileViewSchema, insertNegotiationSchema, insertNegotiationConversationSchema, insertUserMatchSchema, insertMessageSchema, insertNotificationSchema, insertConfirmationSchema, insertSongAssetSchema, insertOwnershipRecordSchema, insertRevenueEventSchema, insertPayoutRecordSchema, insertUserBalanceSchema, insertSplitConfirmationSchema, insertPaymentEventSchema, insertErrorLogSchema, insertVerificationCodeSchema, insertOrganizationSchema, insertOrganizationMemberSchema, insertOrganizationApiKeySchema, insertRightsOrganizationSchema, insertCreatorSchema, insertCreatorRightsProfileSchema, insertCompositionAssetSchema, insertMasterAssetSchema, insertLicenseReadinessSchema, insertLegalDocumentSchema, insertLegalAcceptanceSchema, activityEventSchema, batchActivitiesSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    sessions = pgTable(
      "sessions",
      {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull()
      },
      (table) => [index("IDX_session_expire").on(table.expire)]
    );
    users = pgTable("users", {
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
      subscriptionTier: varchar("subscription_tier").default("free"),
      // free, pro, label
      role: varchar("role").default("user"),
      // user, admin
      // Stripe Connect Express — per-contributor payout account
      stripeConnectAccountId: varchar("stripe_connect_account_id"),
      stripeConnectOnboarded: boolean("stripe_connect_onboarded").default(false),
      stripeConnectChargesEnabled: boolean("stripe_connect_charges_enabled").default(false),
      stripeConnectPayoutsEnabled: boolean("stripe_connect_payouts_enabled").default(false),
      // Terms of Service / Privacy Policy acceptance
      termsAcceptedAt: timestamp("terms_accepted_at"),
      termsVersion: varchar("terms_version"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    contractTemplates = pgTable("contract_templates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name").notNull(),
      type: varchar("type").notNull(),
      // split-sheet, performance, producer, management
      description: text("description"),
      template: jsonb("template").notNull(),
      // JSON structure of the template
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    contracts = pgTable("contracts", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: varchar("title").notNull(),
      type: varchar("type").notNull(),
      status: varchar("status").default("draft"),
      // draft, pending, signed, cancelled
      templateId: varchar("template_id").references(() => contractTemplates.id),
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      data: jsonb("data").notNull(),
      // Contract form data
      metadata: jsonb("metadata"),
      // Additional metadata
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    contractCollaborators = pgTable("contract_collaborators", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contractId: varchar("contract_id").references(() => contracts.id).notNull(),
      userId: varchar("user_id").references(() => users.id),
      email: varchar("email"),
      // For non-registered users
      name: varchar("name").notNull(),
      role: varchar("role").notNull(),
      ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }),
      status: varchar("status").default("pending"),
      // pending, signed, declined
      signedAt: timestamp("signed_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    contractSignatures = pgTable("contract_signatures", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contractId: varchar("contract_id").references(() => contracts.id).notNull(),
      collaboratorId: varchar("collaborator_id").references(() => contractCollaborators.id).notNull(),
      signatureData: text("signature_data"),
      // Base64 encoded signature
      ipAddress: varchar("ip_address"),
      userAgent: text("user_agent"),
      signedAt: timestamp("signed_at").defaultNow()
    });
    userActivity = pgTable("user_activity", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      activityType: varchar("activity_type").notNull(),
      // login, profile_view, negotiation_start, etc.
      activityData: jsonb("activity_data"),
      ipAddress: varchar("ip_address"),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at").defaultNow()
    });
    profileViews = pgTable("profile_views", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      viewerId: varchar("viewer_id").references(() => users.id),
      profileId: varchar("profile_id").references(() => users.id).notNull(),
      viewedAt: timestamp("viewed_at").defaultNow()
    });
    negotiations = pgTable("negotiations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: varchar("title").notNull(),
      description: text("description"),
      status: varchar("status").default("active"),
      // active, completed, cancelled
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      participants: varchar("participants").array(),
      aiAssistantEnabled: boolean("ai_assistant_enabled").default(true),
      negotiationData: jsonb("negotiation_data"),
      outcome: jsonb("outcome"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    negotiationConversations = pgTable("negotiation_conversations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      negotiationId: varchar("negotiation_id").references(() => negotiations.id).notNull(),
      senderId: varchar("sender_id").references(() => users.id).notNull(),
      message: text("message").notNull(),
      messageType: varchar("message_type").default("text"),
      // text, ai_suggestion, system
      sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
      aiAnalysis: jsonb("ai_analysis"),
      createdAt: timestamp("created_at").defaultNow()
    });
    userMatches = pgTable("user_matches", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      matchedUserId: varchar("matched_user_id").references(() => users.id).notNull(),
      matchScore: decimal("match_score", { precision: 5, scale: 2 }),
      matchReason: text("match_reason"),
      status: varchar("status").default("suggested"),
      // suggested, connected, dismissed
      createdAt: timestamp("created_at").defaultNow()
    });
    messages = pgTable("messages", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      senderId: varchar("sender_id").references(() => users.id).notNull(),
      receiverId: varchar("receiver_id").references(() => users.id).notNull(),
      content: text("content").notNull(),
      messageType: varchar("message_type").default("text"),
      // text, image, file
      isRead: boolean("is_read").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    notifications = pgTable("notifications", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      title: varchar("title").notNull(),
      content: text("content").notNull(),
      type: varchar("type").notNull(),
      // info, warning, success, error
      isRead: boolean("is_read").default(false),
      actionUrl: varchar("action_url"),
      createdAt: timestamp("created_at").defaultNow()
    });
    confirmations = pgTable("confirmations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contractId: varchar("contract_id").references(() => contracts.id).notNull(),
      collaboratorId: varchar("collaborator_id").references(() => contractCollaborators.id).notNull(),
      status: varchar("status").default("pending"),
      // pending, confirmed, requested_change
      token: varchar("token").notNull().unique(),
      expiresAt: timestamp("expires_at"),
      confirmedAt: timestamp("confirmed_at"),
      ipAddress: varchar("ip_address"),
      userAgent: text("user_agent"),
      notes: text("notes"),
      // For "Request Change" feedback
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    songAssets = pgTable("song_assets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      title: varchar("title").notNull(),
      artistName: varchar("artist_name"),
      isrc: varchar("isrc"),
      // International Standard Recording Code
      slSongId: varchar("sl_song_id").unique(),
      // permanent external ID: SL-SONG-XXXXXXXX
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      contractId: varchar("contract_id").references(() => contracts.id),
      status: varchar("status").default("active"),
      // active, archived
      metadata: jsonb("metadata"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    ownershipRecords = pgTable("ownership_records", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      assetId: varchar("asset_id").references(() => songAssets.id).notNull(),
      userId: varchar("user_id").references(() => users.id).notNull(),
      ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
      role: varchar("role").notNull(),
      // writer, producer, performer, publisher
      version: integer("version").notNull(),
      changeReason: text("change_reason"),
      // Global rights framework — which right this record applies to, where, and for how long.
      ownershipType: varchar("ownership_type").default("composition"),
      // composition, master, publishing, neighboring_rights, mechanical_rights, performance_rights
      territory: varchar("territory"),
      // CA, US, UK, EU, AU, OTHER
      expirationDate: timestamp("expiration_date"),
      effectiveAt: timestamp("effective_at").defaultNow(),
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    revenueEvents = pgTable("revenue_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      assetId: varchar("asset_id").references(() => songAssets.id).notNull(),
      source: varchar("source").notNull(),
      // streaming, sync, performance, mechanical, other
      amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
      currency: varchar("currency").default("USD"),
      description: text("description"),
      periodStart: timestamp("period_start"),
      periodEnd: timestamp("period_end"),
      metadata: jsonb("metadata"),
      createdAt: timestamp("created_at").defaultNow()
    });
    payoutRecords = pgTable("payout_records", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      revenueEventId: varchar("revenue_event_id").references(() => revenueEvents.id).notNull(),
      userId: varchar("user_id").references(() => users.id).notNull(),
      assetId: varchar("asset_id").references(() => songAssets.id).notNull(),
      ownershipPercentage: decimal("ownership_percentage", { precision: 5, scale: 2 }).notNull(),
      amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
      currency: varchar("currency").default("USD"),
      status: varchar("status").default("pending"),
      // pending, processing, completed, failed
      stripeTransferId: varchar("stripe_transfer_id"),
      processedAt: timestamp("processed_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    userBalances = pgTable("user_balances", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull().unique(),
      totalEarned: decimal("total_earned", { precision: 12, scale: 2 }).default("0"),
      totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).default("0"),
      pendingBalance: decimal("pending_balance", { precision: 12, scale: 2 }).default("0"),
      currency: varchar("currency").default("USD"),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    splitConfirmations = pgTable("split_confirmations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      contractId: varchar("contract_id").references(() => contracts.id).notNull(),
      collaboratorId: varchar("collaborator_id").references(() => contractCollaborators.id).notNull(),
      token: varchar("token").notNull().unique(),
      status: varchar("status").default("not_sent"),
      // not_sent, sent, confirmed, change_requested
      sentAt: timestamp("sent_at"),
      confirmedAt: timestamp("confirmed_at"),
      expiresAt: timestamp("expires_at"),
      confirmedName: varchar("confirmed_name"),
      confirmedEmail: varchar("confirmed_email"),
      confirmationNote: text("confirmation_note"),
      ipAddress: varchar("ip_address"),
      userAgent: text("user_agent"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    organizations = pgTable("organizations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      slOrgId: varchar("sl_org_id").notNull().unique(),
      // permanent external ID: SL-ORG-XXXXXXXX
      name: varchar("name").notNull(),
      type: varchar("type").notNull().default("label"),
      // label, studio, publisher, distributor, pro
      email: varchar("email"),
      website: varchar("website"),
      country: varchar("country"),
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    organizationMembers = pgTable("organization_members", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
      userId: varchar("user_id").references(() => users.id).notNull(),
      role: varchar("role").notNull().default("member"),
      // owner, admin, member, viewer
      invitedBy: varchar("invited_by").references(() => users.id),
      createdAt: timestamp("created_at").defaultNow()
    });
    organizationApiKeys = pgTable("organization_api_keys", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
      name: varchar("name").notNull(),
      keyHash: varchar("key_hash").notNull().unique(),
      keyPrefix: varchar("key_prefix").notNull(),
      scopes: text("scopes").array().notNull().default(sql`'{}'::text[]`),
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      lastUsedAt: timestamp("last_used_at"),
      revokedAt: timestamp("revoked_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    ORGANIZATION_TYPES = ["label", "studio", "publisher", "distributor", "pro"];
    ORGANIZATION_ROLES = ["owner", "admin", "member", "viewer"];
    TERRITORIES = ["CA", "US", "UK", "EU", "AU", "OTHER"];
    OWNERSHIP_RIGHT_TYPES = [
      "composition",
      "master",
      "publishing",
      "neighboring_rights",
      "mechanical_rights",
      "performance_rights"
    ];
    rightsOrganizations = pgTable("rights_organizations", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: varchar("name").notNull(),
      territory: varchar("territory").notNull(),
      // CA, US, UK, EU, AU, OTHER
      organizationType: varchar("organization_type").notNull().default("pro"),
      // pro, mro, neighboring_rights, cmo
      website: varchar("website"),
      supportedRights: text("supported_rights").array().notNull().default(sql`'{}'::text[]`),
      createdAt: timestamp("created_at").defaultNow()
    });
    creators = pgTable("creators", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      slCreatorId: varchar("sl_creator_id").notNull().unique(),
      // permanent external ID: SL-CREATOR-XXXXXXXX
      name: varchar("name").notNull(),
      type: varchar("type").notNull().default("songwriter"),
      // songwriter, producer, artist, publisher
      email: varchar("email"),
      pro: varchar("pro"),
      // PRO affiliation display name (e.g. "SOCAN")
      ipi: varchar("ipi"),
      // IPI / CAE number
      isni: varchar("isni"),
      bio: text("bio"),
      website: varchar("website"),
      createdBy: varchar("created_by").references(() => users.id).notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    creatorRightsProfiles = pgTable("creator_rights_profiles", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull().unique(),
      ipiNumber: varchar("ipi_number"),
      proAffiliation: varchar("pro_affiliation"),
      // references rightsOrganizations.name (free text for orgs not in the seed list)
      territory: varchar("territory").default("CA"),
      // CA, US, UK, EU, AU, OTHER
      songwriterStatus: boolean("songwriter_status").default(false),
      publisherStatus: boolean("publisher_status").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    compositionAssets = pgTable("composition_assets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      songAssetId: varchar("song_asset_id").references(() => songAssets.id).notNull().unique(),
      title: varchar("title").notNull(),
      iswc: varchar("iswc"),
      // International Standard Musical Work Code
      ownershipStatus: varchar("ownership_status").default("pending"),
      // pending, complete, disputed
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    masterAssets = pgTable("master_assets", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      songAssetId: varchar("song_asset_id").references(() => songAssets.id).notNull().unique(),
      recordingTitle: varchar("recording_title").notNull(),
      isrc: varchar("isrc"),
      // International Standard Recording Code
      artistOwner: varchar("artist_owner"),
      labelOwner: varchar("label_owner"),
      distributor: varchar("distributor"),
      releaseDate: timestamp("release_date"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    licenseReadiness = pgTable("license_readiness", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      songAssetId: varchar("song_asset_id").references(() => songAssets.id).notNull().unique(),
      ownershipComplete: boolean("ownership_complete").default(false),
      contributorConfirmed: boolean("contributor_confirmed").default(false),
      agreementsComplete: boolean("agreements_complete").default(false),
      metadataComplete: boolean("metadata_complete").default(false),
      sampleClearanceStatus: varchar("sample_clearance_status").default("pending"),
      // clear, pending, not_cleared, not_applicable
      licenseScore: integer("license_score").notNull().default(0),
      lastCheckedAt: timestamp("last_checked_at").defaultNow()
    });
    paymentEvents = pgTable("payment_events", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      stripeEventId: varchar("stripe_event_id").notNull().unique(),
      eventType: varchar("event_type").notNull(),
      payload: jsonb("payload"),
      processed: boolean("processed").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    errorLogs = pgTable("error_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      level: varchar("level").notNull().default("error"),
      // error, warn, fatal
      message: text("message").notNull(),
      stack: text("stack"),
      route: varchar("route"),
      userId: varchar("user_id"),
      metadata: jsonb("metadata"),
      createdAt: timestamp("created_at").defaultNow()
    });
    rateLimitBuckets = pgTable("rate_limit_buckets", {
      bucketKey: varchar("bucket_key").primaryKey(),
      count: integer("count").notNull().default(0),
      resetAt: timestamp("reset_at").notNull()
    });
    verificationCodes = pgTable("verification_codes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id),
      channel: varchar("channel").notNull().default("email"),
      // email, sms
      destination: varchar("destination").notNull(),
      // email address or phone number
      codeHash: varchar("code_hash").notNull(),
      purpose: varchar("purpose").notNull().default("identity_verification"),
      legalName: varchar("legal_name"),
      idType: varchar("id_type"),
      attempts: integer("attempts").notNull().default(0),
      consumedAt: timestamp("consumed_at"),
      expiresAt: timestamp("expires_at").notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    LEGAL_DOC_TYPES = ["tos", "privacy", "dpa", "contributor_consent"];
    legalDocuments = pgTable("legal_documents", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      docType: varchar("doc_type").notNull(),
      // tos, privacy, dpa, contributor_consent
      version: varchar("version").notNull(),
      effectiveDate: timestamp("effective_date").notNull(),
      markdownBody: text("markdown_body").notNull(),
      publishedBy: varchar("published_by").references(() => users.id),
      publishedAt: timestamp("published_at").defaultNow()
    }, (table) => [
      unique("uq_legal_documents_type_version").on(table.docType, table.version)
    ]);
    legalAcceptances = pgTable("legal_acceptances", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id).notNull(),
      docType: varchar("doc_type").notNull(),
      version: varchar("version").notNull(),
      acceptedAt: timestamp("accepted_at").defaultNow(),
      ipAddress: varchar("ip_address"),
      userAgent: varchar("user_agent")
    }, (table) => [
      index("idx_legal_acceptances_user").on(table.userId)
    ]);
    usersRelations = relations(users, ({ many }) => ({
      contracts: many(contracts),
      collaborations: many(contractCollaborators)
    }));
    contractsRelations = relations(contracts, ({ one, many }) => ({
      template: one(contractTemplates, {
        fields: [contracts.templateId],
        references: [contractTemplates.id]
      }),
      creator: one(users, {
        fields: [contracts.createdBy],
        references: [users.id]
      }),
      collaborators: many(contractCollaborators)
    }));
    contractCollaboratorsRelations = relations(contractCollaborators, ({ one, many }) => ({
      contract: one(contracts, {
        fields: [contractCollaborators.contractId],
        references: [contracts.id]
      }),
      user: one(users, {
        fields: [contractCollaborators.userId],
        references: [users.id]
      }),
      signatures: many(contractSignatures)
    }));
    contractSignaturesRelations = relations(contractSignatures, ({ one }) => ({
      contract: one(contracts, {
        fields: [contractSignatures.contractId],
        references: [contracts.id]
      }),
      collaborator: one(contractCollaborators, {
        fields: [contractSignatures.collaboratorId],
        references: [contractCollaborators.id]
      })
    }));
    organizationsRelations = relations(organizations, ({ one, many }) => ({
      creator: one(users, {
        fields: [organizations.createdBy],
        references: [users.id]
      }),
      members: many(organizationMembers),
      apiKeys: many(organizationApiKeys)
    }));
    organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
      organization: one(organizations, {
        fields: [organizationMembers.organizationId],
        references: [organizations.id]
      }),
      user: one(users, {
        fields: [organizationMembers.userId],
        references: [users.id]
      })
    }));
    organizationApiKeysRelations = relations(organizationApiKeys, ({ one }) => ({
      organization: one(organizations, {
        fields: [organizationApiKeys.organizationId],
        references: [organizations.id]
      })
    }));
    confirmationsRelations = relations(confirmations, ({ one }) => ({
      contract: one(contracts, {
        fields: [confirmations.contractId],
        references: [contracts.id]
      }),
      collaborator: one(contractCollaborators, {
        fields: [confirmations.collaboratorId],
        references: [contractCollaborators.id]
      })
    }));
    creatorsRelations = relations(creators, ({ one }) => ({
      creator: one(users, {
        fields: [creators.createdBy],
        references: [users.id]
      })
    }));
    creatorRightsProfilesRelations = relations(creatorRightsProfiles, ({ one }) => ({
      user: one(users, {
        fields: [creatorRightsProfiles.userId],
        references: [users.id]
      })
    }));
    compositionAssetsRelations = relations(compositionAssets, ({ one }) => ({
      songAsset: one(songAssets, {
        fields: [compositionAssets.songAssetId],
        references: [songAssets.id]
      })
    }));
    masterAssetsRelations = relations(masterAssets, ({ one }) => ({
      songAsset: one(songAssets, {
        fields: [masterAssets.songAssetId],
        references: [songAssets.id]
      })
    }));
    licenseReadinessRelations = relations(licenseReadiness, ({ one }) => ({
      songAsset: one(songAssets, {
        fields: [licenseReadiness.songAssetId],
        references: [songAssets.id]
      })
    }));
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertContractSchema = createInsertSchema(contracts).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertContractCollaboratorSchema = createInsertSchema(contractCollaborators).omit({
      id: true,
      createdAt: true
    });
    insertContractSignatureSchema = createInsertSchema(contractSignatures).omit({
      id: true,
      signedAt: true
    });
    insertUserActivitySchema = createInsertSchema(userActivity).omit({
      id: true,
      createdAt: true
    });
    insertProfileViewSchema = createInsertSchema(profileViews).omit({
      id: true,
      viewedAt: true
    });
    insertNegotiationSchema = createInsertSchema(negotiations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertNegotiationConversationSchema = createInsertSchema(negotiationConversations).omit({
      id: true,
      createdAt: true
    });
    insertUserMatchSchema = createInsertSchema(userMatches).omit({
      id: true,
      createdAt: true
    });
    insertMessageSchema = createInsertSchema(messages).omit({
      id: true,
      createdAt: true
    });
    insertNotificationSchema = createInsertSchema(notifications).omit({
      id: true,
      createdAt: true
    });
    insertConfirmationSchema = createInsertSchema(confirmations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertSongAssetSchema = createInsertSchema(songAssets).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertOwnershipRecordSchema = createInsertSchema(ownershipRecords).omit({
      id: true,
      createdAt: true
    });
    insertRevenueEventSchema = createInsertSchema(revenueEvents).omit({
      id: true,
      createdAt: true
    });
    insertPayoutRecordSchema = createInsertSchema(payoutRecords).omit({
      id: true,
      createdAt: true
    });
    insertUserBalanceSchema = createInsertSchema(userBalances).omit({
      id: true
    });
    insertSplitConfirmationSchema = createInsertSchema(splitConfirmations).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertPaymentEventSchema = createInsertSchema(paymentEvents).omit({
      id: true,
      createdAt: true
    });
    insertErrorLogSchema = createInsertSchema(errorLogs).omit({
      id: true,
      createdAt: true
    });
    insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({
      id: true,
      createdAt: true
    });
    insertOrganizationSchema = createInsertSchema(organizations).omit({
      id: true,
      slOrgId: true,
      createdAt: true,
      updatedAt: true
    });
    insertOrganizationMemberSchema = createInsertSchema(organizationMembers).omit({
      id: true,
      createdAt: true
    });
    insertOrganizationApiKeySchema = createInsertSchema(organizationApiKeys).omit({
      id: true,
      keyHash: true,
      keyPrefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true
    });
    insertRightsOrganizationSchema = createInsertSchema(rightsOrganizations).omit({
      id: true,
      createdAt: true
    });
    insertCreatorSchema = createInsertSchema(creators).omit({
      id: true,
      slCreatorId: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true
    });
    insertCreatorRightsProfileSchema = createInsertSchema(creatorRightsProfiles).omit({
      id: true,
      userId: true,
      createdAt: true,
      updatedAt: true
    });
    insertCompositionAssetSchema = createInsertSchema(compositionAssets).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertMasterAssetSchema = createInsertSchema(masterAssets).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertLicenseReadinessSchema = createInsertSchema(licenseReadiness).omit({
      id: true,
      lastCheckedAt: true
    });
    insertLegalDocumentSchema = createInsertSchema(legalDocuments).omit({
      id: true,
      publishedAt: true
    }).extend({
      docType: z.enum(LEGAL_DOC_TYPES),
      effectiveDate: z.coerce.date()
    });
    insertLegalAcceptanceSchema = createInsertSchema(legalAcceptances).omit({
      id: true,
      acceptedAt: true
    }).extend({
      docType: z.enum(LEGAL_DOC_TYPES)
    });
    activityEventSchema = z.object({
      activityType: z.string().min(1).max(50),
      activityData: z.any().optional()
    });
    batchActivitiesSchema = z.object({
      activities: z.array(activityEventSchema).min(1).max(100)
      // Limit batch size
    });
  }
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
var databaseUrl, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    neonConfig.webSocketConstructor = ws;
    if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
      neonConfig.poolQueryViaFetch = true;
    }
    databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle({ client: pool, schema: schema_exports });
  }
});

// server/security.ts
var security_exports = {};
__export(security_exports, {
  apiKeyAuth: () => apiKeyAuth,
  assertTransition: () => assertTransition,
  assessLoginRisk: () => assessLoginRisk,
  auditLog: () => auditLog,
  auditMiddleware: () => auditMiddleware,
  buildDeviceHash: () => buildDeviceHash,
  calculateRiskScore: () => calculateRiskScore,
  canTransition: () => canTransition,
  canonicalJson: () => canonicalJson,
  computeContentHash: () => computeContentHash,
  computeLockExpiry: () => computeLockExpiry,
  createPgRateLimiter: () => createPgRateLimiter,
  createRateLimiter: () => createRateLimiter,
  decryptField: () => decryptField,
  encryptField: () => encryptField,
  generateApiKey: () => generateApiKey,
  hmacSign: () => hmacSign,
  hmacVerify: () => hmacVerify,
  hmacVerifyMiddleware: () => hmacVerifyMiddleware,
  openDispute: () => openDispute,
  recordFraudEvent: () => recordFraudEvent,
  requireScope: () => requireScope,
  resolveDispute: () => resolveDispute,
  sanitizeMiddleware: () => sanitizeMiddleware,
  sanitizeObject: () => sanitizeObject,
  sanitizeString: () => sanitizeString,
  securityHeaders: () => securityHeaders,
  sha256: () => sha256,
  splitSheetSchema: () => splitSheetSchema,
  trackLoginEvent: () => trackLoginEvent,
  verifyHashChain: () => verifyHashChain,
  zkVerifyHandler: () => zkVerifyHandler
});
import crypto from "crypto";
import { z as z2 } from "zod";
import { sql as sql2 } from "drizzle-orm";
function sha256(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}
function encryptField(plaintext, secret) {
  const key = crypto.scryptSync(secret, "splitsheet-salt", 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}
function decryptField(ciphertext, secret) {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const key = crypto.scryptSync(secret, "splitsheet-salt", 32);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final()
  ]);
  return dec.toString("utf8");
}
function generateApiKey() {
  const raw = `ss_live_${crypto.randomBytes(32).toString("hex")}`;
  const hash = sha256(raw);
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}
function hmacSign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}
function hmacVerify(payload, secret, sig) {
  const expected = hmacSign(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}
function canonicalJson(collaborators) {
  const sorted = [...collaborators].sort((a, b) => a.email.localeCompare(b.email)).map((c) => ({
    email: c.email,
    name: c.name,
    ownershipPercentage: c.ownershipPercentage,
    role: c.role
  }));
  return JSON.stringify(sorted);
}
function computeContentHash(contractId, version, collaborators, prevHash) {
  const payload = JSON.stringify({
    contractId,
    version,
    canonical: canonicalJson(collaborators),
    prevHash: prevHash ?? null
  });
  return sha256(payload);
}
async function verifyHashChain(contractId) {
  const rows = await db.execute(sql2`
    SELECT version_number, content_hash, prev_hash
    FROM split_versions
    WHERE contract_id = ${contractId}
    ORDER BY version_number ASC
  `);
  const versions = rows.rows;
  let prev = null;
  for (const v of versions) {
    if (v.version_number === 1 && v.prev_hash !== null) {
      return { valid: false, brokenAt: 1, versions: versions.length };
    }
    if (v.version_number > 1 && v.prev_hash !== prev) {
      return { valid: false, brokenAt: v.version_number, versions: versions.length };
    }
    prev = v.content_hash;
  }
  return { valid: true, versions: versions.length };
}
function canTransition(from, to) {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} \u2192 ${to}`);
  }
}
function computeLockExpiry(signedAt) {
  return new Date(signedAt.getTime() + 48 * 60 * 60 * 1e3);
}
function calculateRiskScore(ctx) {
  let score = 0;
  const rules = [];
  const details = {};
  if (ctx.timeSinceLastVersion !== void 0 && ctx.timeSinceLastVersion < 5) {
    score += 30;
    rules.push("rapid_change");
    details.minutesSinceLastChange = ctx.timeSinceLastVersion;
  }
  if (ctx.prevCollaborators?.length) {
    const prevMap = new Map(ctx.prevCollaborators.map((c) => [c.email, c.ownershipPercentage]));
    for (const c of ctx.collaborators) {
      const prev = prevMap.get(c.email) ?? 0;
      const swing = Math.abs(c.ownershipPercentage - prev);
      if (swing > 50) {
        score += 25;
        rules.push("ownership_spike");
        details.ownershipSpike = { email: c.email, from: prev, to: c.ownershipPercentage };
        break;
      }
    }
  }
  if (ctx.versionNumber > 1 && ctx.prevCollaborators?.length) {
    const prevEmails = new Set(ctx.prevCollaborators.map((c) => c.email));
    const newAdds = ctx.collaborators.filter(
      (c) => !prevEmails.has(c.email) && c.ownershipPercentage > 0
    );
    if (newAdds.length > 0) {
      score += 20;
      rules.push("late_contributor_add");
      details.newCollaborators = newAdds.map((c) => c.email);
    }
  }
  if (ctx.versionNumber > 5) {
    score += 15;
    rules.push("excessive_versions");
    details.versionNumber = ctx.versionNumber;
  }
  const maxPct = Math.max(...ctx.collaborators.map((c) => c.ownershipPercentage));
  if (maxPct > 90) {
    score += 10;
    rules.push("ownership_concentration");
    details.maxPercentage = maxPct;
  }
  let action;
  if (score >= 70) action = "freeze";
  else if (score >= 40) action = "delay";
  else action = "allow";
  return { riskScore: score, action, rulesTriggered: rules, details };
}
async function recordFraudEvent(ctx, result) {
  if (result.rulesTriggered.length === 0) return;
  await db.execute(sql2`
    INSERT INTO fraud_events
      (contract_id, user_id, rule_triggered, risk_score, action_taken, details)
    VALUES
      (${ctx.contractId}, ${ctx.userId},
       ${result.rulesTriggered.join(",")},
       ${result.riskScore}, ${result.action},
       ${JSON.stringify(result.details)}::jsonb)
  `);
  await db.execute(sql2`
    INSERT INTO contract_risk_profiles
      (contract_id, current_score, freeze_active, freeze_reason, version_changes, last_change_at)
    VALUES
      (${ctx.contractId}, ${result.riskScore},
       ${result.action === "freeze"},
       ${result.action === "freeze" ? result.rulesTriggered.join(", ") : null},
       1, NOW())
    ON CONFLICT (contract_id) DO UPDATE SET
      current_score     = GREATEST(contract_risk_profiles.current_score, ${result.riskScore}),
      freeze_active     = CASE WHEN ${result.action === "freeze"} THEN TRUE ELSE contract_risk_profiles.freeze_active END,
      freeze_reason     = COALESCE(${result.action === "freeze" ? result.rulesTriggered.join(", ") : null}, contract_risk_profiles.freeze_reason),
      version_changes   = contract_risk_profiles.version_changes + 1,
      last_change_at    = NOW(),
      rapid_change_flag = ${result.rulesTriggered.includes("rapid_change")},
      updated_at        = NOW()
  `);
}
async function auditLog(entry) {
  try {
    await db.execute(sql2`
      INSERT INTO audit_log
        (user_id, api_key_id, action, resource_type, resource_id,
         before_state, after_state, ip_address, user_agent, request_id)
      VALUES
        (${entry.userId ?? null},
         ${entry.apiKeyId ?? null}::uuid,
         ${entry.action},
         ${entry.resourceType ?? null},
         ${entry.resourceId ?? null},
         ${entry.beforeState ? JSON.stringify(entry.beforeState) : null}::jsonb,
         ${entry.afterState ? JSON.stringify(entry.afterState) : null}::jsonb,
         ${entry.ipAddress ?? null}::inet,
         ${entry.userAgent ?? null},
         ${entry.requestId ?? null})
    `);
  } catch (err) {
    console.error("[AUDIT ERROR]", err);
  }
}
function auditMiddleware(req, _res, next) {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  req.ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ?? req.socket.remoteAddress ?? "unknown";
  next();
}
async function apiKeyAuth(req, res, next) {
  const raw = req.headers["x-api-key"]?.toString();
  if (!raw) {
    res.status(401).json({ error: "Missing X-Api-Key header" });
    return;
  }
  const keyHash = sha256(raw);
  const rows = await db.execute(sql2`
    SELECT id, owner_id, scopes, rate_limit, expires_at
    FROM api_keys
    WHERE key_hash = ${keyHash}
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `);
  if (!rows.rows.length) {
    res.status(401).json({ error: "Invalid or expired API key" });
    return;
  }
  const key = rows.rows[0];
  db.execute(sql2`
    UPDATE api_keys SET last_used_at = NOW() WHERE id = ${key.id}
  `).catch(() => {
  });
  req.apiKey = key;
  req.apiKeyId = key.id;
  req.apiScopes = key.scopes;
  req.apiOwnerId = key.owner_id;
  next();
}
function requireScope(scope) {
  return (req, res, next) => {
    const scopes = req.apiScopes ?? [];
    if (!scopes.includes(scope) && !scopes.includes("*")) {
      res.status(403).json({ error: `Insufficient scope. Required: ${scope}` });
      return;
    }
    next();
  };
}
function hmacVerifyMiddleware(secret) {
  return (req, res, next) => {
    const sigHeader = req.headers["x-signature"]?.toString();
    const tsHeader = req.headers["x-timestamp"]?.toString();
    if (!sigHeader || !tsHeader) {
      res.status(401).json({ error: "Missing HMAC signature headers" });
      return;
    }
    const ts = parseInt(tsHeader, 10);
    const age = Math.abs(Date.now() / 1e3 - ts);
    if (age > 300) {
      res.status(401).json({ error: "Request timestamp too old" });
      return;
    }
    const body = JSON.stringify(req.body) ?? "";
    const payload = `${tsHeader}.${body}`;
    const sig = sigHeader.replace("hmac-sha256=", "");
    if (!hmacVerify(payload, secret, sig)) {
      res.status(401).json({ error: "Invalid HMAC signature" });
      return;
    }
    next();
  };
}
function buildDeviceHash(req) {
  const ua = req.headers["user-agent"] ?? "";
  const lang = req.headers["accept-language"] ?? "";
  const ipSubnet = (req.ip ?? "").split(".").slice(0, 3).join(".");
  return sha256(`${ua}|${lang}|${ipSubnet}`);
}
async function trackLoginEvent(userId, req, eventType, riskScore = 0) {
  const ip = req.ip ?? req.socket.remoteAddress ?? "0.0.0.0";
  const deviceHash = buildDeviceHash(req);
  const ua = req.headers["user-agent"] ?? null;
  await db.execute(sql2`
    INSERT INTO login_events
      (user_id, event_type, ip_address, user_agent, device_hash, risk_score)
    VALUES
      (${userId}, ${eventType}, ${ip}::inet, ${ua}, ${deviceHash}, ${riskScore})
  `);
  await db.execute(sql2`
    INSERT INTO user_devices (user_id, device_hash, ip_address, device_name)
    VALUES (${userId}, ${deviceHash}, ${ip}::inet, ${ua?.slice(0, 200) ?? "Unknown"})
    ON CONFLICT (user_id, device_hash)
    DO UPDATE SET last_seen_at = NOW(), ip_address = ${ip}::inet
  `);
}
async function assessLoginRisk(userId, req) {
  const deviceHash = buildDeviceHash(req);
  const deviceRows = await db.execute(sql2`
    SELECT is_trusted FROM user_devices
    WHERE user_id = ${userId} AND device_hash = ${deviceHash}
    LIMIT 1
  `);
  const knownDevice = deviceRows.rows.length > 0;
  const trustedDevice = deviceRows.rows[0]?.is_trusted === true;
  const failRows = await db.execute(sql2`
    SELECT COUNT(*) AS cnt FROM login_events
    WHERE user_id = ${userId}
      AND event_type = 'login_fail'
      AND created_at > NOW() - INTERVAL '30 minutes'
  `);
  const recentFails = Number(failRows.rows[0]?.cnt ?? 0);
  let score = 0;
  if (!knownDevice) score += 30;
  if (!trustedDevice) score += 10;
  score += Math.min(recentFails * 15, 45);
  return Math.min(score, 100);
}
function createRateLimiter(maxReqs, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const entry = inMemoryBuckets.get(key);
    if (!entry || now > entry.resetAt) {
      inMemoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    entry.count++;
    if (entry.count > maxReqs) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1e3));
      res.status(429).json({ error: "Too many requests. Please wait." });
      return;
    }
    next();
  };
}
function createPgRateLimiter(maxReqs, windowMs, scope = "global") {
  return async (req, res, next) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${scope}:${ip}`;
    const now = /* @__PURE__ */ new Date();
    try {
      const rows = await db.execute(sql2`
        INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
        VALUES (${key}, 1, ${new Date(now.getTime() + windowMs)})
        ON CONFLICT (bucket_key) DO UPDATE SET
          count    = CASE WHEN rate_limit_buckets.reset_at < ${now}
                          THEN 1
                          ELSE rate_limit_buckets.count + 1 END,
          reset_at = CASE WHEN rate_limit_buckets.reset_at < ${now}
                          THEN ${new Date(now.getTime() + windowMs)}
                          ELSE rate_limit_buckets.reset_at END
        RETURNING count, reset_at
      `);
      const bucket = rows.rows[0];
      if (Number(bucket.count) > maxReqs) {
        const retryAfterSec = Math.max(1, Math.ceil((new Date(bucket.reset_at).getTime() - now.getTime()) / 1e3));
        res.setHeader("Retry-After", retryAfterSec);
        res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
        return;
      }
      next();
    } catch (err) {
      console.error("[PG RATE LIMIT ERROR]", err);
      next();
    }
  };
}
async function zkVerifyHandler(req, res) {
  const { contractId } = req.params;
  if (!contractId || typeof contractId !== "string") {
    res.status(400).json({ error: "contractId is required" });
    return;
  }
  const rows = await db.execute(sql2`
    SELECT
      proof_id, contract_id, version_number, content_hash, prev_hash,
      status, total_pct, is_valid, is_finalized, is_contested,
      signature_count, collaborator_count, signed_at, locked_at, lock_expires_at
    FROM zk_ownership_proofs
    WHERE contract_id = ${contractId}
    ORDER BY version_number DESC
    LIMIT 1
  `);
  if (!rows.rows.length) {
    res.status(404).json({ error: "Contract not found or not yet finalized" });
    return;
  }
  const proof = rows.rows[0];
  const chainResult = await verifyHashChain(contractId);
  await auditLog({
    apiKeyId: req.apiKeyId,
    action: "raas.verify_ownership",
    resourceType: "contract",
    resourceId: contractId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    requestId: req.requestId
  });
  res.json({
    proof: {
      proofId: proof.proof_id,
      contractId: proof.contract_id,
      versionNumber: proof.version_number,
      contentHash: proof.content_hash,
      prevHash: proof.prev_hash,
      status: proof.status,
      isValid: proof.is_valid,
      isFinalized: proof.is_finalized,
      isContested: proof.is_contested,
      signatureCount: Number(proof.signature_count),
      collaboratorCount: Number(proof.collaborator_count),
      signedAt: proof.signed_at,
      lockedAt: proof.locked_at,
      lockExpiresAt: proof.lock_expires_at
    },
    chain: {
      intact: chainResult.valid,
      versions: chainResult.versions,
      brokenAt: chainResult.brokenAt ?? null
    },
    // Cryptographic proof that this response itself is untampered
    responseHash: sha256(JSON.stringify({ contractId, contentHash: proof.content_hash, ts: Date.now() }))
  });
}
async function openDispute(userId, data, req) {
  const parsed = disputeSchema.parse(data);
  await db.execute(sql2`
    UPDATE split_versions SET status = 'disputed'
    WHERE id = ${parsed.splitVersionId}
      AND contract_id = ${parsed.contractId}
      AND status NOT IN ('voided', 'disputed')
  `);
  const result = await db.execute(sql2`
    INSERT INTO disputes
      (contract_id, split_version_id, raised_by, dispute_type, description, freeze_payouts)
    VALUES
      (${parsed.contractId}, ${parsed.splitVersionId}::uuid,
       ${userId}, ${parsed.disputeType}, ${parsed.description}, TRUE)
    RETURNING id
  `);
  const disputeId = result.rows[0].id;
  await db.execute(sql2`
    INSERT INTO dispute_transitions (dispute_id, from_status, to_status, actor_id)
    VALUES (${disputeId}::uuid, NULL, 'open', ${userId})
  `);
  await auditLog({
    userId,
    action: "dispute.open",
    resourceType: "dispute",
    resourceId: disputeId,
    afterState: parsed,
    ipAddress: req.ip,
    requestId: req.requestId
  });
  return { disputeId };
}
async function resolveDispute(disputeId, adminId, resolution, notes, req) {
  const toStatus = resolution === "accepted" ? "resolved_accepted" : "resolved_rejected";
  const rows = await db.execute(sql2`
    SELECT status, contract_id, split_version_id FROM disputes
    WHERE id = ${disputeId}::uuid LIMIT 1
  `);
  const dispute = rows.rows[0];
  if (!dispute) throw new Error("Dispute not found");
  await db.execute(sql2`
    UPDATE disputes SET
      status           = ${toStatus},
      assigned_to      = ${adminId},
      resolution_notes = ${notes},
      resolved_at      = NOW(),
      updated_at       = NOW()
    WHERE id = ${disputeId}::uuid
  `);
  await db.execute(sql2`
    INSERT INTO dispute_transitions (dispute_id, from_status, to_status, actor_id, note)
    VALUES (${disputeId}::uuid, ${dispute.status}, ${toStatus}, ${adminId}, ${notes})
  `);
  if (resolution === "accepted") {
    await db.execute(sql2`
      UPDATE split_versions SET status = 'signed'
      WHERE id = ${dispute.split_version_id}::uuid AND status = 'disputed'
    `);
  }
  await auditLog({
    userId: adminId,
    action: `dispute.${toStatus}`,
    resourceType: "dispute",
    resourceId: disputeId,
    ipAddress: req.ip,
    requestId: req.requestId
  });
}
function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Stripe.js must be loaded from js.stripe.com to tokenize card data
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Stripe Elements renders card fields inside an iframe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Stripe.js calls out to api.stripe.com to confirm payments
      "connect-src 'self' https://api.stripe.com",
      "img-src 'self' data: https:"
    ].join("; ") + ";"
  );
  next();
}
function sanitizeString(input, maxLen = 1e3) {
  if (typeof input !== "string") return "";
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/javascript:/gi, "").trim().slice(0, maxLen);
}
function sanitizeObject(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") out[k] = sanitizeString(v);
    else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = sanitizeObject(v);
    } else out[k] = v;
  }
  return out;
}
var collaboratorSchema, splitSheetSchema, VALID_TRANSITIONS, inMemoryBuckets, disputeSchema, sanitizeMiddleware;
var init_security = __esm({
  "server/security.ts"() {
    "use strict";
    init_db();
    collaboratorSchema = z2.object({
      userId: z2.string().optional(),
      name: z2.string().min(1).max(200),
      email: z2.string().email(),
      role: z2.enum(["writer", "producer", "performer", "co-writer", "publisher", "manager"]),
      ownershipPercentage: z2.number().min(0.01).max(99.99),
      proAffiliation: z2.string().optional(),
      ipiNumber: z2.string().regex(/^\d{9}$/).optional().or(z2.literal(""))
    });
    splitSheetSchema = z2.object({
      contractId: z2.string().uuid(),
      collaborators: z2.array(collaboratorSchema).min(2).max(20)
    }).refine(
      (d) => {
        const total = d.collaborators.reduce((s, c) => s + c.ownershipPercentage, 0);
        return Math.abs(total - 100) < 0.01;
      },
      { message: "Ownership percentages must sum to exactly 100%." }
    );
    VALID_TRANSITIONS = {
      draft: ["pending_signatures", "voided"],
      pending_signatures: ["signed", "voided", "disputed"],
      signed: ["locked", "disputed"],
      locked: ["disputed"],
      // only disputes can reopen a locked split
      disputed: ["signed", "voided"],
      // after dispute resolution
      voided: []
      // terminal
    };
    inMemoryBuckets = /* @__PURE__ */ new Map();
    disputeSchema = z2.object({
      contractId: z2.string().uuid(),
      splitVersionId: z2.string().uuid(),
      disputeType: z2.enum([
        "unauthorized_change",
        "wrong_percentage",
        "missing_collaborator",
        "fraud",
        "other"
      ]),
      description: z2.string().min(10).max(2e3)
    });
    sanitizeMiddleware = (req, _res, next) => {
      if (req.body && typeof req.body === "object") {
        req.body = sanitizeObject(req.body);
      }
      next();
    };
  }
});

// server/message-crypto.ts
function getMessageEncryptionSecret() {
  const secret = process.env.FIELD_ENCRYPTION_SECRET || process.env.SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(
      "FIELD_ENCRYPTION_SECRET is required in production for encrypted messaging"
    );
  }
  return secret || "dev-message-encryption-key-change-me";
}
function encryptMessageContent(plaintext) {
  const encrypted = encryptField(plaintext, getMessageEncryptionSecret());
  return `${ENC_PREFIX}${encrypted}`;
}
function decryptMessageContent(stored) {
  if (!stored.startsWith(ENC_PREFIX)) {
    return stored;
  }
  try {
    return decryptField(stored.slice(ENC_PREFIX.length), getMessageEncryptionSecret());
  } catch {
    return "[Unable to decrypt message]";
  }
}
var ENC_PREFIX;
var init_message_crypto = __esm({
  "server/message-crypto.ts"() {
    "use strict";
    init_security();
    ENC_PREFIX = "enc:v1:";
  }
});

// server/storage.ts
import { eq, desc, and, or, sql as sql3, count, gte, lt, max } from "drizzle-orm";
var DatabaseStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    init_db();
    init_message_crypto();
    DatabaseStorage = class {
      // User operations
      async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      }
      async getUserByStripeCustomerId(stripeCustomerId) {
        const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
        return user;
      }
      async upsertUser(userData) {
        const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        return user;
      }
      async updateUser(id, updates) {
        const [user] = await db.update(users).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, id)).returning();
        return user;
      }
      async updateUserStripeInfo(userId, stripeCustomerId, stripeSubscriptionId) {
        const [user] = await db.update(users).set({
          stripeCustomerId,
          stripeSubscriptionId,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, userId)).returning();
        return user;
      }
      // Contract template operations
      async getContractTemplates() {
        return await db.select().from(contractTemplates).where(eq(contractTemplates.isActive, true)).orderBy(contractTemplates.name);
      }
      async getContractTemplate(id) {
        const [template] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id));
        return template;
      }
      async createContractTemplate(template) {
        const [newTemplate] = await db.insert(contractTemplates).values(template).returning();
        return newTemplate;
      }
      // Contract operations
      async getContracts(userId) {
        return await db.select().from(contracts).where(
          or(
            eq(contracts.createdBy, userId)
            // TODO: Add join for collaborators
          )
        ).orderBy(desc(contracts.updatedAt));
      }
      async getContract(id) {
        const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
        return contract;
      }
      async createContract(contract) {
        const [newContract] = await db.insert(contracts).values(contract).returning();
        return newContract;
      }
      async updateContract(id, updates) {
        const [updatedContract] = await db.update(contracts).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(contracts.id, id)).returning();
        return updatedContract;
      }
      async deleteContract(id) {
        await db.delete(contracts).where(eq(contracts.id, id));
      }
      // Contract collaborator operations
      async getContractCollaborators(contractId) {
        return await db.select().from(contractCollaborators).where(eq(contractCollaborators.contractId, contractId));
      }
      async addContractCollaborator(collaborator) {
        const [newCollaborator] = await db.insert(contractCollaborators).values(collaborator).returning();
        return newCollaborator;
      }
      async updateCollaboratorStatus(id, status) {
        const [updatedCollaborator] = await db.update(contractCollaborators).set({
          status,
          signedAt: status === "signed" ? /* @__PURE__ */ new Date() : null
        }).where(eq(contractCollaborators.id, id)).returning();
        return updatedCollaborator;
      }
      async updateContractCollaborator(id, updates) {
        const [updated] = await db.update(contractCollaborators).set(updates).where(eq(contractCollaborators.id, id)).returning();
        return updated;
      }
      async deleteContractCollaborator(id) {
        await db.delete(contractCollaborators).where(eq(contractCollaborators.id, id));
      }
      // Contract signature operations
      async createContractSignature(signature) {
        const [newSignature] = await db.insert(contractSignatures).values(signature).returning();
        return newSignature;
      }
      async getContractSignatures(contractId) {
        return await db.select().from(contractSignatures).where(eq(contractSignatures.contractId, contractId));
      }
      // Analytics operations
      async getAnalyticsData(userId) {
        const now = /* @__PURE__ */ new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
        const today = new Date(now.toDateString());
        const isUserScoped = !!userId;
        let totalUsers, activeUsers, newUsersToday, userGrowthRate;
        if (isUserScoped) {
          totalUsers = 1;
          const userActivityResult = await db.select({ count: count() }).from(userActivity).where(
            and(
              eq(userActivity.userId, userId),
              gte(userActivity.createdAt, sevenDaysAgo)
            )
          );
          activeUsers = userActivityResult[0]?.count > 0 ? 1 : 0;
          const userCreatedResult = await db.select({ createdAt: users.createdAt }).from(users).where(eq(users.id, userId));
          const userCreatedAt = userCreatedResult[0]?.createdAt;
          newUsersToday = userCreatedAt && userCreatedAt >= today ? 1 : 0;
          userGrowthRate = 0;
        } else {
          const totalUsersResult = await db.select({ count: count() }).from(users);
          totalUsers = totalUsersResult[0]?.count || 0;
          const activeUsersResult = await db.selectDistinct({ userId: userActivity.userId }).from(userActivity).where(gte(userActivity.createdAt, sevenDaysAgo));
          activeUsers = activeUsersResult.length;
          const newUsersTodayResult = await db.select({ count: count() }).from(users).where(gte(users.createdAt, today));
          newUsersToday = newUsersTodayResult[0]?.count || 0;
          const previousMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1e3);
          const startOfCurrentMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
          const previousMonthResult = await db.select({ count: count() }).from(users).where(
            and(
              gte(users.createdAt, previousMonth),
              lt(users.createdAt, startOfCurrentMonth)
            )
          );
          const previousMonthUsers = previousMonthResult[0]?.count || 0;
          const currentMonthResult = await db.select({ count: count() }).from(users).where(gte(users.createdAt, startOfCurrentMonth));
          const currentMonthUsers = currentMonthResult[0]?.count || 0;
          userGrowthRate = previousMonthUsers > 0 ? Math.round((currentMonthUsers - previousMonthUsers) / previousMonthUsers * 100) : 0;
        }
        const thirtyDaysAgoStr = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
        let dailyLoginsData, profileViewsData;
        if (isUserScoped) {
          dailyLoginsData = await db.select({
            date: sql3`DATE(${userActivity.createdAt})`,
            logins: count()
          }).from(userActivity).where(
            and(
              eq(userActivity.userId, userId),
              eq(userActivity.activityType, "login"),
              gte(userActivity.createdAt, thirtyDaysAgo)
            )
          ).groupBy(sql3`DATE(${userActivity.createdAt})`).orderBy(sql3`DATE(${userActivity.createdAt})`);
          profileViewsData = await db.select({
            date: sql3`DATE(${profileViews.viewedAt})`,
            views: count()
          }).from(profileViews).where(
            and(
              eq(profileViews.profileId, userId),
              gte(profileViews.viewedAt, thirtyDaysAgo)
            )
          ).groupBy(sql3`DATE(${profileViews.viewedAt})`).orderBy(sql3`DATE(${profileViews.viewedAt})`);
        } else {
          dailyLoginsData = await db.select({
            date: sql3`DATE(${userActivity.createdAt})`,
            logins: sql3`COUNT(DISTINCT ${userActivity.userId})`
          }).from(userActivity).where(
            and(
              eq(userActivity.activityType, "login"),
              gte(userActivity.createdAt, thirtyDaysAgo)
            )
          ).groupBy(sql3`DATE(${userActivity.createdAt})`).orderBy(sql3`DATE(${userActivity.createdAt})`);
          profileViewsData = await db.select({
            date: sql3`DATE(${profileViews.viewedAt})`,
            views: count()
          }).from(profileViews).where(gte(profileViews.viewedAt, thirtyDaysAgo)).groupBy(sql3`DATE(${profileViews.viewedAt})`).orderBy(sql3`DATE(${profileViews.viewedAt})`);
        }
        const dailyLoginsMap = new Map(dailyLoginsData.map((d) => [d.date, Number(d.logins)]));
        const profileViewsMap = new Map(profileViewsData.map((d) => [d.date, Number(d.views)]));
        const dailyLogins = [];
        const profileViewsDaily = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1e3);
          const dateStr = date.toISOString().split("T")[0];
          dailyLogins.push({
            date: dateStr,
            logins: dailyLoginsMap.get(dateStr) || 0
          });
          profileViewsDaily.push({
            date: dateStr,
            views: profileViewsMap.get(dateStr) || 0
          });
        }
        const usersWithProfiles = await db.select({
          id: users.id,
          bio: users.bio,
          skills: users.skills,
          profileImageUrl: users.profileImageUrl,
          contactInfo: users.contactInfo
        }).from(users);
        const profileCompleteness = [
          { range: "0-25%", count: 0, color: "#ff6b6b" },
          { range: "26-50%", count: 0, color: "#feca57" },
          { range: "51-75%", count: 0, color: "#48dbfb" },
          { range: "76-100%", count: 0, color: "#1dd1a1" }
        ];
        usersWithProfiles.forEach((user) => {
          let completeness = 0;
          if (user.bio) completeness += 25;
          if (user.skills && user.skills.length > 0) completeness += 25;
          if (user.profileImageUrl) completeness += 25;
          if (user.contactInfo && user.contactInfo?.phone) completeness += 25;
          if (completeness <= 25) profileCompleteness[0].count++;
          else if (completeness <= 50) profileCompleteness[1].count++;
          else if (completeness <= 75) profileCompleteness[2].count++;
          else profileCompleteness[3].count++;
        });
        const skillCounts = {};
        usersWithProfiles.forEach((user) => {
          if (user.skills && Array.isArray(user.skills)) {
            user.skills.forEach((skill) => {
              skillCounts[skill] = (skillCounts[skill] || 0) + 1;
            });
          }
        });
        const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count2]) => ({ skill, count: count2 }));
        const locationCounts = {};
        usersWithProfiles.forEach((user) => {
          if (user.contactInfo && user.contactInfo?.location) {
            const location = user.contactInfo.location;
            locationCounts[location] = (locationCounts[location] || 0) + 1;
          }
        });
        const usersByLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([location, count2]) => ({ location, count: count2 }));
        return {
          userStats: {
            totalUsers,
            activeUsers,
            newUsersToday,
            userGrowthRate
          },
          activityStats: {
            dailyLogins,
            profileViews: profileViewsDaily,
            messagesSent: []
            // TODO: Implement when messaging system is built
          },
          userEngagement: {
            profileCompleteness,
            topSkills,
            usersByLocation
          }
        };
      }
      async trackUserActivity(userId, activityType, activityData) {
        await db.insert(userActivity).values({
          userId,
          activityType,
          activityData: activityData ? activityData : null
        });
      }
      async trackUserActivitiesBulk(userId, activities) {
        if (activities.length === 0) return;
        const activityRecords = activities.map((activity) => ({
          userId,
          activityType: activity.activityType,
          activityData: activity.activityData ? activity.activityData : null
        }));
        await db.insert(userActivity).values(activityRecords);
      }
      async trackProfileView(viewerId, profileId) {
        await db.insert(profileViews).values({
          viewerId,
          profileId
        });
      }
      // User matching methods
      async getUserRecommendations(userId, limit = 10) {
        const currentUser = await this.getUser(userId);
        if (!currentUser) return [];
        const allUsers = await db.select().from(users).where(and(
          eq(users.isActive, true),
          sql3`${users.id} != ${userId}`
        ));
        const recommendations = allUsers.map((user) => {
          const currentSkills = currentUser.skills || [];
          const userSkills = user.skills || [];
          const commonSkills = currentSkills.filter((skill) => userSkills.includes(skill));
          const skillScore = commonSkills.length / Math.max(currentSkills.length, userSkills.length, 1);
          const randomScore = Math.random() * 0.3;
          const matchScore = Math.min(skillScore + randomScore, 1);
          const matchReason = commonSkills.length > 0 ? `Shared skills: ${commonSkills.slice(0, 3).join(", ")}` : "Similar profile interests";
          return {
            ...user,
            matchScore: Math.round(matchScore * 100) / 100,
            matchReason
          };
        }).sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
        return recommendations;
      }
      async createUserMatch(userId, matchedUserId, matchScore, matchReason) {
        const [match] = await db.insert(userMatches).values({
          userId,
          matchedUserId,
          matchScore: matchScore.toString(),
          matchReason,
          status: "suggested"
        }).returning();
        return match;
      }
      async updateMatchStatus(matchId, status) {
        await db.update(userMatches).set({ status }).where(eq(userMatches.id, matchId));
      }
      async getUserMatches(userId, status) {
        const conditions = [eq(userMatches.userId, userId)];
        if (status) {
          conditions.push(eq(userMatches.status, status));
        }
        return await db.select({
          match: userMatches,
          user: users
        }).from(userMatches).leftJoin(users, eq(userMatches.matchedUserId, users.id)).where(and(...conditions)).orderBy(desc(userMatches.createdAt));
      }
      // Messaging methods
      async sendMessage(senderId, receiverId, content, messageType = "text") {
        const encryptedContent = encryptMessageContent(content);
        const [message] = await db.insert(messages).values({
          senderId,
          receiverId,
          content: encryptedContent,
          messageType
        }).returning();
        await this.trackUserActivity(senderId, "message_sent", { receiverId });
        return { ...message, content };
      }
      decryptMessageRow(row) {
        return { ...row, content: decryptMessageContent(row.content) };
      }
      async getConversation(userId1, userId2, limit = 50) {
        const rows = await db.select().from(messages).where(
          or(
            and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
            and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
          )
        ).orderBy(desc(messages.createdAt)).limit(limit);
        return rows.map((row) => this.decryptMessageRow(row));
      }
      async getUserConversations(userId) {
        const conversations = await db.select({
          message: messages,
          sender: {
            id: sql3`sender.id`,
            firstName: sql3`sender.first_name`,
            lastName: sql3`sender.last_name`,
            profileImageUrl: sql3`sender.profile_image_url`
          },
          receiver: {
            id: sql3`receiver.id`,
            firstName: sql3`receiver.first_name`,
            lastName: sql3`receiver.last_name`,
            profileImageUrl: sql3`receiver.profile_image_url`
          }
        }).from(messages).leftJoin(sql3`users AS sender`, sql3`sender.id = ${messages.senderId}`).leftJoin(sql3`users AS receiver`, sql3`receiver.id = ${messages.receiverId}`).where(
          or(
            eq(messages.senderId, userId),
            eq(messages.receiverId, userId)
          )
        ).orderBy(desc(messages.createdAt));
        const unreadRows = await db.select({
          senderId: messages.senderId,
          count: sql3`count(*)::int`
        }).from(messages).where(and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        )).groupBy(messages.senderId);
        const unreadMap = new Map(unreadRows.map((r) => [r.senderId, r.count]));
        const conversationMap = /* @__PURE__ */ new Map();
        conversations.forEach((conv) => {
          const partnerId = conv.message.senderId === userId ? conv.message.receiverId : conv.message.senderId;
          const partner = conv.message.senderId === userId ? conv.receiver : conv.sender;
          if (!conversationMap.has(partnerId)) {
            conversationMap.set(partnerId, {
              partner,
              latestMessage: this.decryptMessageRow(conv.message),
              unreadCount: unreadMap.get(partnerId) ?? 0
            });
          }
        });
        return Array.from(conversationMap.values());
      }
      async getUnreadMessageCount(userId) {
        const [row] = await db.select({ count: sql3`count(*)::int` }).from(messages).where(and(
          eq(messages.receiverId, userId),
          eq(messages.isRead, false)
        ));
        return row?.count ?? 0;
      }
      async markMessagesAsRead(userId, senderId) {
        await db.update(messages).set({ isRead: true }).where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.senderId, senderId),
            eq(messages.isRead, false)
          )
        );
      }
      // Notification methods
      async createNotification(userId, title, content, type, actionUrl) {
        const [notification] = await db.insert(notifications).values({
          userId,
          title,
          content,
          type,
          actionUrl
        }).returning();
        return notification;
      }
      async getUserNotifications(userId, unreadOnly = false) {
        const conditions = [eq(notifications.userId, userId)];
        if (unreadOnly) {
          conditions.push(eq(notifications.isRead, false));
        }
        return await db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt));
      }
      async markNotificationAsRead(notificationId) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, notificationId));
      }
      async markAllNotificationsAsRead(userId) {
        await db.update(notifications).set({ isRead: true }).where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );
      }
      // Negotiation methods
      async getNegotiations(userId) {
        return await db.select().from(negotiations).where(
          or(
            eq(negotiations.createdBy, userId),
            sql3`${userId} = ANY(${negotiations.participants})`
          )
        ).orderBy(desc(negotiations.createdAt));
      }
      async getNegotiation(id) {
        const [negotiation] = await db.select().from(negotiations).where(eq(negotiations.id, id));
        return negotiation;
      }
      async createNegotiation(negotiationData) {
        const [negotiation] = await db.insert(negotiations).values(negotiationData).returning();
        return negotiation;
      }
      async updateNegotiation(id, updates) {
        const [negotiation] = await db.update(negotiations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(negotiations.id, id)).returning();
        return negotiation;
      }
      async getNegotiationConversations(negotiationId) {
        return await db.select().from(negotiationConversations).where(eq(negotiationConversations.negotiationId, negotiationId)).orderBy(desc(negotiationConversations.createdAt));
      }
      async addNegotiationConversation(conversationData) {
        const [conversation] = await db.insert(negotiationConversations).values(conversationData).returning();
        return conversation;
      }
      // ─── OWNERSHIP LEDGER ────────────────────────────────────────────────────
      async createSongAsset(asset) {
        const [newAsset] = await db.insert(songAssets).values(asset).returning();
        return newAsset;
      }
      async getSongAssets(userId) {
        return await db.select().from(songAssets).where(and(eq(songAssets.createdBy, userId), eq(songAssets.status, "active"))).orderBy(desc(songAssets.createdAt));
      }
      async getSongAsset(id) {
        const [asset] = await db.select().from(songAssets).where(eq(songAssets.id, id));
        return asset;
      }
      async getSongAssetBySlSongId(slSongId) {
        const [asset] = await db.select().from(songAssets).where(eq(songAssets.slSongId, slSongId));
        return asset;
      }
      async getSongAssetsByContract(contractId) {
        return await db.select().from(songAssets).where(eq(songAssets.contractId, contractId)).orderBy(desc(songAssets.createdAt));
      }
      async updateSongAsset(id, updates) {
        const [asset] = await db.update(songAssets).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(songAssets.id, id)).returning();
        return asset;
      }
      async createOwnershipRecord(record) {
        const [newRecord] = await db.insert(ownershipRecords).values(record).returning();
        return newRecord;
      }
      // Return the latest version of each stakeholder's ownership for a given asset
      async getCurrentOwnership(assetId) {
        const latestVersion = await db.select({ maxVersion: max(ownershipRecords.version) }).from(ownershipRecords).where(eq(ownershipRecords.assetId, assetId));
        const maxV = latestVersion[0]?.maxVersion ?? 0;
        if (!maxV) return [];
        return await db.select().from(ownershipRecords).where(and(eq(ownershipRecords.assetId, assetId), eq(ownershipRecords.version, maxV))).orderBy(desc(ownershipRecords.ownershipPercentage));
      }
      // Current ownership joined with stakeholder display names/emails (for exports, CWR, UI)
      async getCurrentOwnershipWithNames(assetId) {
        const ownership = await this.getCurrentOwnership(assetId);
        const rows = await Promise.all(
          ownership.map(async (o) => {
            const user = await this.getUser(o.userId).catch(() => void 0);
            const name = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || o.userId.slice(0, 8) : o.userId.slice(0, 8);
            return { ...o, name, email: user?.email ?? null };
          })
        );
        return rows;
      }
      // Full immutable audit trail — every version of every ownership change
      async getOwnershipHistory(assetId) {
        return await db.select().from(ownershipRecords).where(eq(ownershipRecords.assetId, assetId)).orderBy(desc(ownershipRecords.version), desc(ownershipRecords.createdAt));
      }
      // Append a new version for all stakeholders (never overwrites)
      async updateOwnershipSplit(assetId, splits, changedBy, changeReason) {
        const total = splits.reduce((sum, s) => sum + parseFloat(s.ownershipPercentage), 0);
        if (Math.abs(total - 100) > 0.01) {
          throw new Error(`Ownership must total 100%. Current total: ${total.toFixed(2)}%`);
        }
        const latestVersion = await db.select({ maxVersion: max(ownershipRecords.version) }).from(ownershipRecords).where(eq(ownershipRecords.assetId, assetId));
        const nextVersion = (latestVersion[0]?.maxVersion ?? 0) + 1;
        const newRecords = splits.map((s) => ({
          assetId,
          userId: s.userId,
          ownershipPercentage: s.ownershipPercentage,
          role: s.role,
          version: nextVersion,
          changeReason: changeReason ?? null,
          createdBy: changedBy,
          effectiveAt: /* @__PURE__ */ new Date()
        }));
        return await db.insert(ownershipRecords).values(newRecords).returning();
      }
      // ─── REVENUE & PAYOUTS ────────────────────────────────────────────────────
      async recordRevenueEvent(event) {
        const [newEvent] = await db.insert(revenueEvents).values(event).returning();
        return newEvent;
      }
      async getRevenueEvents(assetId) {
        return await db.select().from(revenueEvents).where(eq(revenueEvents.assetId, assetId)).orderBy(desc(revenueEvents.createdAt));
      }
      async getPayoutRecordsByRevenueEvent(revenueEventId) {
        return await db.select().from(payoutRecords).where(eq(payoutRecords.revenueEventId, revenueEventId)).orderBy(desc(payoutRecords.createdAt));
      }
      // Calculate (but do not execute) payout splits based on current ownership
      async calculatePayouts(revenueEventId) {
        const [event] = await db.select().from(revenueEvents).where(eq(revenueEvents.id, revenueEventId));
        if (!event) throw new Error("Revenue event not found");
        const ownership = await this.getCurrentOwnership(event.assetId);
        const totalAmount = parseFloat(event.amount);
        return ownership.map((o) => ({
          id: "preview",
          revenueEventId,
          userId: o.userId,
          assetId: event.assetId,
          ownershipPercentage: o.ownershipPercentage,
          amount: (parseFloat(o.ownershipPercentage) / 100 * totalAmount).toFixed(2),
          currency: event.currency ?? "USD",
          status: "pending",
          stripeTransferId: null,
          processedAt: null,
          createdAt: /* @__PURE__ */ new Date()
        }));
      }
      // Execute payouts — persist payout records and update user balances
      async executePayouts(revenueEventId) {
        const previews = await this.calculatePayouts(revenueEventId);
        if (!previews.length) return [];
        const toInsert = previews.map(({ id: _id, ...rest }) => rest);
        const saved = await db.insert(payoutRecords).values(toInsert).returning();
        for (const payout of saved) {
          const amount = parseFloat(payout.amount);
          const existing = await db.select().from(userBalances).where(eq(userBalances.userId, payout.userId));
          if (existing.length > 0) {
            const current = existing[0];
            await db.update(userBalances).set({
              totalEarned: (parseFloat(current.totalEarned) + amount).toFixed(2),
              pendingBalance: (parseFloat(current.pendingBalance) + amount).toFixed(2),
              updatedAt: /* @__PURE__ */ new Date()
            }).where(eq(userBalances.userId, payout.userId));
          } else {
            await db.insert(userBalances).values({
              userId: payout.userId,
              totalEarned: amount.toFixed(2),
              totalPaid: "0",
              pendingBalance: amount.toFixed(2),
              currency: payout.currency ?? "USD",
              updatedAt: /* @__PURE__ */ new Date()
            });
          }
        }
        return saved;
      }
      async getUserEarnings(userId) {
        const [balance] = await db.select().from(userBalances).where(eq(userBalances.userId, userId));
        return balance ?? null;
      }
      async getUserPayouts(userId) {
        return await db.select().from(payoutRecords).where(eq(payoutRecords.userId, userId)).orderBy(desc(payoutRecords.createdAt));
      }
      // Confirmation methods
      async getConfirmationByToken(token) {
        const [confirmation] = await db.select().from(confirmations).where(eq(confirmations.token, token));
        return confirmation;
      }
      async getConfirmationsByContract(contractId) {
        return await db.select().from(confirmations).where(eq(confirmations.contractId, contractId));
      }
      async createConfirmation(confirmation) {
        const [newConfirmation] = await db.insert(confirmations).values(confirmation).returning();
        return newConfirmation;
      }
      async updateConfirmation(id, updates) {
        const [updatedConfirmation] = await db.update(confirmations).set({
          ...updates,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(confirmations.id, id)).returning();
        return updatedConfirmation;
      }
      // ─── ORGANIZATIONS — enterprise multi-tenant workspaces ───────────────────
      async getOrganizationsForUser(userId) {
        const rows = await db.select({ organization: organizations }).from(organizationMembers).innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id)).where(eq(organizationMembers.userId, userId)).orderBy(desc(organizations.createdAt));
        return rows.map((r) => r.organization);
      }
      async getOrganization(id) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
        return org;
      }
      async getOrganizationBySlOrgId(slOrgId) {
        const [org] = await db.select().from(organizations).where(eq(organizations.slOrgId, slOrgId));
        return org;
      }
      async createOrganization(org) {
        const [newOrg] = await db.insert(organizations).values(org).returning();
        return newOrg;
      }
      async updateOrganization(id, updates) {
        const [updated] = await db.update(organizations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(organizations.id, id)).returning();
        return updated;
      }
      // Organization membership (RBAC)
      async getOrganizationMembers(organizationId) {
        return await db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId)).orderBy(organizationMembers.createdAt);
      }
      async getOrganizationMember(organizationId, userId) {
        const [member] = await db.select().from(organizationMembers).where(
          and(
            eq(organizationMembers.organizationId, organizationId),
            eq(organizationMembers.userId, userId)
          )
        );
        return member;
      }
      async addOrganizationMember(member) {
        const [newMember] = await db.insert(organizationMembers).values(member).returning();
        return newMember;
      }
      async updateOrganizationMemberRole(id, role) {
        const [updated] = await db.update(organizationMembers).set({ role }).where(eq(organizationMembers.id, id)).returning();
        return updated;
      }
      async removeOrganizationMember(id) {
        await db.delete(organizationMembers).where(eq(organizationMembers.id, id));
      }
      // Organization-scoped API keys
      async getOrganizationApiKeys(organizationId) {
        return await db.select().from(organizationApiKeys).where(eq(organizationApiKeys.organizationId, organizationId)).orderBy(desc(organizationApiKeys.createdAt));
      }
      async createOrganizationApiKey(key) {
        const [newKey] = await db.insert(organizationApiKeys).values(key).returning();
        return newKey;
      }
      async revokeOrganizationApiKey(id, organizationId) {
        await db.update(organizationApiKeys).set({ revokedAt: /* @__PURE__ */ new Date() }).where(
          and(
            eq(organizationApiKeys.id, id),
            eq(organizationApiKeys.organizationId, organizationId)
          )
        );
      }
      // ─── GLOBAL RIGHTS FRAMEWORK ───────────────────────────────────────────────
      async getRightsOrganizations(territory) {
        const query = db.select().from(rightsOrganizations);
        if (territory) {
          return await query.where(eq(rightsOrganizations.territory, territory)).orderBy(rightsOrganizations.name);
        }
        return await query.orderBy(rightsOrganizations.territory, rightsOrganizations.name);
      }
      async getCreators(createdBy) {
        return await db.select().from(creators).where(eq(creators.createdBy, createdBy)).orderBy(desc(creators.createdAt));
      }
      async getCreator(id) {
        const [creator] = await db.select().from(creators).where(eq(creators.id, id));
        return creator;
      }
      async getCreatorBySlCreatorId(slCreatorId) {
        const [creator] = await db.select().from(creators).where(eq(creators.slCreatorId, slCreatorId));
        return creator;
      }
      async createCreator(creator) {
        const [newCreator] = await db.insert(creators).values(creator).returning();
        return newCreator;
      }
      async updateCreator(id, updates) {
        const [updated] = await db.update(creators).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(creators.id, id)).returning();
        return updated;
      }
      async deleteCreator(id) {
        await db.delete(creators).where(eq(creators.id, id));
      }
      async getCreatorRightsProfile(userId) {
        const [profile] = await db.select().from(creatorRightsProfiles).where(eq(creatorRightsProfiles.userId, userId));
        return profile;
      }
      async upsertCreatorRightsProfile(userId, profile) {
        const [updated] = await db.insert(creatorRightsProfiles).values({ ...profile, userId }).onConflictDoUpdate({
          target: creatorRightsProfiles.userId,
          set: { ...profile, updatedAt: /* @__PURE__ */ new Date() }
        }).returning();
        return updated;
      }
      // ─── MASTER VS COMPOSITION RIGHTS ──────────────────────────────────────────
      async getCompositionAsset(songAssetId) {
        const [asset] = await db.select().from(compositionAssets).where(eq(compositionAssets.songAssetId, songAssetId));
        return asset;
      }
      async upsertCompositionAsset(songAssetId, data) {
        const [asset] = await db.insert(compositionAssets).values({ ...data, songAssetId }).onConflictDoUpdate({
          target: compositionAssets.songAssetId,
          set: { ...data, updatedAt: /* @__PURE__ */ new Date() }
        }).returning();
        return asset;
      }
      async getMasterAsset(songAssetId) {
        const [asset] = await db.select().from(masterAssets).where(eq(masterAssets.songAssetId, songAssetId));
        return asset;
      }
      async upsertMasterAsset(songAssetId, data) {
        const [asset] = await db.insert(masterAssets).values({ ...data, songAssetId }).onConflictDoUpdate({
          target: masterAssets.songAssetId,
          set: { ...data, updatedAt: /* @__PURE__ */ new Date() }
        }).returning();
        return asset;
      }
      // ─── LICENSING READINESS SYSTEM ────────────────────────────────────────────
      async getLicenseReadiness(songAssetId) {
        const [readiness] = await db.select().from(licenseReadiness).where(eq(licenseReadiness.songAssetId, songAssetId));
        return readiness;
      }
      async upsertLicenseReadiness(songAssetId, data) {
        const [readiness] = await db.insert(licenseReadiness).values({ ...data, songAssetId }).onConflictDoUpdate({
          target: licenseReadiness.songAssetId,
          set: { ...data, lastCheckedAt: /* @__PURE__ */ new Date() }
        }).returning();
        return readiness;
      }
      // ─── RIGHTS CHANGE HISTORY (reuses the existing audit_log table — see
      // .agents/memory/identity-layer.md for why no separate table was created) ──
      async getRightsChangeHistory(songAssetId, relatedIds = []) {
        const ids = [songAssetId, ...relatedIds];
        const idList = sql3.join(
          ids.map((id) => sql3`${id}`),
          sql3`, `
        );
        const result = await db.execute(sql3`
      SELECT id, user_id, action, resource_type, resource_id, before_state, after_state, created_at
      FROM audit_log
      WHERE resource_id IN (${idList})
        AND resource_type IN ('ownership_record', 'composition_asset', 'master_asset', 'song_asset')
      ORDER BY created_at DESC
      LIMIT 100
    `);
        return result.rows;
      }
      // ─── LEGAL DOCUMENT VERSIONING & ACCEPTANCE (Priority 1.1) ───────────────
      async getLatestLegalDocument(docType) {
        const [doc] = await db.select().from(legalDocuments).where(eq(legalDocuments.docType, docType)).orderBy(desc(legalDocuments.effectiveDate), desc(legalDocuments.publishedAt)).limit(1);
        return doc;
      }
      async getLegalDocumentHistory(docType) {
        return await db.select().from(legalDocuments).where(eq(legalDocuments.docType, docType)).orderBy(desc(legalDocuments.effectiveDate), desc(legalDocuments.publishedAt));
      }
      async createLegalDocument(doc) {
        const [created] = await db.insert(legalDocuments).values(doc).returning();
        return created;
      }
      async getLegalAcceptance(userId, docType) {
        const [acceptance] = await db.select().from(legalAcceptances).where(and(eq(legalAcceptances.userId, userId), eq(legalAcceptances.docType, docType))).orderBy(desc(legalAcceptances.acceptedAt)).limit(1);
        return acceptance;
      }
      async createLegalAcceptance(acceptance) {
        const [created] = await db.insert(legalAcceptances).values(acceptance).returning();
        return created;
      }
      // Admin methods
      async getAllUsers(page = 1, limit = 20, search = "") {
        const offset = (page - 1) * limit;
        if (search) {
          return await db.select().from(users).where(
            or(
              sql3`LOWER(${users.firstName}) LIKE LOWER(${"%" + search + "%"})`,
              sql3`LOWER(${users.lastName}) LIKE LOWER(${"%" + search + "%"})`,
              sql3`LOWER(${users.email}) LIKE LOWER(${"%" + search + "%"})`
            )
          ).offset(offset).limit(limit).orderBy(desc(users.createdAt));
        } else {
          return await db.select().from(users).offset(offset).limit(limit).orderBy(desc(users.createdAt));
        }
      }
      async getRecentActivity(limit = 50) {
        return await db.select({
          activity: userActivity,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        }).from(userActivity).leftJoin(users, eq(userActivity.userId, users.id)).orderBy(desc(userActivity.createdAt)).limit(limit);
      }
    };
    storage = new DatabaseStorage();
  }
});

// server/runtime.ts
function isVercelRuntime() {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}
function useLocalAuthProvider() {
  if (process.env.AUTH_PROVIDER === "local") return true;
  if (process.env.AUTH_PROVIDER === "replit" || process.env.AUTH_PROVIDER === "oidc") {
    return false;
  }
  return isVercelRuntime();
}
function shouldSkipBootMigrations() {
  return process.env.SKIP_BOOT_MIGRATIONS === "true" || isVercelRuntime();
}
var init_runtime = __esm({
  "server/runtime.ts"() {
    "use strict";
  }
});

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
function callbackUrlForDomain(domain) {
  const protocol = domain.startsWith("localhost") || domain.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${domain}/api/callback`;
}
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: databaseUrl2,
    // Serverless / fresh Neon: ensure sessions table exists
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || isVercelRuntime(),
      sameSite: "lax",
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  const existingUser = await storage.getUser(claims["sub"]);
  if (existingUser) {
    await storage.updateUser(claims["sub"], {
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"]
    });
  } else {
    await db.insert(users).values({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"]
    });
  }
}
async function setupLocalDevAuth(app) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  const devClaims = {
    sub: "local-dev-operator",
    email: "dev@localhost",
    first_name: "Local",
    last_name: "Operator",
    profile_image_url: null,
    exp: Math.floor(Date.now() / 1e3) + 60 * 60 * 24 * 365
  };
  app.get("/api/login", async (req, res) => {
    try {
      await upsertUser(devClaims);
      const user = {
        claims: devClaims,
        expires_at: devClaims.exp
      };
      req.login(user, (err) => {
        if (err) {
          console.error("[auth] local login failed:", err);
          res.status(500).json({ message: "Login failed" });
          return;
        }
        res.redirect("/");
      });
    } catch (err) {
      console.error("[auth] local login upsert failed:", err);
      res.status(500).json({
        message: "Login failed",
        detail: err instanceof Error ? err.message : String(err)
      });
    }
  });
  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });
}
async function setupAuth(app) {
  if (useLocalAuth) {
    console.log(
      "[auth] Using AUTH_PROVIDER=local (operator login via /api/login)"
    );
    await setupLocalDevAuth(app);
    return;
  }
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  const domains = process.env.REPLIT_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean) ?? [];
  if (domains.length === 0) {
    throw new Error(
      "REPLIT_DOMAINS must be set for Replit OIDC auth (comma-separated hostnames). Or set AUTH_PROVIDER=local for operator login on Vercel."
    );
  }
  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: callbackUrlForDomain(domain)
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isLocalDev, useLocalAuth, databaseUrl2, getOidcConfig, isAuthenticated;
var init_replitAuth = __esm({
  "server/replitAuth.ts"() {
    "use strict";
    init_storage();
    init_db();
    init_schema();
    init_runtime();
    isLocalDev = process.env.NODE_ENV === "development" && process.env.LOCAL_DEV === "true";
    useLocalAuth = isLocalDev || useLocalAuthProvider();
    databaseUrl2 = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
    getOidcConfig = memoize(
      async () => {
        return await client.discovery(
          new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
          process.env.REPL_ID
        );
      },
      { maxAge: 3600 * 1e3 }
    );
    isAuthenticated = async (req, res, next) => {
      const user = req.user;
      if (!req.isAuthenticated() || !user.expires_at) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const now = Math.floor(Date.now() / 1e3);
      if (now <= user.expires_at) {
        return next();
      }
      if (useLocalAuth) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const refreshToken = user.refresh_token;
      if (!refreshToken) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
    };
  }
});

// server/objectAcl.ts
function isPermissionAllowed(requested, granted) {
  if (requested === "read" /* READ */) {
    return ["read" /* READ */, "write" /* WRITE */].includes(granted);
  }
  return granted === "write" /* WRITE */;
}
function createObjectAccessGroup(group) {
  switch (group.type) {
    // Implement the case for each type of access group to instantiate.
    //
    // For example:
    // case "USER_LIST":
    //   return new UserListAccessGroup(group.id);
    // case "EMAIL_DOMAIN":
    //   return new EmailDomainAccessGroup(group.id);
    // case "GROUP_MEMBER":
    //   return new GroupMemberAccessGroup(group.id);
    // case "SUBSCRIBER":
    //   return new SubscriberAccessGroup(group.id);
    default:
      throw new Error(`Unknown access group type: ${group.type}`);
  }
}
async function setObjectAclPolicy(objectFile, aclPolicy) {
  const [exists] = await objectFile.exists();
  if (!exists) {
    throw new Error(`Object not found: ${objectFile.name}`);
  }
  await objectFile.setMetadata({
    metadata: {
      [ACL_POLICY_METADATA_KEY]: JSON.stringify(aclPolicy)
    }
  });
}
async function getObjectAclPolicy(objectFile) {
  const [metadata] = await objectFile.getMetadata();
  const aclPolicy = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  if (!aclPolicy) {
    return null;
  }
  return JSON.parse(aclPolicy);
}
async function canAccessObject({
  userId,
  objectFile,
  requestedPermission
}) {
  const aclPolicy = await getObjectAclPolicy(objectFile);
  if (!aclPolicy) {
    return false;
  }
  if (aclPolicy.visibility === "public" && requestedPermission === "read" /* READ */) {
    return true;
  }
  if (!userId) {
    return false;
  }
  if (aclPolicy.owner === userId) {
    return true;
  }
  for (const rule of aclPolicy.aclRules || []) {
    const accessGroup = createObjectAccessGroup(rule.group);
    if (await accessGroup.hasMember(userId) && isPermissionAllowed(requestedPermission, rule.permission)) {
      return true;
    }
  }
  return false;
}
var ACL_POLICY_METADATA_KEY;
var init_objectAcl = __esm({
  "server/objectAcl.ts"() {
    "use strict";
    ACL_POLICY_METADATA_KEY = "custom:aclPolicy";
  }
});

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
function parseObjectPath(path3) {
  if (!path3.startsWith("/")) {
    path3 = `/${path3}`;
  }
  const pathParts = path3.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return {
    bucketName,
    objectName
  };
}
async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec
}) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(request)
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, make sure you're running on Replit`
    );
  }
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
var REPLIT_SIDECAR_ENDPOINT, objectStorageClient, ObjectNotFoundError, ObjectStorageService;
var init_objectStorage = __esm({
  "server/objectStorage.ts"() {
    "use strict";
    init_objectAcl();
    REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
    objectStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token"
          }
        },
        universe_domain: "googleapis.com"
      },
      projectId: ""
    });
    ObjectNotFoundError = class _ObjectNotFoundError extends Error {
      constructor() {
        super("Object not found");
        this.name = "ObjectNotFoundError";
        Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
      }
    };
    ObjectStorageService = class {
      constructor() {
      }
      // Gets the public object search paths.
      getPublicObjectSearchPaths() {
        const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
        const paths = Array.from(
          new Set(
            pathsStr.split(",").map((path3) => path3.trim()).filter((path3) => path3.length > 0)
          )
        );
        if (paths.length === 0) {
          throw new Error(
            "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
          );
        }
        return paths;
      }
      // Gets the private object directory.
      getPrivateObjectDir() {
        const dir = process.env.PRIVATE_OBJECT_DIR || "";
        if (!dir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        return dir;
      }
      // Search for a public object from the search paths.
      async searchPublicObject(filePath) {
        for (const searchPath of this.getPublicObjectSearchPaths()) {
          const fullPath = `${searchPath}/${filePath}`;
          const { bucketName, objectName } = parseObjectPath(fullPath);
          const bucket = objectStorageClient.bucket(bucketName);
          const file = bucket.file(objectName);
          const [exists] = await file.exists();
          if (exists) {
            return file;
          }
        }
        return null;
      }
      // Downloads an object to the response.
      async downloadObject(file, res, cacheTtlSec = 3600) {
        try {
          const [metadata] = await file.getMetadata();
          const aclPolicy = await getObjectAclPolicy(file);
          const isPublic = aclPolicy?.visibility === "public";
          res.set({
            "Content-Type": metadata.contentType || "application/octet-stream",
            "Content-Length": metadata.size,
            "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`
          });
          const stream = file.createReadStream();
          stream.on("error", (err) => {
            console.error("Stream error:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Error streaming file" });
            }
          });
          stream.pipe(res);
        } catch (error) {
          console.error("Error downloading file:", error);
          if (!res.headersSent) {
            res.status(500).json({ error: "Error downloading file" });
          }
        }
      }
      // Gets the upload URL for an object entity.
      async getObjectEntityUploadURL() {
        const privateObjectDir = this.getPrivateObjectDir();
        if (!privateObjectDir) {
          throw new Error(
            "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
          );
        }
        const objectId = randomUUID();
        const fullPath = `${privateObjectDir}/uploads/${objectId}`;
        const { bucketName, objectName } = parseObjectPath(fullPath);
        return signObjectURL({
          bucketName,
          objectName,
          method: "PUT",
          ttlSec: 900
        });
      }
      // Gets the object entity file from the object path.
      async getObjectEntityFile(objectPath) {
        if (!objectPath.startsWith("/objects/")) {
          throw new ObjectNotFoundError();
        }
        const parts = objectPath.slice(1).split("/");
        if (parts.length < 2) {
          throw new ObjectNotFoundError();
        }
        const entityId = parts.slice(1).join("/");
        let entityDir = this.getPrivateObjectDir();
        if (!entityDir.endsWith("/")) {
          entityDir = `${entityDir}/`;
        }
        const objectEntityPath = `${entityDir}${entityId}`;
        const { bucketName, objectName } = parseObjectPath(objectEntityPath);
        const bucket = objectStorageClient.bucket(bucketName);
        const objectFile = bucket.file(objectName);
        const [exists] = await objectFile.exists();
        if (!exists) {
          throw new ObjectNotFoundError();
        }
        return objectFile;
      }
      normalizeObjectEntityPath(rawPath) {
        if (!rawPath.startsWith("https://storage.googleapis.com/")) {
          return rawPath;
        }
        const url = new URL(rawPath);
        const rawObjectPath = url.pathname;
        let objectEntityDir = this.getPrivateObjectDir();
        if (!objectEntityDir.endsWith("/")) {
          objectEntityDir = `${objectEntityDir}/`;
        }
        if (!rawObjectPath.startsWith(objectEntityDir)) {
          return rawObjectPath;
        }
        const entityId = rawObjectPath.slice(objectEntityDir.length);
        return `/objects/${entityId}`;
      }
      // Tries to set the ACL policy for the object entity and return the normalized path.
      async trySetObjectEntityAclPolicy(rawPath, aclPolicy) {
        const normalizedPath = this.normalizeObjectEntityPath(rawPath);
        if (!normalizedPath.startsWith("/")) {
          return normalizedPath;
        }
        const objectFile = await this.getObjectEntityFile(normalizedPath);
        await setObjectAclPolicy(objectFile, aclPolicy);
        return normalizedPath;
      }
      // Checks if the user can access the object entity.
      async canAccessObjectEntity({
        userId,
        objectFile,
        requestedPermission
      }) {
        return canAccessObject({
          userId,
          objectFile,
          requestedPermission: requestedPermission ?? "read" /* READ */
        });
      }
    };
  }
});

// server/logger.ts
function emit(level, message, meta) {
  const line = {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    message,
    ...meta ? { meta } : {}
  };
  const out = JSON.stringify(line);
  if (level === "error" || level === "fatal") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}
async function persist(level, message, meta) {
  try {
    await db.insert(errorLogs).values({
      level,
      message: message.slice(0, 4e3),
      stack: meta?.stack ? String(meta.stack).slice(0, 8e3) : null,
      route: meta?.route ? String(meta.route) : null,
      userId: meta?.userId ? String(meta.userId) : null,
      metadata: meta ?? null
    });
  } catch {
  }
}
async function forwardToSentry(message, meta) {
  if (!process.env.SENTRY_DSN) return;
  try {
    const sentryModuleName = "@sentry/node";
    const Sentry = await import(sentryModuleName).catch(() => null);
    if (!Sentry) return;
    Sentry.captureException?.(new Error(message), { extra: meta });
  } catch {
  }
}
var logger;
var init_logger = __esm({
  "server/logger.ts"() {
    "use strict";
    init_db();
    init_schema();
    logger = {
      info(message, meta) {
        emit("info", message, meta);
      },
      warn(message, meta) {
        emit("warn", message, meta);
      },
      error(message, meta) {
        emit("error", message, meta);
        void persist("error", message, meta);
        void forwardToSentry(message, meta);
      },
      fatal(message, meta) {
        emit("fatal", message, meta);
        void persist("fatal", message, meta);
        void forwardToSentry(message, meta);
      }
    };
  }
});

// server/email-service.ts
import nodemailer from "nodemailer";
async function sendEmail(opts) {
  if (emailDeliveryMode === "log" || !transporter) {
    logger.info("email.log_mode_send", {
      to: opts.to,
      subject: opts.subject,
      preview: (opts.text ?? opts.html).slice(0, 300)
    });
    return { delivered: false, mode: "log" };
  }
  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text
    });
    logger.info("email.sent", { to: opts.to, subject: opts.subject, messageId: info.messageId });
    return { delivered: true, mode: "smtp", messageId: info.messageId };
  } catch (err) {
    logger.error("email.send_failed", { to: opts.to, subject: opts.subject, error: err?.message });
    return { delivered: false, mode: "smtp" };
  }
}
function confirmationLinkEmail(params) {
  const { contributorName, songTitle, operatorName, confirmUrl } = params;
  const subject = `Action needed: confirm your split for "${songTitle}"`;
  const text2 = `Hi ${contributorName},

${operatorName ?? "Your service provider"} has sent you a split sheet to confirm for "${songTitle}".

Review and confirm here: ${confirmUrl}

If you weren't expecting this, you can safely ignore this email.

\u2014 SplitSheet`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">Confirm your split for "${songTitle}"</h2>
      <p>Hi ${contributorName},</p>
      <p>${operatorName ?? "Your service provider"} has sent you a split sheet to review and confirm.</p>
      <p style="margin:24px 0;">
        <a href="${confirmUrl}" style="background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Review &amp; Confirm Split
        </a>
      </p>
      <p style="font-size:12px;color:#666;">If the button doesn't work, copy this link: ${confirmUrl}</p>
      <p style="font-size:12px;color:#999;margin-top:32px;">SplitSheet \xB7 SoundLedger Technologies</p>
    </div>`;
  return { subject, html, text: text2 };
}
function verificationCodeEmail(code) {
  const subject = "Your SplitSheet verification code";
  const text2 = `Your verification code is: ${code}

This code expires in 10 minutes. If you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2>Your verification code</h2>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
      <p style="font-size:13px;color:#666;">This code expires in 10 minutes.</p>
    </div>`;
  return { subject, html, text: text2 };
}
var SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL, transporter, emailDeliveryMode;
var init_email_service = __esm({
  "server/email-service.ts"() {
    "use strict";
    init_logger();
    SMTP_HOST = process.env.SMTP_HOST;
    SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
    SMTP_USER = process.env.SMTP_USER;
    SMTP_PASS = process.env.SMTP_PASS;
    FROM_EMAIL = process.env.EMAIL_FROM ?? "SplitSheet <no-reply@splitsheet.ca>";
    transporter = null;
    emailDeliveryMode = SMTP_HOST && SMTP_USER && SMTP_PASS ? "smtp" : "log";
    if (emailDeliveryMode === "smtp") {
      transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
    }
  }
});

// server/confirmation-routes.ts
import crypto2 from "crypto";
import { sql as sql4 } from "drizzle-orm";
function generateToken() {
  return crypto2.randomBytes(32).toString("hex");
}
function expiresAt72h() {
  return new Date(Date.now() + 72 * 60 * 60 * 1e3);
}
function getIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
}
function registerConfirmationRoutes(app) {
  app.post(
    "/api/contracts/:id/generate-confirmations",
    isAuthenticated,
    async (req, res) => {
      const contractId = req.params.id;
      const userId = req.user?.claims?.sub;
      try {
        const contractRows = await db.execute(sql4`
          SELECT id, title, status, created_by
          FROM contracts
          WHERE id = ${contractId}
          LIMIT 1
        `);
        const contract = contractRows.rows[0];
        if (!contract) {
          res.status(404).json({ error: "Contract not found" });
          return;
        }
        if (contract.created_by !== userId) {
          res.status(403).json({ error: "Not authorized" });
          return;
        }
        const collabRows = await db.execute(sql4`
          SELECT id, name, email, role, ownership_percentage
          FROM contract_collaborators
          WHERE contract_id = ${contractId}
          ORDER BY created_at ASC
        `);
        const collaborators = collabRows.rows;
        if (!collaborators.length) {
          res.status(400).json({ error: "No collaborators on this contract" });
          return;
        }
        const results = [];
        const expires = expiresAt72h();
        for (const collab of collaborators) {
          const existing = await db.execute(sql4`
            SELECT id, token, status FROM split_confirmations
            WHERE contract_id = ${contractId}
              AND collaborator_id = ${collab.id}
            LIMIT 1
          `);
          if (existing.rows.length > 0) {
            const row = existing.rows[0];
            await db.execute(sql4`
              UPDATE split_confirmations
              SET expires_at = ${expires}, updated_at = NOW()
              WHERE id = ${row.id}
            `);
            results.push({ collaboratorId: collab.id, name: collab.name, token: row.token, status: row.status, isNew: false });
          } else {
            const token = generateToken();
            await db.execute(sql4`
              INSERT INTO split_confirmations
                (contract_id, collaborator_id, token, status, expires_at)
              VALUES
                (${contractId}, ${collab.id}, ${token}, 'not_sent', ${expires})
            `);
            results.push({ collaboratorId: collab.id, name: collab.name, token, status: "not_sent", isNew: true });
          }
        }
        const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
        const operator = await storage.getUser(userId).catch(() => void 0);
        const operatorName = operator ? `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() : void 0;
        const confirmations2 = await Promise.all(
          results.map(async (r) => {
            const link = `${baseUrl}/confirm/${contractId}/${r.token}`;
            const collab = collaborators.find((c) => c.id === r.collaboratorId);
            let emailSent = false;
            if (collab?.email) {
              const template = confirmationLinkEmail({
                contributorName: r.name,
                songTitle: contract.title,
                operatorName,
                confirmUrl: link
              });
              const delivery = await sendEmail({ to: collab.email, ...template });
              emailSent = delivery.delivered;
              if (delivery.delivered) {
                await db.execute(sql4`
                  UPDATE split_confirmations
                  SET status = 'sent', sent_at = NOW(), updated_at = NOW()
                  WHERE contract_id = ${contractId} AND collaborator_id = ${r.collaboratorId}
                    AND status IN ('not_sent', 'sent')
                `).catch(() => {
                });
              }
            }
            return {
              ...r,
              status: emailSent ? "sent" : r.status,
              emailSent,
              link,
              whatsapp: `https://wa.me/?text=${encodeURIComponent(
                `Hey ${r.name} \u2014 please review and confirm your split for "${contract.title}" here: ${link}`
              )}`,
              sms: `sms:?body=${encodeURIComponent(
                `Hey ${r.name} \u2014 confirm your split for "${contract.title}": ${link}`
              )}`
            };
          })
        );
        res.json({ contractId, contractTitle: contract.title, confirmations: confirmations2 });
      } catch (err) {
        console.error("[GENERATE-CONFIRMATIONS]", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.get(
    "/api/contracts/:id/confirmations",
    isAuthenticated,
    async (req, res) => {
      const contractId = req.params.id;
      const userId = req.user?.claims?.sub;
      try {
        const contractRows = await db.execute(sql4`
          SELECT id, title, status, created_by FROM contracts
          WHERE id = ${contractId} LIMIT 1
        `);
        const contract = contractRows.rows[0];
        if (!contract) {
          res.status(404).json({ error: "Contract not found" });
          return;
        }
        if (contract.created_by !== userId) {
          res.status(403).json({ error: "Not authorized" });
          return;
        }
        const rows = await db.execute(sql4`
          SELECT
            sc.id,
            sc.token,
            sc.status,
            sc.sent_at,
            sc.confirmed_at,
            sc.expires_at,
            sc.confirmed_name,
            sc.confirmed_email,
            sc.confirmation_note,
            sc.ip_address,
            cc.id   AS collaborator_id,
            cc.name AS collaborator_name,
            cc.email AS collaborator_email,
            cc.role,
            cc.ownership_percentage
          FROM split_confirmations sc
          JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
          WHERE sc.contract_id = ${contractId}
          ORDER BY cc.created_at ASC
        `);
        const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
        const confirmations2 = rows.rows.map((r) => ({
          id: r.id,
          token: r.token,
          status: r.status,
          sentAt: r.sent_at,
          confirmedAt: r.confirmed_at,
          expiresAt: r.expires_at,
          confirmedName: r.confirmed_name,
          confirmedEmail: r.confirmed_email,
          confirmationNote: r.confirmation_note,
          collaborator: {
            id: r.collaborator_id,
            name: r.collaborator_name,
            email: r.collaborator_email,
            role: r.role,
            ownershipPercentage: Number(r.ownership_percentage)
          },
          link: `${baseUrl}/confirm/${contractId}/${r.token}`,
          whatsapp: `https://wa.me/?text=${encodeURIComponent(
            `Hey ${r.collaborator_name} \u2014 confirm your split for "${contract.title}": ${baseUrl}/confirm/${contractId}/${r.token}`
          )}`,
          sms: `sms:?body=${encodeURIComponent(
            `Hey ${r.collaborator_name} \u2014 confirm your split for "${contract.title}": ${baseUrl}/confirm/${contractId}/${r.token}`
          )}`
        }));
        const total = confirmations2.length;
        const confirmed = confirmations2.filter((c) => c.status === "confirmed").length;
        const pending = confirmations2.filter((c) => c.status === "sent").length;
        const notSent = confirmations2.filter((c) => c.status === "not_sent").length;
        const changed = confirmations2.filter((c) => c.status === "change_requested").length;
        const allConfirmed = confirmed === total && total > 0;
        res.json({
          contractId,
          contractTitle: contract.title,
          contractStatus: contract.status,
          allConfirmed,
          summary: { total, confirmed, pending, notSent, changeRequested: changed },
          confirmations: confirmations2
        });
      } catch (err) {
        console.error("[GET-CONFIRMATIONS]", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.post(
    "/api/contracts/:id/confirmations/:confirmId/mark-sent",
    isAuthenticated,
    async (req, res) => {
      const { confirmId } = req.params;
      try {
        await db.execute(sql4`
          UPDATE split_confirmations
          SET status = 'sent', sent_at = NOW(), updated_at = NOW()
          WHERE id = ${confirmId}
            AND status IN ('not_sent', 'sent')
        `);
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  );
  app.get(
    "/api/confirm/:contractId/:token",
    async (req, res) => {
      const { contractId, token } = req.params;
      try {
        const rows = await db.execute(sql4`
          SELECT
            sc.id,
            sc.status,
            sc.expires_at,
            sc.confirmed_at,
            sc.collaborator_id,
            cc.name   AS collaborator_name,
            cc.email  AS collaborator_email,
            cc.role,
            cc.ownership_percentage,
            c.id      AS contract_id,
            c.title   AS contract_title,
            c.data    AS contract_data
          FROM split_confirmations sc
          JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
          JOIN contracts c ON c.id = sc.contract_id
          WHERE sc.token     = ${token}
            AND sc.contract_id = ${contractId}
          LIMIT 1
        `);
        if (!rows.rows.length) {
          res.status(404).json({ error: "Confirmation link not found or invalid." });
          return;
        }
        const row = rows.rows[0];
        if (row.expires_at && new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
          res.status(410).json({ error: "This confirmation link has expired. Ask the operator to resend." });
          return;
        }
        if (row.status === "confirmed") {
          res.json({
            alreadyConfirmed: true,
            confirmedAt: row.confirmed_at,
            collaboratorName: row.collaborator_name,
            contractTitle: row.contract_title
          });
          return;
        }
        const allCollabs = await db.execute(sql4`
          SELECT name, role, ownership_percentage
          FROM contract_collaborators
          WHERE contract_id = ${contractId}
          ORDER BY created_at ASC
        `);
        res.json({
          alreadyConfirmed: false,
          confirmationId: row.id,
          contractTitle: row.contract_title,
          collaboratorName: row.collaborator_name,
          collaboratorEmail: row.collaborator_email,
          collaboratorRole: row.role,
          ownershipPercentage: Number(row.ownership_percentage),
          expiresAt: row.expires_at,
          allCollaborators: allCollabs.rows.map((c) => ({
            name: c.name,
            role: c.role,
            ownershipPercentage: Number(c.ownership_percentage)
          }))
        });
      } catch (err) {
        console.error("[PUBLIC-CONFIRM-GET]", err.message);
        res.status(500).json({ error: "Could not load confirmation. Please try again." });
      }
    }
  );
  app.post(
    "/api/confirm/:contractId/:token",
    async (req, res) => {
      const { contractId, token } = req.params;
      const { action, name, email, note } = req.body ?? {};
      if (!["confirm", "request_change"].includes(action)) {
        res.status(400).json({ error: "action must be 'confirm' or 'request_change'" });
        return;
      }
      try {
        const rows = await db.execute(sql4`
          SELECT sc.id, sc.status, sc.expires_at, cc.name AS collab_name, c.title AS contract_title
          FROM split_confirmations sc
          JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
          JOIN contracts c ON c.id = sc.contract_id
          WHERE sc.token = ${token}
            AND sc.contract_id = ${contractId}
          LIMIT 1
        `);
        if (!rows.rows.length) {
          res.status(404).json({ error: "Confirmation link not found." });
          return;
        }
        const row = rows.rows[0];
        if (row.expires_at && new Date(row.expires_at) < /* @__PURE__ */ new Date()) {
          res.status(410).json({ error: "This link has expired. Ask the operator to resend." });
          return;
        }
        if (row.status === "confirmed" && action === "confirm") {
          res.json({ success: true, alreadyConfirmed: true, message: "Already confirmed." });
          return;
        }
        const newStatus = action === "confirm" ? "confirmed" : "change_requested";
        const ip = getIp(req);
        const ua = req.headers["user-agent"] ?? null;
        await db.execute(sql4`
          UPDATE split_confirmations SET
            status           = ${newStatus},
            confirmed_name   = ${name ?? null},
            confirmed_email  = ${email ?? null},
            confirmation_note = ${note ?? null},
            ip_address       = ${ip},
            user_agent       = ${ua},
            confirmed_at     = NOW(),
            updated_at       = NOW()
          WHERE id = ${row.id}
        `);
        if (action === "confirm") {
          const pendingRows = await db.execute(sql4`
            SELECT COUNT(*) AS cnt
            FROM split_confirmations
            WHERE contract_id = ${contractId}
              AND status != 'confirmed'
          `);
          const remaining = Number(pendingRows.rows[0]?.cnt ?? 1);
          if (remaining === 0) {
            await db.execute(sql4`
              UPDATE contracts SET status = 'signed', updated_at = NOW()
              WHERE id = ${contractId}
            `);
          }
        }
        res.json({
          success: true,
          action: newStatus,
          message: action === "confirm" ? `Thank you${name ? ` ${name}` : ""}! Your confirmation for "${row.contract_title}" has been recorded.` : "Your change request has been recorded. The operator will follow up."
        });
      } catch (err) {
        console.error("[PUBLIC-CONFIRM-POST]", err.message);
        res.status(500).json({ error: "Could not submit confirmation. Please try again." });
      }
    }
  );
}
var init_confirmation_routes = __esm({
  "server/confirmation-routes.ts"() {
    "use strict";
    init_db();
    init_replitAuth();
    init_email_service();
    init_storage();
  }
});

// server/copilot-knowledge.ts
function resolveCopilotPageKey(path3) {
  if (!path3) return void 0;
  const keys = ["/", "/clients", "/projects", "/contracts", "/ownership", "/billing", "/analytics"];
  if (keys.includes(path3)) return path3;
  for (const key of keys) {
    if (key !== "/" && path3.startsWith(`${key}/`)) return key;
  }
  return path3;
}
var COPILOT_PRICING, COPILOT_SYSTEM_PROMPT;
var init_copilot_knowledge = __esm({
  "server/copilot-knowledge.ts"() {
    "use strict";
    COPILOT_PRICING = [
      "\u2022 **Starter (Free)** \u2014 $0: 1 project, up to 2 contributors",
      "\u2022 **Pay-Per-Session** \u2014 $25 CAD/session: up to 5 contributors, full workflow + PDF",
      "\u2022 **Multi-Creator** \u2014 $50\u201375 CAD/project: up to 10 contributors, quote-based",
      "\u2022 **Express add-on** \u2014 +$25 CAD: priority processing per session",
      "\u2022 **Creator Pro** \u2014 $15 CAD/month: unlimited sessions, analytics, AI assistant",
      "\u2022 **Studio Pro** \u2014 $49 CAD/month: unlimited projects, team workspaces, bulk exports",
      "\u2022 **Enterprise** \u2014 custom pricing for labels, publishers, and rights organizations"
    ].join("\n");
    COPILOT_SYSTEM_PROMPT = `You are SoundLedger CoPilot, the expert AI assistant embedded inside SplitSheet \u2014 a Canadian music agreement and rights management platform built by SoundLedger Technologies Inc.

Your role is to guide music industry operators (independent artists, producers, studios, publishers) through the platform's features and answer music industry questions. You are professional, concise, warm, and deeply knowledgeable.

\u2550\u2550\u2550 PLATFORM KNOWLEDGE \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

OPERATOR WORKFLOW (4 stages):
1. Client Intake \u2014 add an artist, producer, or label as a client
2. Split Setup \u2014 create a project, add contributors, set ownership percentages
3. Contributor Confirmation \u2014 generate token-based links, send via WhatsApp/SMS/Instagram DMs
4. Confirmed Record \u2014 timestamped, IP-logged, PDF-exportable agreement

AGREEMENT TYPES: Split Sheet, Producer Agreement, Performance Agreement, Management Agreement

RIGHTS: Composition (PA) and Master (SR) tracked separately. Each must total 100% independently.

PRO AFFILIATIONS: SOCAN (Canada default), ASCAP, BMI, PRS, MROC, ARTISTI. IPI/CAE = 9-digit PRO identifier.

PRICING (CAD):
${COPILOT_PRICING}

\u2550\u2550\u2550 BEHAVIOR \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

- Answer the user's specific question directly \u2014 do not deflect or give unrelated info
- Use 2\u20135 sentences for simple questions; numbered steps for processes
- NEVER give legal advice \u2014 recommend a qualified entertainment lawyer
- Quote pricing in CAD using the tiers above
- Tailor guidance to the page the user is on when provided
- If you are unsure, say so rather than inventing features or prices`;
  }
});

// server/copilot-fallback.ts
function getFallbackResponse(userMessage, currentPage) {
  const q = userMessage.toLowerCase();
  const pageKey = resolveCopilotPageKey(currentPage) ?? currentPage;
  const matches = (...terms) => terms.some((t) => q.includes(t));
  if (matches("first project", "start", "get started", "new operator", "begin")) {
    return [
      "Here's how to start your first project on SplitSheet:",
      "",
      "1. Go to **Clients** and add the artist or producer you're working with.",
      "2. Open **Projects** and create a new project linked to that client.",
      "3. Add every contributor with name, email, role, PRO, and ownership %.",
      "4. Make sure composition percentages total exactly **100%** (master % is tracked separately).",
      "5. Click **Generate Confirmation Links** and send each link to contributors.",
      "6. When everyone confirms, the project moves to **Confirmed** and you can export a PDF.",
      "",
      "Need help on a specific step? Tell me which stage you're on."
    ].join("\n");
  }
  if (matches("split sheet", "what is a split", "why split")) {
    return [
      "A **split sheet** is a written record of who owns what percentage of a song's composition and master recording.",
      "",
      "Without one, collaborators often disagree later about royalties \u2014 SOCAN, ASCAP, and distributors need documented splits to pay correctly.",
      "",
      "In SplitSheet: create a project \u2192 add contributors \u2192 send confirmation links \u2192 export PDF once everyone confirms."
    ].join("\n");
  }
  if (matches("confirmation", "confirm", "link", "contributor confirm")) {
    return [
      "SplitSheet's confirmation flow works like this:",
      "",
      "1. On the project detail page, click **Generate Confirmation Links**.",
      "2. Each contributor gets a unique URL \u2014 no account required.",
      "3. They review their split, agree, and confirm (timestamp + IP logged).",
      "4. When **all** contributors confirm, the project status updates automatically.",
      "",
      "Links expire after 72 hours \u2014 regenerate if needed."
    ].join("\n");
  }
  if (matches("100%", "100 percent", "ownership", "percentage", "add up")) {
    return [
      "The **100% rule**: all composition ownership percentages in a project must total exactly 100%.",
      "",
      "Master recording percentages are tracked **separately** \u2014 a producer might own 30% of the master but 0% of the composition.",
      "",
      "SplitSheet validates totals before you can send confirmation links."
    ].join("\n");
  }
  if (matches("pricing", "plan", "cost", "how much", "tier", "free", "session", "pro", "studio")) {
    return [
      "SplitSheet pricing (all CAD):",
      "",
      COPILOT_PRICING,
      "",
      "Visit **Billing** in the sidebar to manage your plan."
    ].join("\n");
  }
  if (matches("socan", "ascap", "bmi", "pro ", "ipi", "cae")) {
    return [
      "**PROs** (Performance Rights Organizations) collect performance royalties for songwriters.",
      "",
      "\u2022 **SOCAN** \u2014 default for Canadian operators (performance + mechanical)",
      "\u2022 **ASCAP / BMI / SESAC** \u2014 US-based PROs",
      "\u2022 **IPI/CAE** \u2014 9-digit ID assigned when you register with your PRO; needed for CWR export",
      "",
      "Add each contributor's PRO and IPI when setting up splits."
    ].join("\n");
  }
  if (matches("rights ledger", "ownership ledger", "iswc", "archive", "deactivate")) {
    return [
      "The **Rights Ledger** (/ownership) is your long-term song asset registry.",
      "",
      "\u2022 Register songs with ISWC codes and asset type",
      "\u2022 Track ownership history over time",
      "\u2022 **Archive** (reversible) or **Deactivate** (permanent)",
      "\u2022 View revenue breakdown and activity log per asset",
      "",
      "Projects handle split confirmation; the Rights Ledger tracks assets after registration."
    ].join("\n");
  }
  if (matches("agreement", "contract", "producer agreement", "template")) {
    return [
      "SplitSheet supports four agreement types:",
      "",
      "1. **Split Sheet** \u2014 composition/master ownership",
      "2. **Producer Agreement** \u2014 producer fee and royalty terms",
      "3. **Performance Agreement** \u2014 live show terms",
      "4. **Management Agreement** \u2014 artist management commission",
      "",
      "Go to **Music Agreements** \u2192 pick a template \u2192 fill fields \u2192 add collaborators \u2192 send for signature."
    ].join("\n");
  }
  if (matches("workflow", "walk me through", "full process", "how does splitsheet")) {
    return [
      "The SplitSheet operator workflow has 4 stages:",
      "",
      "1. **Client Intake** \u2014 add artists, producers, or labels you work with",
      "2. **Split Setup** \u2014 create a project, add contributors, set ownership %",
      "3. **Contributor Confirmation** \u2014 send token links; contributors confirm without an account",
      "4. **Confirmed Record** \u2014 timestamped agreement, audit trail, PDF export",
      "",
      currentPage ? `You're currently on **${pageKey ?? currentPage}** \u2014 ask me what to do next on this page.` : "Which stage are you on? I can give step-by-step guidance."
    ].join("\n");
  }
  if (matches("pdf", "export", "download")) {
    return "You can export a PDF at any stage of an agreement from the contract detail page. The PDF includes all filled fields, party names, and confirmation records. Filename format: `{title}_agreement.pdf`.";
  }
  if (matches("legal advice", "lawyer", "binding", "enforceable")) {
    return "SplitSheet is a **workflow and documentation platform**, not a law firm. Documents generated here do not constitute legal advice. For binding contracts or complex deals, consult a qualified music entertainment lawyer.";
  }
  const pageHints = {
    "/": "On the **Dashboard**, check pending confirmations and recent projects. Use quick actions to create a client or project.",
    "/clients": "On **Clients**, click **Add Client** to register an artist, producer, songwriter, or label.",
    "/projects": "On **Projects**, create a project, add contributors, validate 100% totals, then generate confirmation links.",
    "/contracts": "On **Music Agreements**, browse templates or open an existing agreement to edit or export.",
    "/ownership": "On the **Rights Ledger**, register song assets and track ownership history over time.",
    "/billing": "On **Billing**, view your plan, upgrade, or manage Stripe subscription.",
    "/analytics": "On **Analytics**, monitor confirmation rates and project activity."
  };
  if (pageKey && pageHints[pageKey]) {
    return [
      pageHints[pageKey],
      "",
      'Ask me a specific question about this page, or try: "How do I set up ownership splits?" or "What is the confirmation workflow?"'
    ].join("\n");
  }
  return null;
}
function getOpenAIErrorMessage(err) {
  const msg = err instanceof Error ? err.message : typeof err === "object" && err !== null && "message" in err ? String(err.message) : String(err);
  if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
    return "OpenAI API quota exceeded. Add billing at platform.openai.com or update OPENAI_API_KEY in your .env file. I'm using offline guidance for now.";
  }
  if (msg.includes("401") || msg.toLowerCase().includes("invalid api key")) {
    return "Invalid OpenAI API key. Check OPENAI_API_KEY in your .env file.";
  }
  if (msg.includes("503") || msg.toLowerCase().includes("overloaded")) {
    return "OpenAI is temporarily overloaded. Please try again in a moment.";
  }
  if (msg.toLowerCase().includes("certificate") || msg.toLowerCase().includes("tls")) {
    return "Network SSL error reaching OpenAI. Check your firewall or proxy settings.";
  }
  return "I couldn't reach the AI service right now. Here's what I can tell you from SplitSheet's built-in knowledge:";
}
function streamTextAsSSE(res, text2) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  appendTextAsSSE(res, text2);
}
function appendTextAsSSE(res, text2) {
  const words = text2.split(/(\s+)/);
  for (const word of words) {
    if (!word) continue;
    res.write(
      `data: ${JSON.stringify({ choices: [{ delta: { content: word } }] })}

`
    );
  }
  res.write("data: [DONE]\n\n");
  res.end();
}
var init_copilot_fallback = __esm({
  "server/copilot-fallback.ts"() {
    "use strict";
    init_copilot_knowledge();
  }
});

// server/claude.service.ts
import OpenAI from "openai";
function getCopilotModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}
function isCopilotConfigured() {
  return !!process.env.OPENAI_API_KEY;
}
function createCopilotClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 6e4,
    maxRetries: 1
  });
}
async function streamCopilotCompletion(systemContent, messages2) {
  const openai3 = createCopilotClient();
  return openai3.chat.completions.create({
    model: getCopilotModel(),
    max_tokens: 1200,
    temperature: 0.3,
    stream: true,
    messages: [
      { role: "system", content: systemContent },
      ...messages2
    ]
  });
}
var init_claude_service = __esm({
  "server/claude.service.ts"() {
    "use strict";
  }
});

// server/copilot-routes.ts
import { z as z3 } from "zod";
function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 6e4 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}
function getLastUserMessage(messages2) {
  for (let i = messages2.length - 1; i >= 0; i--) {
    if (messages2[i].role === "user") return messages2[i].content;
  }
  return messages2[messages2.length - 1]?.content ?? "";
}
function respondWithFallback(res, userMessage, currentPage, prefix) {
  const pageKey = resolveCopilotPageKey(currentPage);
  const fallback = getFallbackResponse(userMessage, pageKey);
  if (!fallback) return false;
  const text2 = prefix ? `${prefix}

${fallback}` : fallback;
  streamTextAsSSE(res, text2);
  return true;
}
function registerCopilotRoutes(app) {
  app.post("/api/copilot", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub ?? "anonymous";
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before asking another question."
      });
    }
    let body;
    try {
      body = copilotSchema.parse(req.body);
    } catch (err) {
      return res.status(400).json({
        error: "Invalid request format.",
        issues: err?.errors ?? []
      });
    }
    const userMessage = getLastUserMessage(body.messages);
    const pageKey = resolveCopilotPageKey(body.currentPage);
    const pageNote = pageKey ? `

[User is on: ${pageKey}${body.pageContext ? ` \u2014 "${body.pageContext}"` : ""}]` : "";
    const systemContent = COPILOT_SYSTEM_PROMPT + pageNote;
    if (!isCopilotConfigured()) {
      if (respondWithFallback(
        res,
        userMessage,
        pageKey,
        "CoPilot AI is not configured (missing OPENAI_API_KEY). Here's guidance from SplitSheet's built-in knowledge:"
      )) {
        return;
      }
      return res.status(503).json({
        error: "CoPilot is not configured. Add OPENAI_API_KEY to your .env file."
      });
    }
    try {
      const stream = await streamCopilotCompletion(
        systemContent,
        body.messages.map((m) => ({
          role: m.role,
          content: m.content
        }))
      );
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          res.write(
            `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}

`
          );
        }
        if (chunk.choices[0]?.finish_reason) {
          res.write("data: [DONE]\n\n");
        }
      }
      res.end();
    } catch (err) {
      console.error("[COPILOT ERROR]", err);
      const errorIntro = getOpenAIErrorMessage(err);
      const fallback = getFallbackResponse(userMessage, pageKey);
      const combined = fallback ? `${errorIntro}

${fallback}` : errorIntro;
      if (!res.headersSent) {
        if (fallback) {
          streamTextAsSSE(res, combined);
          return;
        }
        res.status(500).json({
          error: errorIntro,
          code: "copilot_unavailable"
        });
        return;
      }
      appendTextAsSSE(res, `

${combined}`);
    }
  });
  app.get("/api/copilot/health", isAuthenticated, (_req, res) => {
    res.json({
      configured: isCopilotConfigured(),
      model: getCopilotModel(),
      status: isCopilotConfigured() ? "ready" : "missing_api_key",
      fallback: "available"
    });
  });
}
var copilotSchema, rateLimits;
var init_copilot_routes = __esm({
  "server/copilot-routes.ts"() {
    "use strict";
    init_replitAuth();
    init_copilot_fallback();
    init_copilot_knowledge();
    init_claude_service();
    copilotSchema = z3.object({
      messages: z3.array(
        z3.object({
          role: z3.enum(["user", "assistant"]),
          content: z3.string().min(1).max(8e3)
        })
      ).min(1).max(40),
      currentPage: z3.string().max(200).optional(),
      pageContext: z3.string().max(200).optional()
    });
    rateLimits = /* @__PURE__ */ new Map();
  }
});

// server/service-routes.ts
import crypto3 from "crypto";
import { z as z4 } from "zod";
import { sql as sql5 } from "drizzle-orm";
function generateToken2() {
  return crypto3.randomBytes(32).toString("hex");
}
function expiresAt72h2() {
  return new Date(Date.now() + 72 * 60 * 60 * 1e3);
}
function projectStatusFromContract(status) {
  switch (status) {
    case "signed":
    case "active":
      return "confirmed";
    case "pending":
      return "pending_confirmation";
    case "cancelled":
      return "archived";
    default:
      return "draft";
  }
}
function contractStatusFromProject(status) {
  switch (status) {
    case "confirmed":
      return "signed";
    case "pending_confirmation":
      return "pending";
    case "archived":
      return "cancelled";
    default:
      return "draft";
  }
}
function contractToProject(contract) {
  const data = contract.data ?? {};
  return {
    id: contract.id,
    title: contract.title,
    songTitle: data.songTitle ?? contract.title,
    clientId: data.clientId ?? null,
    status: projectStatusFromContract(contract.status),
    notes: data.notes ?? null,
    type: contract.type,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt
  };
}
async function assertContractOwner(contractId, userId) {
  const contract = await storage.getContract(contractId);
  if (!contract) return { ok: false, error: "Project not found", status: 404 };
  if (contract.createdBy !== userId) return { ok: false, error: "Not authorized", status: 403 };
  return { ok: true, contract };
}
async function buildClientList(userId) {
  const userContracts = await storage.getContracts(userId);
  const clientMap = /* @__PURE__ */ new Map();
  for (const contract of userContracts) {
    const collabs = await storage.getContractCollaborators(contract.id);
    for (const collab of collabs) {
      const key = collab.email ?? collab.name;
      if (!key) continue;
      if (clientMap.has(key)) {
        const existing = clientMap.get(key);
        existing.contractCount = existing.contractCount + 1;
      } else {
        clientMap.set(key, {
          id: collab.id,
          name: collab.name,
          email: collab.email ?? null,
          phone: null,
          type: collab.role ?? "artist",
          role: collab.role,
          status: collab.status,
          notes: null,
          contractCount: 1,
          lastActivity: contract.updatedAt ?? contract.createdAt,
          createdAt: collab.createdAt
        });
      }
    }
  }
  return Array.from(clientMap.values());
}
function registerServiceRoutes(app) {
  app.get("/api/workflow/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const userContracts = await storage.getContracts(userId);
      let totalContributors = 0;
      let pendingConfirmations = 0;
      let confirmedProjects = 0;
      for (const contract of userContracts) {
        const collabs = await storage.getContractCollaborators(contract.id);
        totalContributors += collabs.length;
        if (contract.status === "signed" || contract.status === "active") {
          confirmedProjects += 1;
        } else if (contract.status === "pending") {
          pendingConfirmations += 1;
        }
      }
      const clients = await buildClientList(userId);
      res.json({
        clients: clients.length,
        projects: userContracts.length,
        contributors: totalContributors,
        pendingConfirmations,
        confirmedProjects,
        stages: [
          { id: "intake", label: "Client Intake", complete: clients.length > 0, href: "/clients" },
          { id: "splits", label: "Split Setup", complete: userContracts.length > 0, href: "/projects" },
          { id: "confirm", label: "Confirmation", complete: pendingConfirmations > 0 || confirmedProjects > 0, href: "/projects" },
          { id: "ledger", label: "Rights Ledger", complete: confirmedProjects > 0, href: "/ownership" }
        ]
      });
    } catch (error) {
      console.error("[WORKFLOW STATUS]", error);
      res.status(500).json({ message: "Failed to load workflow status" });
    }
  });
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      res.json(await buildClientList(req.user.claims.sub));
    } catch (error) {
      console.error("[CLIENTS LIST]", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });
  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const clients = await buildClientList(req.user.claims.sub);
      const client2 = clients.find((c) => c.id === req.params.id);
      if (!client2) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json(client2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });
  app.get("/api/clients/:id/projects", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const clients = await buildClientList(userId);
      const client2 = clients.find((c) => c.id === req.params.id);
      if (!client2) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      const userContracts = await storage.getContracts(userId);
      const email = client2.email;
      const name = client2.name;
      const projects = [];
      for (const contract of userContracts) {
        const collabs = await storage.getContractCollaborators(contract.id);
        const match = collabs.some(
          (c) => c.id === req.params.id || c.email === email || c.name === name
        );
        if (match) projects.push(contractToProject(contract));
      }
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client projects" });
    }
  });
  app.patch("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const { name, email, role, type } = req.body ?? {};
      const updates = {};
      if (name) updates.name = name;
      if (email !== void 0) updates.email = email || null;
      if (role || type) updates.role = role ?? type;
      if (!Object.keys(updates).length) {
        res.status(400).json({ message: "No updates provided" });
        return;
      }
      const updated = await storage.updateContractCollaborator(req.params.id, updates);
      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: null,
        type: updated.role,
        notes: null,
        createdAt: updated.createdAt
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update client" });
    }
  });
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const userContracts = await storage.getContracts(req.user.claims.sub);
      const projects = await Promise.all(
        userContracts.map(async (contract) => {
          const collabs = await storage.getContractCollaborators(contract.id);
          return {
            ...contractToProject(contract),
            collaboratorCount: collabs.length,
            collaborators: collabs.map((c) => ({
              name: c.name,
              role: c.role,
              ownershipPercentage: Number(c.ownershipPercentage ?? 0)
            }))
          };
        })
      );
      res.json(projects);
    } catch (error) {
      console.error("[PROJECTS LIST]", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await assertContractOwner(req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      res.json(contractToProject(result.contract));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });
  app.patch("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const result = await assertContractOwner(req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const { title, songTitle, status, notes, clientId } = req.body ?? {};
      const data = { ...result.contract.data };
      if (songTitle !== void 0) data.songTitle = songTitle;
      if (notes !== void 0) data.notes = notes;
      if (clientId !== void 0) data.clientId = clientId;
      const updates = { data };
      if (title) updates.title = title;
      if (status) updates.status = contractStatusFromProject(status);
      const updated = await storage.updateContract(req.params.id, updates);
      res.json(contractToProject(updated));
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });
  app.get("/api/projects/:id/contributors", isAuthenticated, async (req, res) => {
    try {
      const result = await assertContractOwner(req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const collabs = await storage.getContractCollaborators(req.params.id);
      const enriched = await Promise.all(
        collabs.map(async (c) => {
          const confRows = await db.execute(sql5`
            SELECT token, status, confirmed_at, expires_at
            FROM split_confirmations
            WHERE contract_id = ${req.params.id} AND collaborator_id = ${c.id}
            LIMIT 1
          `);
          const conf = confRows.rows[0];
          const data = result.contract.data ?? {};
          const extras = data.contributorMeta?.[c.id] ?? {};
          return {
            id: c.id,
            projectId: req.params.id,
            name: c.name,
            email: c.email,
            role: c.role,
            pro: extras.pro ?? null,
            ipi: extras.ipi ?? null,
            ownershipPercentage: String(c.ownershipPercentage ?? "0"),
            confirmationToken: conf?.token ?? null,
            confirmedAt: conf?.confirmed_at ?? c.signedAt ?? null,
            status: c.status,
            createdAt: c.createdAt
          };
        })
      );
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contributors" });
    }
  });
  app.post("/api/projects/:id/contributors", isAuthenticated, async (req, res) => {
    try {
      const parsed = contributorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid contributor data", issues: parsed.error.issues });
        return;
      }
      const result = await assertContractOwner(req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const { name, email, role, pro, ipi, ownershipPercentage } = parsed.data;
      const collab = await storage.addContractCollaborator({
        contractId: req.params.id,
        name,
        email: email || null,
        role,
        ownershipPercentage: String(ownershipPercentage),
        status: "pending"
      });
      if (pro || ipi) {
        const data = { ...result.contract.data };
        const meta = data.contributorMeta ?? {};
        meta[collab.id] = { pro: pro ?? "", ipi: ipi ?? "" };
        data.contributorMeta = meta;
        await storage.updateContract(req.params.id, { data });
      }
      res.status(201).json({
        id: collab.id,
        projectId: req.params.id,
        name: collab.name,
        email: collab.email,
        role: collab.role,
        pro: pro ?? null,
        ipi: ipi ?? null,
        ownershipPercentage: String(collab.ownershipPercentage ?? "0"),
        confirmationToken: null,
        confirmedAt: null,
        createdAt: collab.createdAt
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to add contributor" });
    }
  });
  app.patch("/api/projects/:id/contributors/:contribId", isAuthenticated, async (req, res) => {
    try {
      const result = await assertContractOwner(req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const { name, email, role, pro, ipi, ownershipPercentage } = req.body ?? {};
      const updates = {};
      if (name) updates.name = name;
      if (email !== void 0) updates.email = email || null;
      if (role) updates.role = role;
      if (ownershipPercentage !== void 0) updates.ownershipPercentage = String(ownershipPercentage);
      const updated = await storage.updateContractCollaborator(req.params.contribId, updates);
      if (pro !== void 0 || ipi !== void 0) {
        const data = { ...result.contract.data };
        const meta = data.contributorMeta ?? {};
        meta[req.params.contribId] = {
          pro: pro ?? meta[req.params.contribId]?.pro ?? "",
          ipi: ipi ?? meta[req.params.contribId]?.ipi ?? ""
        };
        data.contributorMeta = meta;
        await storage.updateContract(req.params.id, { data });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contributor" });
    }
  });
  app.delete("/api/projects/:id/contributors/:contribId", isAuthenticated, async (req, res) => {
    try {
      const result = await assertContractOwner(req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      await storage.deleteContractCollaborator(req.params.contribId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove contributor" });
    }
  });
  app.post("/api/projects/:id/send-confirmations", isAuthenticated, async (req, res) => {
    const contractId = req.params.id;
    const userId = req.user?.claims?.sub;
    try {
      const result = await assertContractOwner(contractId, userId);
      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      const collabs = await storage.getContractCollaborators(contractId);
      if (!collabs.length) {
        res.status(400).json({ error: "Add at least one contributor before sending confirmation links." });
        return;
      }
      const totalPct = collabs.reduce((sum, c) => sum + Number(c.ownershipPercentage ?? 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        res.status(400).json({
          error: `Ownership must total 100% before sending links (currently ${totalPct.toFixed(1)}%).`
        });
        return;
      }
      const expires = expiresAt72h2();
      const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      const links = [];
      for (const collab of collabs) {
        const existing = await db.execute(sql5`
          SELECT id, token, status FROM split_confirmations
          WHERE contract_id = ${contractId} AND collaborator_id = ${collab.id}
          LIMIT 1
        `);
        let token;
        if (existing.rows.length > 0) {
          const row = existing.rows[0];
          token = row.token;
          await db.execute(sql5`
            UPDATE split_confirmations SET expires_at = ${expires}, updated_at = NOW() WHERE id = ${row.id}
          `);
        } else {
          token = generateToken2();
          await db.execute(sql5`
            INSERT INTO split_confirmations (contract_id, collaborator_id, token, status, expires_at)
            VALUES (${contractId}, ${collab.id}, ${token}, 'not_sent', ${expires})
          `);
        }
        links.push({
          collaboratorId: collab.id,
          name: collab.name,
          email: collab.email,
          link: `${baseUrl}/confirm/${contractId}/${token}`
        });
      }
      await storage.updateContract(contractId, { status: "pending" });
      res.json({ success: true, confirmations: links });
    } catch (error) {
      console.error("[SEND CONFIRMATIONS]", error);
      res.status(500).json({ error: "Failed to generate confirmation links" });
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: process.env.NODE_ENV ?? "development"
    });
  });
}
var contributorSchema;
var init_service_routes = __esm({
  "server/service-routes.ts"() {
    "use strict";
    init_replitAuth();
    init_storage();
    init_db();
    contributorSchema = z4.object({
      name: z4.string().min(1).max(200),
      email: z4.string().email().optional().or(z4.literal("")),
      role: z4.string().min(1).max(100),
      pro: z4.string().max(50).optional(),
      ipi: z4.string().max(20).optional(),
      ownershipPercentage: z4.union([z4.string(), z4.number()])
    });
  }
});

// server/organization-routes.ts
import { z as z5 } from "zod";
import crypto4 from "crypto";
async function generateUniqueSlOrgId() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto4.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slOrgId = `SL-ORG-${shortId}`;
    const existing = await storage.getOrganizationBySlOrgId(slOrgId);
    if (!existing) return slOrgId;
  }
  return `SL-ORG-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}
function hasRole(role, minimum) {
  if (!role || !(role in ROLE_RANK)) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
async function requireOrgMember(req, res, next) {
  const userId = req.user?.claims?.sub;
  const organizationId = req.params.id;
  try {
    const org = await storage.getOrganization(organizationId);
    if (!org) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }
    const member = await storage.getOrganizationMember(organizationId, userId);
    if (!member) {
      res.status(403).json({ message: "You are not a member of this organization" });
      return;
    }
    req.orgMember = { ...member, organizationId };
    next();
  } catch (error) {
    console.error("[ORG AUTH ERROR]", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
function requireOrgRole(minimum) {
  return (req, res, next) => {
    if (!hasRole(req.orgMember?.role, minimum)) {
      res.status(403).json({ message: `Requires ${minimum} role or higher in this organization` });
      return;
    }
    next();
  };
}
function registerOrganizationRoutes(app) {
  app.get("/api/organizations", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const orgs = await storage.getOrganizationsForUser(userId);
      res.json(orgs);
    } catch (error) {
      console.error("[ORG LIST ERROR]", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });
  app.post("/api/organizations", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const body = insertOrganizationSchema.pick({ name: true, type: true, email: true, website: true, country: true }).extend({ type: z5.enum(ORGANIZATION_TYPES) }).parse(req.body);
      const slOrgId = await generateUniqueSlOrgId();
      const org = await storage.createOrganization({
        ...body,
        slOrgId,
        createdBy: userId
      });
      await storage.addOrganizationMember({
        organizationId: org.id,
        userId,
        role: "owner",
        invitedBy: null
      });
      await auditLog({
        userId,
        action: "organization.create",
        resourceType: "organization",
        resourceId: org.id,
        afterState: { name: org.name, type: org.type, slOrgId: org.slOrgId },
        ipAddress: req.ip
      });
      res.status(201).json(org);
    } catch (error) {
      if (error instanceof z5.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[ORG CREATE ERROR]", error);
        res.status(500).json({ message: "Failed to create organization" });
      }
    }
  });
  app.get(
    "/api/organizations/:id",
    isAuthenticated,
    requireOrgMember,
    async (req, res) => {
      const org = await storage.getOrganization(req.params.id);
      res.json(org);
    }
  );
  app.patch(
    "/api/organizations/:id",
    isAuthenticated,
    requireOrgMember,
    requireOrgRole("admin"),
    async (req, res) => {
      try {
        const updates = insertOrganizationSchema.pick({ name: true, email: true, website: true, country: true }).partial().parse(req.body);
        const updated = await storage.updateOrganization(req.params.id, updates);
        res.json(updated);
      } catch (error) {
        if (error instanceof z5.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG UPDATE ERROR]", error);
          res.status(500).json({ message: "Failed to update organization" });
        }
      }
    }
  );
  app.get(
    "/api/organizations/:id/members",
    isAuthenticated,
    requireOrgMember,
    async (req, res) => {
      const members = await storage.getOrganizationMembers(req.params.id);
      res.json(members);
    }
  );
  app.post(
    "/api/organizations/:id/members",
    isAuthenticated,
    requireOrgMember,
    requireOrgRole("admin"),
    async (req, res) => {
      const actingUserId = req.user.claims.sub;
      try {
        const body = z5.object({ userId: z5.string().min(1), role: z5.enum(ORGANIZATION_ROLES).default("member") }).parse(req.body);
        const existing = await storage.getOrganizationMember(req.params.id, body.userId);
        if (existing) {
          res.status(409).json({ message: "User is already a member of this organization" });
          return;
        }
        const member = await storage.addOrganizationMember({
          organizationId: req.params.id,
          userId: body.userId,
          role: body.role,
          invitedBy: actingUserId
        });
        await auditLog({
          userId: actingUserId,
          action: "organization.member_add",
          resourceType: "organization",
          resourceId: req.params.id,
          afterState: { addedUserId: body.userId, role: body.role },
          ipAddress: req.ip
        });
        res.status(201).json(member);
      } catch (error) {
        if (error instanceof z5.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG MEMBER ADD ERROR]", error);
          res.status(500).json({ message: "Failed to add member" });
        }
      }
    }
  );
  app.patch(
    "/api/organizations/:id/members/:memberId",
    isAuthenticated,
    requireOrgMember,
    requireOrgRole("owner"),
    async (req, res) => {
      try {
        const { role } = z5.object({ role: z5.enum(ORGANIZATION_ROLES) }).parse(req.body);
        const updated = await storage.updateOrganizationMemberRole(req.params.memberId, role);
        res.json(updated);
      } catch (error) {
        if (error instanceof z5.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG MEMBER ROLE ERROR]", error);
          res.status(500).json({ message: "Failed to update member role" });
        }
      }
    }
  );
  app.delete(
    "/api/organizations/:id/members/:memberId",
    isAuthenticated,
    requireOrgMember,
    async (req, res) => {
      const members = await storage.getOrganizationMembers(req.params.id);
      const target = members.find((m) => m.id === req.params.memberId);
      if (!target) {
        res.status(404).json({ message: "Member not found" });
        return;
      }
      const isSelf = target.userId === req.orgMember?.userId;
      if (!isSelf && !hasRole(req.orgMember?.role, "admin")) {
        res.status(403).json({ message: "Requires admin role or higher to remove other members" });
        return;
      }
      await storage.removeOrganizationMember(req.params.memberId);
      res.json({ removed: true });
    }
  );
  app.get(
    "/api/organizations/:id/api-keys",
    isAuthenticated,
    requireOrgMember,
    requireOrgRole("admin"),
    async (req, res) => {
      const keys = await storage.getOrganizationApiKeys(req.params.id);
      res.json(keys.map(({ keyHash, ...safe }) => safe));
    }
  );
  app.post(
    "/api/organizations/:id/api-keys",
    isAuthenticated,
    requireOrgMember,
    requireOrgRole("admin"),
    async (req, res) => {
      const userId = req.user.claims.sub;
      try {
        const body = z5.object({
          name: z5.string().min(1).max(100),
          scopes: z5.array(z5.string()).min(1)
        }).parse(req.body);
        const { raw, hash, prefix } = generateApiKey();
        const key = await storage.createOrganizationApiKey({
          organizationId: req.params.id,
          name: body.name,
          scopes: body.scopes,
          keyHash: hash,
          keyPrefix: prefix,
          createdBy: userId
        });
        await auditLog({
          userId,
          action: "organization.api_key_create",
          resourceType: "organization",
          resourceId: req.params.id,
          afterState: { name: body.name, scopes: body.scopes, keyPrefix: prefix },
          ipAddress: req.ip
        });
        const { keyHash, ...safeKey } = key;
        res.status(201).json({ ...safeKey, rawKey: raw });
      } catch (error) {
        if (error instanceof z5.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG API KEY CREATE ERROR]", error);
          res.status(500).json({ message: "Failed to create API key" });
        }
      }
    }
  );
  app.delete(
    "/api/organizations/:id/api-keys/:keyId",
    isAuthenticated,
    requireOrgMember,
    requireOrgRole("admin"),
    async (req, res) => {
      const userId = req.user.claims.sub;
      await storage.revokeOrganizationApiKey(req.params.keyId, req.params.id);
      await auditLog({
        userId,
        action: "organization.api_key_revoke",
        resourceType: "organization",
        resourceId: req.params.id,
        afterState: { keyId: req.params.keyId },
        ipAddress: req.ip
      });
      res.json({ revoked: true });
    }
  );
}
var ROLE_RANK;
var init_organization_routes = __esm({
  "server/organization-routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_schema();
    init_security();
    ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };
  }
});

// server/message-routes.ts
import { z as z6 } from "zod";
function messageRateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      next();
      return;
    }
    const now = Date.now();
    const key = `${userId}:messages`;
    const current = rateLimitStore.get(key);
    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    if (current.count >= maxRequests) {
      res.status(429).json({
        message: "Too many messages. Please wait before sending more."
      });
      return;
    }
    current.count++;
    next();
  };
}
function noStoreMessages(_req, res, next) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  next();
}
function registerMessageRoutes(app) {
  app.get(
    "/api/conversations",
    isAuthenticated,
    noStoreMessages,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversations = await storage.getUserConversations(userId);
        res.json(conversations);
      } catch (error) {
        console.error("Error getting conversations:", error);
        res.status(500).json({ message: "Failed to get conversations" });
      }
    }
  );
  app.get(
    "/api/conversations/:userId",
    isAuthenticated,
    noStoreMessages,
    async (req, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const otherUserId = req.params.userId;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const partner = await storage.getUser(otherUserId);
        if (!partner) {
          res.status(404).json({ message: "User not found" });
          return;
        }
        const thread = await storage.getConversation(currentUserId, otherUserId, limit);
        res.json(thread.reverse());
      } catch (error) {
        console.error("Error getting conversation:", error);
        res.status(500).json({ message: "Failed to get conversation" });
      }
    }
  );
  app.get(
    "/api/messages/unread-count",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const count2 = await storage.getUnreadMessageCount(userId);
        res.json({ count: count2 });
      } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({ message: "Failed to get unread count" });
      }
    }
  );
  app.post(
    "/api/messages",
    isAuthenticated,
    noStoreMessages,
    messageRateLimit(30, 6e4),
    async (req, res) => {
      try {
        const senderId = req.user.claims.sub;
        const parsed = sendMessageSchema.parse({
          receiverId: req.body.receiverId,
          content: sanitizeString(req.body.content, 5e3),
          messageType: req.body.messageType ?? "text"
        });
        if (parsed.receiverId === senderId) {
          res.status(400).json({ message: "Cannot send a message to yourself" });
          return;
        }
        const receiver = await storage.getUser(parsed.receiverId);
        if (!receiver) {
          res.status(404).json({ message: "Recipient not found" });
          return;
        }
        const message = await storage.sendMessage(
          senderId,
          parsed.receiverId,
          parsed.content,
          parsed.messageType
        );
        const sender = await storage.getUser(senderId);
        await storage.createNotification(
          parsed.receiverId,
          "New Message",
          `${sender?.firstName || "Someone"} sent you a message`,
          "info",
          `/messages/${senderId}`
        );
        res.status(201).json(message);
      } catch (error) {
        if (error instanceof z6.ZodError) {
          res.status(400).json({ message: "Invalid message", errors: error.errors });
          return;
        }
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );
  app.patch(
    "/api/conversations/:userId/read",
    isAuthenticated,
    async (req, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const senderId = req.params.userId;
        await storage.markMessagesAsRead(currentUserId, senderId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    }
  );
}
var rateLimitStore, sendMessageSchema;
var init_message_routes = __esm({
  "server/message-routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_security();
    rateLimitStore = /* @__PURE__ */ new Map();
    sendMessageSchema = z6.object({
      receiverId: z6.string().min(1),
      content: z6.string().min(1).max(5e3),
      messageType: z6.enum(["text", "image", "file"]).optional().default("text")
    });
  }
});

// server/stripe-connect.ts
import Stripe from "stripe";
import { sql as sql6 } from "drizzle-orm";
async function createConnectAccount(req, res) {
  const userId = req.user?.claims?.sub;
  const rows = await db.execute(sql6`
    SELECT id, email, first_name, last_name,
           stripe_connect_account_id,
           stripe_connect_onboarded
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = rows.rows[0];
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.stripe_connect_account_id && user.stripe_connect_onboarded) {
    res.json({
      accountId: user.stripe_connect_account_id,
      onboarded: true,
      message: "Stripe Connect account already active"
    });
    return;
  }
  let accountId = user.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      country: "CA",
      // Canadian-first
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        mcc: "5815",
        // Digital goods — music
        url: APP_URL,
        product_description: "Music royalty splits via SplitSheet"
      },
      metadata: { splitsheet_user_id: userId }
    });
    accountId = account.id;
    await db.execute(sql6`
      UPDATE users
      SET stripe_connect_account_id = ${accountId},
          stripe_connect_onboarded  = FALSE
      WHERE id = ${userId}
    `);
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${APP_URL}/billing?connect=refresh`,
    return_url: `${APP_URL}/billing?connect=success`,
    type: "account_onboarding"
  });
  res.json({
    accountId,
    onboarded: false,
    onboardingUrl: link.url,
    expiresAt: new Date(link.expires_at * 1e3).toISOString()
  });
}
async function getConnectStatus(req, res) {
  const userId = req.user?.claims?.sub;
  const rows = await db.execute(sql6`
    SELECT stripe_connect_account_id, stripe_connect_onboarded,
           stripe_connect_charges_enabled, stripe_connect_payouts_enabled
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = rows.rows[0];
  if (!user?.stripe_connect_account_id) {
    res.json({ connected: false, onboarded: false });
    return;
  }
  const account = await stripe.accounts.retrieve(user.stripe_connect_account_id);
  const onboarded = account.details_submitted;
  const chargesEnabled = account.charges_enabled;
  const payoutsEnabled = account.payouts_enabled;
  await db.execute(sql6`
    UPDATE users SET
      stripe_connect_onboarded        = ${onboarded},
      stripe_connect_charges_enabled  = ${chargesEnabled},
      stripe_connect_payouts_enabled  = ${payoutsEnabled}
    WHERE id = ${userId}
  `);
  res.json({
    connected: true,
    accountId: account.id,
    onboarded,
    chargesEnabled,
    payoutsEnabled,
    requirements: account.requirements?.currently_due ?? [],
    disabledReason: account.requirements?.disabled_reason ?? null
  });
}
async function getConnectDashboardLink(req, res) {
  const userId = req.user?.claims?.sub;
  const rows = await db.execute(sql6`
    SELECT stripe_connect_account_id, stripe_connect_onboarded
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = rows.rows[0];
  if (!user?.stripe_connect_account_id || !user.stripe_connect_onboarded) {
    res.status(400).json({ error: "Complete Stripe onboarding first" });
    return;
  }
  const loginLink = await stripe.accounts.createLoginLink(user.stripe_connect_account_id);
  res.json({ url: loginLink.url });
}
var stripe, APP_URL;
var init_stripe_connect = __esm({
  "server/stripe-connect.ts"() {
    "use strict";
    init_db();
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2025-08-27.basil"
    });
    APP_URL = process.env.APP_URL ?? "https://splitsheet.ca";
  }
});

// server/payment-service.ts
import Stripe2 from "stripe";
import { sql as sql7 } from "drizzle-orm";
function calculateSplits(totalCents, collaborators) {
  const total = collaborators.reduce((s, c) => s + c.ownershipPct, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Split percentages must sum to 100%. Got: ${total.toFixed(4)}%`);
  }
  const raw = collaborators.map((c) => ({
    ...c,
    exact: totalCents * (c.ownershipPct / 100),
    floor: Math.floor(totalCents * (c.ownershipPct / 100))
  }));
  const totalFloor = raw.reduce((s, r) => s + r.floor, 0);
  let remainder = totalCents - totalFloor;
  const sorted = [...raw].sort((a, b) => b.exact - b.floor - (a.exact - a.floor));
  return collaborators.map((c) => {
    const r = sorted.find((s) => s.userId === c.userId);
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder--;
    return { userId: c.userId, stripeAccountId: c.stripeAccountId, cents: r.floor + extra, ownershipPct: c.ownershipPct };
  });
}
function deductPlatformFee(grossCents, feeBps = PLATFORM_FEE_BPS) {
  const feeCents = Math.round(grossCents * feeBps / 1e4);
  return { netCents: grossCents - feeCents, feeCents };
}
async function enforceAgreement(contractId) {
  const rows = await db.execute(sql7`
    SELECT status, data
    FROM contracts WHERE id = ${contractId} LIMIT 1
  `);
  const contract = rows.rows[0];
  if (!contract) return { allowed: false, reason: "Contract not found" };
  if (!["signed", "locked", "active"].includes(contract.status)) {
    return {
      allowed: false,
      reason: `Contract must be signed before payment. Current status: ${contract.status}`
    };
  }
  const sigRows = await db.execute(sql7`
    SELECT cc.id, cc.email, cc.name,
           COUNT(cs.id) AS sig_count
    FROM contract_collaborators cc
    LEFT JOIN contract_signatures cs
      ON cs.contract_id = cc.contract_id
     AND cs.signer_email = cc.email
    WHERE cc.contract_id = ${contractId}
    GROUP BY cc.id, cc.email, cc.name
    HAVING COUNT(cs.id) = 0
  `);
  if (sigRows.rows.length > 0) {
    const unsigned = sigRows.rows.map((r) => r.name).join(", ");
    return { allowed: false, reason: `Unsigned collaborators: ${unsigned}` };
  }
  return { allowed: true };
}
async function resolvePayees(contractId) {
  const rows = await db.execute(sql7`
    SELECT
      cc.id, cc.name, cc.email,
      cc.ownership_percentage::float AS ownership_pct,
      u.id AS user_id,
      u.stripe_connect_account_id,
      u.stripe_connect_onboarded,
      u.stripe_connect_charges_enabled
    FROM contract_collaborators cc
    LEFT JOIN users u ON u.email = cc.email
    WHERE cc.contract_id = ${contractId}
  `);
  const payees = [];
  const missing = [];
  for (const row of rows.rows) {
    if (!row.stripe_connect_account_id || !row.stripe_connect_onboarded) {
      missing.push(row.name);
      continue;
    }
    payees.push({
      userId: row.user_id,
      email: row.email,
      name: row.name,
      ownershipPct: Number(row.ownership_pct),
      stripeAccountId: row.stripe_connect_account_id
    });
  }
  if (missing.length > 0) {
    throw new Error(
      `These collaborators have not connected Stripe: ${missing.join(", ")}. They must complete Stripe onboarding before payouts can be processed.`
    );
  }
  return payees;
}
async function createSplitPaymentIntent(params) {
  const { contractId, assetId, source, grossCents, currency, description, requesterId } = params;
  const enforcement = await enforceAgreement(contractId);
  if (!enforcement.allowed) {
    throw new Error(`Payment blocked: ${enforcement.reason}`);
  }
  const { netCents, feeCents } = deductPlatformFee(grossCents);
  const revenueResult = await db.execute(sql7`
    INSERT INTO revenue_events
      (asset_id, source, amount, currency, description, metadata)
    VALUES
      (${assetId}, ${source}, ${fromCents(grossCents)}, ${currency},
       ${description}, ${{ contractId, requesterId, feeCents }}::jsonb)
    RETURNING id
  `);
  const revenueEventId = revenueResult.rows[0].id;
  const idempotencyKey = `pi-${revenueEventId}`;
  const intent = await stripe2.paymentIntents.create(
    {
      amount: grossCents,
      currency: currency.toLowerCase(),
      description,
      metadata: {
        revenueEventId,
        contractId,
        assetId,
        source,
        splitsheet_fee_cents: feeCents.toString()
      },
      automatic_payment_methods: { enabled: true }
    },
    { idempotencyKey }
  );
  await db.execute(sql7`
    UPDATE revenue_events
    SET metadata = metadata || ${{ stripePaymentIntentId: intent.id }}::jsonb
    WHERE id = ${revenueEventId}
  `);
  return {
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret,
    netCents,
    feeCents,
    revenueEventId
  };
}
async function executeSplits(params) {
  const { revenueEventId, contractId, paymentIntentId, grossCents, currency } = params;
  const { netCents } = deductPlatformFee(grossCents);
  const payees = await resolvePayees(contractId);
  const splits = calculateSplits(netCents, payees);
  const payouts = [];
  const failedPayees = [];
  for (const split of splits) {
    if (split.cents <= 0) continue;
    const idempotencyKey = `transfer-${revenueEventId}-${split.userId}`;
    try {
      const transfer = await stripe2.transfers.create(
        {
          amount: split.cents,
          currency: currency.toLowerCase(),
          destination: split.stripeAccountId,
          source_transaction: paymentIntentId,
          // links to the original charge
          description: `SplitSheet payout \u2014 ${fromCents(split.cents)} ${currency.toUpperCase()}`,
          metadata: {
            revenueEventId,
            contractId,
            userId: split.userId,
            ownershipPct: split.ownershipPct.toString()
          }
        },
        { idempotencyKey }
      );
      await db.execute(sql7`
        INSERT INTO payout_records
          (revenue_event_id, user_id, asset_id, ownership_percentage,
           amount, currency, status, stripe_transfer_id, processed_at)
        SELECT
          ${revenueEventId}, ${split.userId},
          re.asset_id, ${split.ownershipPct},
          ${fromCents(split.cents)}, ${currency}, 'completed',
          ${transfer.id}, NOW()
        FROM revenue_events re WHERE re.id = ${revenueEventId}
        ON CONFLICT DO NOTHING
      `);
      await db.execute(sql7`
        INSERT INTO user_balances (user_id, total_earned, total_paid, pending_balance, currency)
        VALUES (${split.userId}, ${fromCents(split.cents)}, ${fromCents(split.cents)}, '0', ${currency})
        ON CONFLICT (user_id) DO UPDATE SET
          total_earned    = user_balances.total_earned    + ${fromCents(split.cents)}::decimal,
          total_paid      = user_balances.total_paid      + ${fromCents(split.cents)}::decimal,
          updated_at      = NOW()
      `);
      payouts.push({ userId: split.userId, cents: split.cents, transferId: transfer.id });
      log("TRANSFER_SUCCESS", { userId: split.userId, cents: split.cents, transferId: transfer.id });
    } catch (err) {
      log("TRANSFER_FAILED", { userId: split.userId, cents: split.cents, error: err.message });
      await db.execute(sql7`
        INSERT INTO payout_records
          (revenue_event_id, user_id, asset_id, ownership_percentage,
           amount, currency, status)
        SELECT ${revenueEventId}, ${split.userId}, re.asset_id, ${split.ownershipPct},
               ${fromCents(split.cents)}, ${currency}, 'failed'
        FROM revenue_events re WHERE re.id = ${revenueEventId}
        ON CONFLICT DO NOTHING
      `);
      failedPayees.push(split.userId);
      scheduleRetry({
        revenueEventId,
        userId: split.userId,
        stripeAccountId: split.stripeAccountId,
        cents: split.cents,
        currency,
        idempotencyKey,
        attempt: 1
      });
    }
  }
  return {
    success: failedPayees.length === 0,
    totalPaid: payouts.reduce((s, p) => s + p.cents, 0),
    failedPayees,
    payouts
  };
}
function scheduleRetry(job) {
  if (job.attempt > MAX_ATTEMPTS) {
    log("RETRY_EXHAUSTED", { ...job });
    return;
  }
  const delay = RETRY_DELAYS[job.attempt - 1] ?? 36e5;
  log("RETRY_SCHEDULED", { ...job, delayMs: delay });
  setTimeout(async () => {
    try {
      const transfer = await stripe2.transfers.create(
        {
          amount: job.cents,
          currency: job.currency.toLowerCase(),
          destination: job.stripeAccountId,
          description: `SplitSheet retry payout #${job.attempt}`,
          metadata: { revenueEventId: job.revenueEventId, userId: job.userId, attempt: job.attempt.toString() }
        },
        { idempotencyKey: `${job.idempotencyKey}-retry-${job.attempt}` }
      );
      await db.execute(sql7`
        UPDATE payout_records
        SET status = 'completed', stripe_transfer_id = ${transfer.id}, processed_at = NOW()
        WHERE revenue_event_id = ${job.revenueEventId} AND user_id = ${job.userId}
      `);
      await db.execute(sql7`
        INSERT INTO user_balances (user_id, total_earned, total_paid, pending_balance, currency)
        VALUES (${job.userId}, ${fromCents(job.cents)}, ${fromCents(job.cents)}, '0', ${job.currency})
        ON CONFLICT (user_id) DO UPDATE SET
          total_earned = user_balances.total_earned + ${fromCents(job.cents)}::decimal,
          total_paid   = user_balances.total_paid   + ${fromCents(job.cents)}::decimal,
          updated_at   = NOW()
      `);
      log("RETRY_SUCCESS", { ...job, transferId: transfer.id });
    } catch (err) {
      log("RETRY_FAILED", { ...job, error: err.message });
      scheduleRetry({ ...job, attempt: job.attempt + 1 });
    }
  }, delay);
}
function log(level, data) {
  const entry = {
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    svc: "payment-service",
    ...data
  };
  console.log(JSON.stringify(entry));
}
var stripe2, PLATFORM_FEE_BPS, toCents, fromCents, MAX_ATTEMPTS, RETRY_DELAYS;
var init_payment_service = __esm({
  "server/payment-service.ts"() {
    "use strict";
    init_db();
    stripe2 = new Stripe2(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2025-08-27.basil"
    });
    PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? "250");
    toCents = (dollars) => Math.round(dollars * 100);
    fromCents = (cents) => (cents / 100).toFixed(2);
    MAX_ATTEMPTS = 4;
    RETRY_DELAYS = [6e4, 3e5, 9e5, 36e5];
  }
});

// server/payment-routes.ts
import express from "express";
import Stripe3 from "stripe";
import { z as z7 } from "zod";
import { sql as sql8 } from "drizzle-orm";
function uid(req) {
  return req.user?.claims?.sub ?? "";
}
function registerPaymentRoutes(app) {
  app.post("/api/connect-account", isAuthenticated, async (req, res) => {
    try {
      await createConnectAccount(req, res);
    } catch (err) {
      console.error("[CONNECT ACCOUNT]", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/connect-status", isAuthenticated, async (req, res) => {
    try {
      await getConnectStatus(req, res);
    } catch (err) {
      console.error("[CONNECT STATUS]", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/connect-dashboard", isAuthenticated, async (req, res) => {
    try {
      await getConnectDashboardLink(req, res);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
  app.post("/api/payments/intent", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    try {
      const body = createPaymentSchema.parse(req.body);
      const enforcement = await enforceAgreement(body.contractId);
      if (!enforcement.allowed) {
        return res.status(403).json({ error: enforcement.reason });
      }
      await resolvePayees(body.contractId);
      const result = await createSplitPaymentIntent({
        contractId: body.contractId,
        assetId: body.assetId,
        source: body.source,
        grossCents: toCents(body.grossAmount),
        currency: body.currency,
        description: body.description,
        requesterId: userId
      });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z7.ZodError) {
        return res.status(400).json({ error: "Validation failed", issues: err.errors });
      }
      console.error("[PAYMENT INTENT]", err.message);
      res.status(400).json({ error: err.message });
    }
  });
  app.post("/api/payments/execute-splits", isAuthenticated, async (req, res) => {
    try {
      const body = executeSplitsSchema.parse(req.body);
      const intent = await stripe3.paymentIntents.retrieve(body.paymentIntentId);
      if (intent.status !== "succeeded") {
        return res.status(400).json({
          error: `PaymentIntent status is '${intent.status}'. Must be 'succeeded'.`
        });
      }
      if (intent.metadata?.revenueEventId !== body.revenueEventId) {
        return res.status(403).json({ error: "PaymentIntent does not match revenue event" });
      }
      const result = await executeSplits({
        revenueEventId: body.revenueEventId,
        contractId: body.contractId,
        paymentIntentId: body.paymentIntentId,
        grossCents: toCents(body.grossAmount),
        currency: body.currency
      });
      res.json(result);
    } catch (err) {
      if (err instanceof z7.ZodError) {
        return res.status(400).json({ error: "Validation failed", issues: err.errors });
      }
      console.error("[EXECUTE SPLITS]", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.get("/api/payments/transactions", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const rows = await db.execute(sql8`
      SELECT
        pr.id                  AS payout_id,
        pr.amount,
        pr.currency,
        pr.status,
        pr.ownership_percentage,
        pr.stripe_transfer_id,
        pr.processed_at,
        pr.created_at,
        re.source              AS revenue_source,
        re.description,
        re.period_start,
        re.period_end,
        sa.title               AS song_title,
        sa.artist_name
      FROM payout_records pr
      JOIN revenue_events re ON re.id = pr.revenue_event_id
      JOIN song_assets sa     ON sa.id = pr.asset_id
      WHERE pr.user_id = ${userId}
      ORDER BY pr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);
    const initiated = await db.execute(sql8`
      SELECT
        re.id,
        re.source,
        re.amount,
        re.currency,
        re.description,
        re.created_at,
        sa.title AS song_title,
        COUNT(pr.id) AS payout_count,
        SUM(CASE WHEN pr.status = 'completed' THEN pr.amount ELSE 0 END) AS total_distributed
      FROM revenue_events re
      JOIN song_assets sa    ON sa.id = re.asset_id
      LEFT JOIN payout_records pr ON pr.revenue_event_id = re.id
      WHERE re.metadata->>'requesterId' = ${userId}
      GROUP BY re.id, sa.title
      ORDER BY re.created_at DESC
      LIMIT ${limit}
    `);
    res.json({
      received: rows.rows,
      initiated: initiated.rows
    });
  });
  app.get("/api/payments/balance", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    const rows = await db.execute(sql8`
      SELECT
        ub.total_earned,
        ub.total_paid,
        ub.pending_balance,
        ub.currency,
        ub.updated_at,
        -- Live pending count from payout_records
        COUNT(pr.id) FILTER (WHERE pr.status = 'pending') AS pending_transfers,
        SUM(pr.amount) FILTER (WHERE pr.status = 'pending') AS pending_amount
      FROM user_balances ub
      LEFT JOIN payout_records pr ON pr.user_id = ub.user_id
      WHERE ub.user_id = ${userId}
      GROUP BY ub.user_id, ub.total_earned, ub.total_paid,
               ub.pending_balance, ub.currency, ub.updated_at
    `);
    if (!rows.rows.length) {
      return res.json({
        totalEarned: "0.00",
        totalPaid: "0.00",
        pendingBalance: "0.00",
        pendingTransfers: 0,
        currency: "CAD"
      });
    }
    const bal = rows.rows[0];
    res.json({
      totalEarned: bal.total_earned,
      totalPaid: bal.total_paid,
      pendingBalance: bal.pending_balance,
      pendingTransfers: Number(bal.pending_transfers ?? 0),
      pendingAmount: bal.pending_amount ?? "0.00",
      currency: bal.currency,
      updatedAt: bal.updated_at
    });
  });
  app.post("/api/payments/refund", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    try {
      const { revenueEventId, reason } = refundSchema.parse(req.body);
      const reRows = await db.execute(sql8`
        SELECT re.*, re.metadata->>'stripePaymentIntentId' AS payment_intent_id
        FROM revenue_events re
        WHERE re.id = ${revenueEventId}
          AND re.metadata->>'requesterId' = ${userId}
        LIMIT 1
      `);
      const event = reRows.rows[0];
      if (!event) {
        return res.status(404).json({ error: "Revenue event not found or not owned by you" });
      }
      if (!event.payment_intent_id) {
        return res.status(400).json({ error: "No Stripe PaymentIntent found for this event" });
      }
      const payoutRows = await db.execute(sql8`
        SELECT stripe_transfer_id, user_id, amount
        FROM payout_records
        WHERE revenue_event_id = ${revenueEventId}
          AND status = 'completed'
          AND stripe_transfer_id IS NOT NULL
      `);
      const reversals = [];
      for (const payout of payoutRows.rows) {
        try {
          const reversal = await stripe3.transfers.createReversal(
            payout.stripe_transfer_id,
            {
              metadata: { revenueEventId, reason: reason ?? "requested_by_customer" }
            }
          );
          reversals.push(reversal.id);
          await db.execute(sql8`
            UPDATE payout_records SET status = 'refunded'
            WHERE stripe_transfer_id = ${payout.stripe_transfer_id}
          `);
          await db.execute(sql8`
            UPDATE user_balances SET
              total_earned = total_earned - ${payout.amount}::decimal,
              total_paid   = total_paid   - ${payout.amount}::decimal,
              updated_at   = NOW()
            WHERE user_id = ${payout.user_id}
          `);
        } catch (err) {
          console.error("[REVERSAL FAILED]", payout.stripe_transfer_id, err.message);
        }
      }
      const intent = await stripe3.paymentIntents.retrieve(event.payment_intent_id);
      const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id;
      let refundId = null;
      if (chargeId) {
        const refund = await stripe3.refunds.create({
          charge: chargeId,
          reason: reason ?? "requested_by_customer",
          metadata: { revenueEventId, requestedBy: userId }
        });
        refundId = refund.id;
      }
      res.json({
        refunded: true,
        refundId,
        reversals,
        message: `Refunded ${reversals.length} transfers + original charge`
      });
    } catch (err) {
      if (err instanceof z7.ZodError) {
        return res.status(400).json({ error: "Validation failed", issues: err.errors });
      }
      console.error("[REFUND ERROR]", err.message);
      res.status(500).json({ error: err.message });
    }
  });
  app.post(
    "/api/stripe/connect-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
      let event;
      try {
        if (secret) {
          event = stripe3.webhooks.constructEvent(req.body, sig, secret);
        } else {
          event = JSON.parse(req.body.toString());
          console.warn("[WEBHOOK] Signature verification skipped \u2014 dev mode");
        }
      } catch (err) {
        console.error("[WEBHOOK] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      const idempotencyRows = await db.execute(sql8`
        SELECT 1 FROM payment_events
        WHERE stripe_event_id = ${event.id} LIMIT 1
      `).catch(() => ({ rows: [] }));
      const alreadyProcessed = (idempotencyRows.rows?.length ?? 0) > 0;
      await db.execute(sql8`
        INSERT INTO payment_events
          (stripe_event_id, event_type, payload, processed)
        VALUES
          (${event.id}, ${event.type}, ${JSON.stringify(event.data.object)}::jsonb,
           ${alreadyProcessed})
        ON CONFLICT (stripe_event_id) DO NOTHING
      `).catch(() => {
      });
      if (alreadyProcessed) {
        console.log(`[WEBHOOK] Skipping duplicate event ${event.id}`);
        return res.json({ received: true, duplicate: true });
      }
      try {
        switch (event.type) {
          // ── Payment succeeded → auto-trigger splits ──────────────────────
          case "payment_intent.succeeded": {
            const intent = event.data.object;
            const { revenueEventId, contractId } = intent.metadata ?? {};
            if (revenueEventId && contractId) {
              console.log(`[WEBHOOK] Auto-executing splits for ${revenueEventId}`);
              await executeSplits({
                revenueEventId,
                contractId,
                paymentIntentId: intent.id,
                grossCents: intent.amount,
                currency: intent.currency.toUpperCase()
              });
            }
            break;
          }
          // ── Transfer created → log ───────────────────────────────────────
          case "transfer.created": {
            const transfer = event.data.object;
            console.log(`[WEBHOOK] Transfer created: ${transfer.id} \u2192 ${transfer.destination}`);
            await db.execute(sql8`
              UPDATE payout_records SET status = 'processing'
              WHERE stripe_transfer_id = ${transfer.id}
            `).catch(() => {
            });
            break;
          }
          // ── Transfer failed → mark failed ────────────────────────────────
          case "transfer.failed": {
            const transfer = event.data.object;
            console.error(`[WEBHOOK] Transfer failed: ${transfer.id}`);
            await db.execute(sql8`
              UPDATE payout_records SET status = 'failed'
              WHERE stripe_transfer_id = ${transfer.id}
            `).catch(() => {
            });
            break;
          }
          // ── Payout paid to bank → mark completed ─────────────────────────
          case "payout.paid": {
            const payout = event.data.object;
            console.log(`[WEBHOOK] Payout paid: ${payout.id}`);
            await db.execute(sql8`
              UPDATE payout_records SET status = 'completed', processed_at = NOW()
              WHERE stripe_transfer_id = ${payout.id}
                 OR stripe_transfer_id IN (
                   SELECT stripe_transfer_id FROM payout_records
                   WHERE status = 'processing'
                     AND stripe_transfer_id IS NOT NULL
                 )
            `).catch(() => {
            });
            break;
          }
          // ── Payout failed → alert ────────────────────────────────────────
          case "payout.failed": {
            const payout = event.data.object;
            console.error(`[WEBHOOK] Payout failed: ${payout.id} \u2014 ${payout.failure_message}`);
            await db.execute(sql8`
              UPDATE payout_records SET status = 'failed'
              WHERE stripe_transfer_id = ${payout.id}
            `).catch(() => {
            });
            break;
          }
          // ── Account updated → sync onboarding status ─────────────────────
          case "account.updated": {
            const account = event.data.object;
            await db.execute(sql8`
              UPDATE users SET
                stripe_connect_onboarded        = ${account.details_submitted},
                stripe_connect_charges_enabled  = ${account.charges_enabled},
                stripe_connect_payouts_enabled  = ${account.payouts_enabled}
              WHERE stripe_connect_account_id = ${account.id}
            `).catch(() => {
            });
            console.log(`[WEBHOOK] Account updated: ${account.id} \u2014 charges: ${account.charges_enabled}`);
            break;
          }
          default:
            console.log(`[WEBHOOK] Unhandled event: ${event.type}`);
        }
        await db.execute(sql8`
          UPDATE payment_events SET processed = TRUE
          WHERE stripe_event_id = ${event.id}
        `).catch(() => {
        });
        res.json({ received: true });
      } catch (err) {
        console.error("[WEBHOOK] Processing error:", err.message);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}
var stripe3, createPaymentSchema, executeSplitsSchema, refundSchema;
var init_payment_routes = __esm({
  "server/payment-routes.ts"() {
    "use strict";
    init_db();
    init_replitAuth();
    init_stripe_connect();
    init_payment_service();
    stripe3 = new Stripe3(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2025-08-27.basil"
    });
    createPaymentSchema = z7.object({
      contractId: z7.string().uuid(),
      assetId: z7.string().uuid(),
      source: z7.enum(["streaming", "sync", "performance", "mechanical", "other"]),
      grossAmount: z7.number().positive().max(1e7),
      currency: z7.string().length(3).default("CAD"),
      description: z7.string().min(3).max(500)
    });
    executeSplitsSchema = z7.object({
      revenueEventId: z7.string().uuid(),
      contractId: z7.string().uuid(),
      paymentIntentId: z7.string().min(1),
      grossAmount: z7.number().positive(),
      currency: z7.string().length(3).default("CAD")
    });
    refundSchema = z7.object({
      revenueEventId: z7.string().uuid(),
      reason: z7.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional()
    });
  }
});

// server/security-routes.ts
import { z as z8 } from "zod";
import { sql as sql9 } from "drizzle-orm";
async function registerSecurityRoutes(app) {
  app.post(
    "/api/splits",
    isAuthenticated,
    splitRateLimit,
    async (req, res) => {
      const userId = req.user?.claims?.sub;
      try {
        const body = splitSheetSchema.parse(req.body);
        const prevRows = await db.execute(sql9`
          SELECT version_number, collaborators, content_hash, created_at
          FROM split_versions
          WHERE contract_id = ${body.contractId}
          ORDER BY version_number DESC LIMIT 1
        `);
        const prev = prevRows.rows[0];
        const prevVersion = prev ? Number(prev.version_number) : 0;
        const prevCollabs = prev ? prev.collaborators : void 0;
        const prevHash = prev ? String(prev.content_hash) : void 0;
        const timeSincePrev = prev ? (Date.now() - new Date(prev.created_at).getTime()) / 6e4 : void 0;
        const newVersion = prevVersion + 1;
        const fraudCtx = {
          contractId: body.contractId,
          userId,
          collaborators: body.collaborators,
          prevCollaborators: prevCollabs,
          versionNumber: newVersion,
          ipAddress: req.ip ?? "unknown",
          userAgent: req.headers["user-agent"],
          timeSinceLastVersion: timeSincePrev
        };
        const fraud = calculateRiskScore(fraudCtx);
        await recordFraudEvent(fraudCtx, fraud);
        if (fraud.action === "freeze") {
          await auditLog({
            userId,
            action: "split.freeze_rejected",
            resourceType: "contract",
            resourceId: body.contractId,
            afterState: { riskScore: fraud.riskScore, rules: fraud.rulesTriggered },
            ipAddress: req.ip,
            requestId: req.requestId
          });
          res.status(403).json({
            error: "Split creation frozen due to suspicious activity.",
            riskScore: fraud.riskScore,
            rulesTriggered: fraud.rulesTriggered
          });
          return;
        }
        const contentHash = computeContentHash(
          body.contractId,
          newVersion,
          body.collaborators,
          prevHash
        );
        const totalPct = body.collaborators.reduce(
          (s, c) => s + c.ownershipPercentage,
          0
        );
        const result = await db.execute(sql9`
          INSERT INTO split_versions
            (contract_id, version_number, content_hash, prev_hash,
             status, collaborators, total_pct, created_by)
          VALUES
            (${body.contractId}, ${newVersion}, ${contentHash}, ${prevHash ?? null},
             'draft', ${JSON.stringify(body.collaborators)}::jsonb,
             ${totalPct}, ${userId})
          RETURNING id, version_number, content_hash, status
        `);
        const newSplit = result.rows[0];
        await auditLog({
          userId,
          action: "split.version_create",
          resourceType: "split_version",
          resourceId: newSplit.id,
          beforeState: prev ? { version: prevVersion, hash: prevHash } : null,
          afterState: { version: newVersion, hash: contentHash, fraudScore: fraud.riskScore },
          ipAddress: req.ip,
          requestId: req.requestId
        });
        res.status(201).json({
          splitVersionId: newSplit.id,
          versionNumber: newSplit.version_number,
          contentHash: newSplit.content_hash,
          prevHash: prevHash ?? null,
          status: newSplit.status,
          fraudWarning: fraud.action === "delay" ? {
            message: "This change has been flagged for review. A short delay may apply.",
            riskScore: fraud.riskScore,
            rulesTriggered: fraud.rulesTriggered
          } : null
        });
      } catch (err) {
        if (err instanceof z8.ZodError) {
          res.status(400).json({ error: "Validation failed", issues: err.errors });
        } else {
          console.error("[SPLIT CREATE ERROR]", err);
          res.status(500).json({ error: "Failed to create split version" });
        }
      }
    }
  );
  app.post(
    "/api/splits/:versionId/sign",
    isAuthenticated,
    signRateLimit,
    async (req, res) => {
      const userId = req.user?.claims?.sub;
      const { versionId } = req.params;
      const bodySchema = z8.object({
        signerName: z8.string().min(2).max(200),
        signerEmail: z8.string().email(),
        signerTitle: z8.string().max(100).optional(),
        signatureData: z8.string().min(100),
        // base64 PNG
        mode: z8.enum(["draw", "type"]),
        kycLegalName: z8.string().max(200).optional(),
        kycIdType: z8.string().max(40).optional(),
        kycPhone: z8.string().max(20).optional(),
        kycVerifiedAt: z8.string().datetime().optional()
      });
      try {
        const body = bodySchema.parse(req.body);
        const ip = req.ip ?? "0.0.0.0";
        const sigHash = sha256(
          `${body.signatureData}${body.signerEmail}${(/* @__PURE__ */ new Date()).toISOString()}`
        );
        const phoneHash = body.kycPhone ? sha256(body.kycPhone) : null;
        await db.execute(sql9`
          INSERT INTO split_signatures
            (split_version_id, contract_id, signer_name, signer_email, signer_title,
             signature_data, signature_hash, ip_address, user_agent, mode,
             kyc_legal_name, kyc_id_type, kyc_phone_hash, kyc_verified_at)
          SELECT
            id,
            contract_id,
            ${body.signerName}, ${body.signerEmail}, ${body.signerTitle ?? null},
            ${body.signatureData}, ${sigHash}, ${ip}::inet,
            ${req.headers["user-agent"] ?? null}, ${body.mode},
            ${body.kycLegalName ?? null}, ${body.kycIdType ?? null},
            ${phoneHash}, ${body.kycVerifiedAt ? new Date(body.kycVerifiedAt) : null}
          FROM split_versions WHERE id = ${versionId}::uuid
          ON CONFLICT (split_version_id, signer_email) DO UPDATE SET
            signature_data = EXCLUDED.signature_data,
            signature_hash = EXCLUDED.signature_hash,
            ip_address     = EXCLUDED.ip_address,
            signed_at      = NOW()
        `);
        const versionRow = await db.execute(sql9`
          SELECT sv.id, sv.contract_id, sv.version_number, sv.content_hash, sv.prev_hash,
                 sv.total_pct, sv.collaborators,
                 COUNT(ss.id) AS sig_count
          FROM split_versions sv
          LEFT JOIN split_signatures ss ON ss.split_version_id = sv.id
          WHERE sv.id = ${versionId}::uuid
          GROUP BY sv.id
        `);
        const v = versionRow.rows[0];
        const requiredSigs = v?.collaborators?.length ?? 0;
        const actualSigs = Number(v?.sig_count ?? 0);
        const allSigned = actualSigs >= requiredSigs && requiredSigs > 0;
        if (allSigned) {
          const signedAt = /* @__PURE__ */ new Date();
          const lockExpiry = computeLockExpiry(signedAt);
          await db.execute(sql9`
            UPDATE split_versions SET
              status          = 'signed',
              signed_at       = ${signedAt},
              lock_expires_at = ${lockExpiry}
            WHERE id = ${versionId}::uuid AND status IN ('draft','pending_signatures')
          `);
          await db.execute(sql9`
            INSERT INTO zk_ownership_proofs
              (contract_id, version_number, content_hash, prev_hash, status,
               total_pct, is_valid, is_finalized, signature_count, collaborator_count, signed_at)
            VALUES
              (${v.contract_id}, ${v.version_number}, ${v.content_hash}, ${v.prev_hash},
               'signed', ${v.total_pct}, TRUE, TRUE, ${actualSigs}, ${requiredSigs}, ${signedAt})
          `);
          setTimeout(async () => {
            await db.execute(sql9`
              UPDATE split_versions SET status = 'locked', locked_at = NOW()
              WHERE id = ${versionId}::uuid AND status = 'signed'
            `).catch(() => {
            });
            await db.execute(sql9`
              UPDATE zk_ownership_proofs SET locked_at = NOW()
              WHERE contract_id = ${v.contract_id} AND version_number = ${v.version_number}
            `).catch(() => {
            });
          }, 48 * 60 * 60 * 1e3);
        } else {
          await db.execute(sql9`
            UPDATE split_versions SET status = 'pending_signatures'
            WHERE id = ${versionId}::uuid AND status = 'draft'
          `);
        }
        await auditLog({
          userId,
          action: "split.sign",
          resourceType: "split_version",
          resourceId: versionId,
          afterState: { signerEmail: body.signerEmail, allSigned, sigHash },
          ipAddress: ip,
          requestId: req.requestId
        });
        if (userId) {
          await trackLoginEvent(userId, req, "sign_action").catch(() => {
          });
        }
        res.json({
          signed: true,
          allSigned,
          status: allSigned ? "signed" : "pending_signatures",
          message: allSigned ? "All parties have signed. Contract will lock in 48 hours." : `${actualSigs}/${requiredSigs} signatures collected.`
        });
      } catch (err) {
        if (err instanceof z8.ZodError) {
          res.status(400).json({ error: "Invalid signature data", issues: err.errors });
        } else {
          console.error("[SIGN ERROR]", err);
          res.status(500).json({ error: "Failed to record signature" });
        }
      }
    }
  );
  app.post("/api/disputes", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    try {
      const result = await openDispute(userId, req.body, req);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z8.ZodError) {
        res.status(400).json({ error: "Invalid dispute data", issues: err.errors });
      } else {
        console.error("[DISPUTE OPEN ERROR]", err);
        res.status(500).json({ error: "Failed to open dispute" });
      }
    }
  });
  app.get("/api/disputes", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const rows = await db.execute(sql9`
      SELECT id, contract_id, dispute_type, status, description,
             freeze_payouts, created_at, updated_at
      FROM disputes
      WHERE raised_by = ${userId} OR assigned_to = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  });
  app.patch("/api/disputes/:id/resolve", isAuthenticated, async (req, res) => {
    const adminId = req.user?.claims?.sub;
    const schema = z8.object({
      resolution: z8.enum(["accepted", "rejected"]),
      notes: z8.string().min(5).max(2e3)
    });
    try {
      const { resolution, notes } = schema.parse(req.body);
      await resolveDispute(req.params.id, adminId, resolution, notes, req);
      res.json({ resolved: true, resolution });
    } catch (err) {
      if (err instanceof z8.ZodError) {
        res.status(400).json({ error: "Invalid resolve data", issues: err.errors });
      } else {
        console.error("[DISPUTE RESOLVE ERROR]", err);
        res.status(500).json({ error: "Failed to resolve dispute" });
      }
    }
  });
  app.post("/api/api-keys", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const schema = z8.object({
      name: z8.string().min(1).max(100),
      scopes: z8.array(z8.enum(["verify_ownership", "read_metadata", "write_splits", "*"])),
      expiresAt: z8.string().datetime().optional()
    });
    try {
      const body = schema.parse(req.body);
      const { raw, hash, prefix } = generateApiKey();
      const scopesLiteral = `{${body.scopes.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")}}`;
      await db.execute(sql9`
        INSERT INTO api_keys (owner_id, key_hash, key_prefix, name, scopes, expires_at)
        VALUES (${userId}, ${hash}, ${prefix}, ${body.name},
                ${scopesLiteral}::text[], ${body.expiresAt ?? null}::timestamptz)
      `);
      await auditLog({
        userId,
        action: "api_key.create",
        resourceType: "api_key",
        resourceId: prefix,
        afterState: { name: body.name, scopes: body.scopes },
        ipAddress: req.ip,
        requestId: req.requestId
      });
      res.status(201).json({
        key: raw,
        prefix,
        name: body.name,
        scopes: body.scopes,
        warning: "Store this key securely. It will not be shown again."
      });
    } catch (err) {
      if (err instanceof z8.ZodError) {
        res.status(400).json({ error: "Invalid API key config", issues: err.errors });
      } else {
        console.error("[API KEY CREATE ERROR]", err);
        res.status(500).json({ error: "Failed to create API key" });
      }
    }
  });
  app.get("/api/api-keys", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const rows = await db.execute(sql9`
      SELECT id, key_prefix, name, scopes, rate_limit, is_active,
             last_used_at, expires_at, created_at
      FROM api_keys WHERE owner_id = ${userId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);
  });
  app.delete("/api/api-keys/:id", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    await db.execute(sql9`
      UPDATE api_keys SET is_active = FALSE
      WHERE id = ${req.params.id}::uuid AND owner_id = ${userId}
    `);
    res.json({ revoked: true });
  });
  app.get(
    "/api/raas/verify/:contractId",
    apiRateLimit,
    apiKeyAuth,
    requireScope("verify_ownership"),
    zkVerifyHandler
  );
  app.get(
    "/api/raas/chain/:contractId",
    apiRateLimit,
    apiKeyAuth,
    requireScope("verify_ownership"),
    async (req, res) => {
      const { verifyHashChain: verifyHashChain2 } = await Promise.resolve().then(() => (init_security(), security_exports));
      const result = await verifyHashChain2(req.params.contractId);
      res.json(result);
    }
  );
  app.get("/api/admin/fraud-events", isAuthenticated, async (_req, res) => {
    const rows = await db.execute(sql9`
      SELECT fe.*, crp.current_score, crp.freeze_active
      FROM fraud_events fe
      LEFT JOIN contract_risk_profiles crp ON crp.contract_id = fe.contract_id
      WHERE fe.resolved = FALSE
      ORDER BY fe.created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  });
  app.get("/api/splits/:contractId/history", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const rows = await db.execute(sql9`
      SELECT version_number, content_hash, prev_hash, status,
             total_pct, created_at, signed_at, locked_at,
             jsonb_array_length(collaborators) AS collaborator_count
      FROM split_versions
      WHERE contract_id = ${req.params.contractId}
        AND created_by = ${userId}
      ORDER BY version_number DESC
    `);
    res.json(rows.rows);
  });
  app.get("/api/audit-log", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const rows = await db.execute(sql9`
      SELECT id, action, resource_type, resource_id, ip_address, created_at
      FROM audit_log
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    res.json(rows.rows);
  });
}
var splitRateLimit, signRateLimit, apiRateLimit;
var init_security_routes = __esm({
  "server/security-routes.ts"() {
    "use strict";
    init_db();
    init_replitAuth();
    init_security();
    splitRateLimit = createRateLimiter(10, 6e4);
    signRateLimit = createRateLimiter(5, 6e4);
    apiRateLimit = createRateLimiter(100, 6e4);
  }
});

// server/compliance-routes.ts
import { z as z9 } from "zod";
import { eq as eq2 } from "drizzle-orm";
function requireTermsAccepted(req, res, next) {
  const path3 = req.path;
  const isPublicLegalDocRoute = req.method === "GET" && path3.startsWith("/api/legal/documents/");
  if (!path3.startsWith("/api/") || TERMS_ALLOWLIST.has(path3) || isPublicLegalDocRoute) {
    next();
    return;
  }
  const user = req.user;
  if (!user?.claims?.sub) {
    next();
    return;
  }
  Promise.all(GATED_DOC_TYPES.map((docType) => checkAcceptance(user.claims.sub, docType))).then((results) => {
    if (results.every((r) => r.accepted)) {
      next();
      return;
    }
    res.status(403).json({
      error: "TERMS_NOT_ACCEPTED",
      message: "Please review and accept the current Terms of Service and Privacy Policy to continue.",
      currentVersion: results.find((r) => !r.accepted)?.currentVersion ?? CURRENT_TERMS_VERSION
    });
  }).catch((err) => {
    logger.error("compliance.terms_check_failed", { error: err?.message, route: path3 });
    next();
  });
}
function isAcceptanceCurrent(acceptedVersion, currentVersion) {
  return Boolean(acceptedVersion) && acceptedVersion === currentVersion;
}
async function checkAcceptance(userId, docType) {
  const [latestDoc, acceptance] = await Promise.all([
    storage.getLatestLegalDocument(docType),
    storage.getLegalAcceptance(userId, docType)
  ]);
  const currentVersion = latestDoc?.version ?? CURRENT_TERMS_VERSION;
  return {
    docType,
    currentVersion,
    acceptedVersion: acceptance?.version ?? null,
    acceptedAt: acceptance?.acceptedAt ?? null,
    accepted: isAcceptanceCurrent(acceptance?.version, currentVersion)
  };
}
function registerComplianceRoutes(app) {
  app.get("/api/user/terms-status", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const [tos, privacy] = await Promise.all(
        GATED_DOC_TYPES.map((docType) => checkAcceptance(userId, docType))
      );
      res.json({
        tos,
        privacy,
        // Legacy top-level fields — mirror `tos` so any old client build
        // still functions correctly during rollout.
        currentVersion: tos.currentVersion,
        acceptedVersion: tos.acceptedVersion,
        acceptedAt: tos.acceptedAt,
        accepted: tos.accepted && privacy.accepted
      });
    } catch (err) {
      logger.error("compliance.terms_status_failed", { userId, error: err?.message });
      res.status(500).json({ error: "Failed to load terms status" });
    }
  });
  app.post("/api/user/accept-terms", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    const schema = z9.object({
      docType: z9.enum(GATED_DOC_TYPES).optional(),
      version: z9.string().max(40).optional()
      // legacy field, ignored — version is always the current published one
    });
    try {
      const { docType } = schema.parse(req.body ?? {});
      const docTypesToAccept = docType ? [docType] : GATED_DOC_TYPES;
      const acceptedAt = /* @__PURE__ */ new Date();
      const results = await Promise.all(
        docTypesToAccept.map(async (dt) => {
          const latestDoc = await storage.getLatestLegalDocument(dt);
          const version = latestDoc?.version ?? CURRENT_TERMS_VERSION;
          await storage.createLegalAcceptance({
            userId,
            docType: dt,
            version,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"]
          });
          return { docType: dt, version };
        })
      );
      const tosResult = results.find((r) => r.docType === "tos");
      if (tosResult) {
        await db.update(users).set({ termsAcceptedAt: acceptedAt, termsVersion: tosResult.version }).where(eq2(users.id, userId));
      }
      await storage.trackUserActivity(userId, "terms_accepted", {
        docTypes: results.map((r) => r.docType),
        versions: results.map((r) => r.version),
        ipAddress: req.ip
      });
      res.json({ accepted: true, results, acceptedAt });
    } catch (err) {
      if (err instanceof z9.ZodError) {
        res.status(400).json({ error: "Invalid request" });
      } else {
        logger.error("compliance.accept_terms_failed", { error: err?.message });
        res.status(500).json({ error: "Failed to record terms acceptance" });
      }
    }
  });
  app.get("/api/user/export", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const [
        profile,
        createdContracts,
        collaboratorRecords,
        signatures,
        assets,
        ownership,
        payouts,
        balance,
        activity,
        userNotifications,
        sentOrReceivedMessages
      ] = await Promise.all([
        storage.getUser(userId),
        db.select().from(contracts).where(eq2(contracts.createdBy, userId)),
        db.select().from(contractCollaborators).where(eq2(contractCollaborators.userId, userId)),
        db.select().from(contractSignatures).innerJoin(contractCollaborators, eq2(contractSignatures.collaboratorId, contractCollaborators.id)).where(eq2(contractCollaborators.userId, userId)),
        db.select().from(songAssets).where(eq2(songAssets.createdBy, userId)),
        db.select().from(ownershipRecords).where(eq2(ownershipRecords.userId, userId)),
        db.select().from(payoutRecords).where(eq2(payoutRecords.userId, userId)),
        db.select().from(userBalances).where(eq2(userBalances.userId, userId)),
        db.select().from(userActivity).where(eq2(userActivity.userId, userId)),
        db.select().from(notifications).where(eq2(notifications.userId, userId)),
        db.select().from(messages).where(eq2(messages.senderId, userId))
      ]);
      await storage.trackUserActivity(userId, "data_export_requested", { requestedAt: (/* @__PURE__ */ new Date()).toISOString() });
      res.setHeader("Content-Disposition", `attachment; filename="splitsheet-data-export-${userId}.json"`);
      res.json({
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        jurisdiction: "PIPEDA (Canada) / GDPR-equivalent",
        profile,
        contractsCreated: createdContracts,
        collaboratorRecords,
        signatures: signatures.map((row) => row.contractSignatures ?? row),
        songAssets: assets,
        ownershipRecords: ownership,
        payoutRecords: payouts,
        balance,
        activityLog: activity,
        notifications: userNotifications,
        messagesSent: sentOrReceivedMessages
      });
    } catch (err) {
      logger.error("compliance.export_failed", { userId, error: err?.message });
      res.status(500).json({ error: "Failed to generate data export" });
    }
  });
  app.post("/api/account/delete", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    const schema = z9.object({ confirm: z9.literal(true) });
    try {
      schema.parse(req.body ?? {});
      const anonymizedEmail = `deleted-${userId}@anonymized.splitsheet.ca`;
      await db.update(users).set({
        email: anonymizedEmail,
        firstName: "Deleted",
        lastName: "User",
        profileImageUrl: null,
        bio: null,
        skills: [],
        preferences: null,
        contactInfo: null,
        isActive: false,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(users.id, userId));
      await storage.trackUserActivity(userId, "account_deletion_requested", {
        requestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        ipAddress: req.ip
      });
      logger.info("compliance.account_deleted", { userId });
      req.logout?.(() => {
      });
      res.json({
        deleted: true,
        message: "Your account has been deactivated and personal data anonymized. Financial/legal records required for royalty accounting are retained in anonymized form."
      });
    } catch (err) {
      if (err instanceof z9.ZodError) {
        res.status(400).json({ error: "You must confirm deletion (confirm: true)." });
      } else {
        logger.error("compliance.delete_failed", { userId, error: err?.message });
        res.status(500).json({ error: "Failed to delete account" });
      }
    }
  });
}
var CURRENT_TERMS_VERSION, GATED_DOC_TYPES, TERMS_ALLOWLIST;
var init_compliance_routes = __esm({
  "server/compliance-routes.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_replitAuth();
    init_storage();
    init_logger();
    CURRENT_TERMS_VERSION = "2026-07-12";
    GATED_DOC_TYPES = ["tos", "privacy"];
    TERMS_ALLOWLIST = /* @__PURE__ */ new Set([
      "/api/auth/user",
      "/api/login",
      "/api/logout",
      "/api/callback",
      "/api/health",
      "/api/user/accept-terms",
      "/api/user/terms-status"
    ]);
  }
});

// server/verification-routes.ts
import crypto5 from "crypto";
import { z as z10 } from "zod";
import { and as and2, desc as desc2, eq as eq3, gt, isNull } from "drizzle-orm";
function generateSixDigitCode() {
  return crypto5.randomInt(0, 1e6).toString().padStart(6, "0");
}
function registerVerificationRoutes(app) {
  app.post("/api/verify/send-code", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    try {
      const body = sendCodeSchema.parse(req.body);
      const code = generateSixDigitCode();
      const codeHash = sha256(code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);
      await db.insert(verificationCodes).values({
        userId,
        channel: body.channel,
        destination: body.destination,
        codeHash,
        purpose: body.purpose,
        legalName: body.legalName ?? null,
        idType: body.idType ?? null,
        expiresAt
      });
      const user = await storage.getUser(userId).catch(() => void 0);
      const emailTarget = body.channel === "email" ? body.destination : user?.email;
      let delivery = { delivered: false, mode: emailDeliveryMode };
      if (emailTarget) {
        const template = verificationCodeEmail(code);
        delivery = await sendEmail({ to: emailTarget, ...template });
      }
      res.json({
        sent: true,
        channel: body.channel,
        expiresInSeconds: CODE_TTL_MS / 1e3,
        delivery: delivery.mode,
        // "smtp" (really sent) or "log" (no SMTP configured — check server logs)
        // Only expose the raw code outside production so the flow is testable
        // end-to-end without a paid SMTP provider during development.
        devCode: process.env.NODE_ENV !== "production" && delivery.mode === "log" ? code : void 0
      });
    } catch (err) {
      if (err instanceof z10.ZodError) {
        res.status(400).json({ error: "Invalid request", issues: err.errors });
      } else {
        console.error("[VERIFY SEND CODE]", err);
        res.status(500).json({ error: "Failed to send verification code" });
      }
    }
  });
  app.post("/api/verify/confirm-code", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    try {
      const body = confirmCodeSchema.parse(req.body);
      const [pending] = await db.select().from(verificationCodes).where(
        and2(
          eq3(verificationCodes.userId, userId),
          eq3(verificationCodes.destination, body.destination),
          eq3(verificationCodes.purpose, body.purpose),
          isNull(verificationCodes.consumedAt),
          gt(verificationCodes.expiresAt, /* @__PURE__ */ new Date())
        )
      ).orderBy(desc2(verificationCodes.createdAt)).limit(1);
      if (!pending) {
        res.status(400).json({ error: "No active verification code. Request a new one." });
        return;
      }
      if (pending.attempts >= MAX_ATTEMPTS2) {
        res.status(429).json({ error: "Too many attempts. Request a new code." });
        return;
      }
      const codeHash = sha256(body.code);
      const matches = crypto5.timingSafeEqual(
        Buffer.from(codeHash, "hex"),
        Buffer.from(pending.codeHash, "hex")
      );
      await db.update(verificationCodes).set({ attempts: pending.attempts + 1 }).where(eq3(verificationCodes.id, pending.id));
      if (!matches) {
        res.status(400).json({ error: "Incorrect code." });
        return;
      }
      await db.update(verificationCodes).set({ consumedAt: /* @__PURE__ */ new Date() }).where(eq3(verificationCodes.id, pending.id));
      await storage.trackUserActivity(userId, "identity_verified", {
        legalName: pending.legalName,
        idType: pending.idType,
        destination: pending.destination,
        verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
      res.json({
        verified: true,
        legalName: pending.legalName,
        idType: pending.idType,
        verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      if (err instanceof z10.ZodError) {
        res.status(400).json({ error: "Invalid request", issues: err.errors });
      } else {
        console.error("[VERIFY CONFIRM CODE]", err);
        res.status(500).json({ error: "Failed to verify code" });
      }
    }
  });
  app.get("/api/verify/status", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const [latest] = await db.select().from(userActivity).where(and2(eq3(userActivity.userId, userId), eq3(userActivity.activityType, "identity_verified"))).orderBy(desc2(userActivity.createdAt)).limit(1);
    res.json({ verified: Boolean(latest), verifiedAt: latest?.createdAt ?? null });
  });
}
var CODE_TTL_MS, MAX_ATTEMPTS2, sendCodeSchema, confirmCodeSchema;
var init_verification_routes = __esm({
  "server/verification-routes.ts"() {
    "use strict";
    init_db();
    init_schema();
    init_replitAuth();
    init_storage();
    init_security();
    init_email_service();
    CODE_TTL_MS = 10 * 60 * 1e3;
    MAX_ATTEMPTS2 = 5;
    sendCodeSchema = z10.object({
      destination: z10.string().min(3).max(200),
      // email address or phone number
      channel: z10.enum(["email", "sms"]).default("email"),
      purpose: z10.string().max(50).default("identity_verification"),
      legalName: z10.string().max(200).optional(),
      idType: z10.string().max(40).optional()
    });
    confirmCodeSchema = z10.object({
      destination: z10.string().min(3).max(200),
      code: z10.string().length(6).regex(/^\d{6}$/),
      purpose: z10.string().max(50).default("identity_verification")
    });
  }
});

// server/creator-routes.ts
import { z as z11 } from "zod";
import crypto6 from "crypto";
async function generateUniqueSlCreatorId() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto6.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slCreatorId = `SL-CREATOR-${shortId}`;
    const existing = await storage.getCreatorBySlCreatorId(slCreatorId);
    if (!existing) return slCreatorId;
  }
  return `SL-CREATOR-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}
function registerCreatorRoutes(app) {
  app.get("/api/creators", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const list = await storage.getCreators(userId);
      res.json(list);
    } catch (error) {
      console.error("[CREATORS LIST ERROR]", error);
      res.status(500).json({ message: "Failed to fetch creators" });
    }
  });
  app.post("/api/creators", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const body = insertCreatorSchema.parse(req.body);
      const slCreatorId = await generateUniqueSlCreatorId();
      const creator = await storage.createCreator({
        ...body,
        slCreatorId,
        createdBy: userId
      });
      await auditLog({
        userId,
        action: "creator.create",
        resourceType: "creator",
        resourceId: creator.id,
        afterState: { name: creator.name, type: creator.type, slCreatorId: creator.slCreatorId },
        ipAddress: req.ip
      });
      res.status(201).json(creator);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[CREATOR CREATE ERROR]", error);
        res.status(500).json({ message: "Failed to create creator" });
      }
    }
  });
  app.get("/api/creators/:id", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const creator = await storage.getCreator(req.params.id);
      if (!creator) {
        res.status(404).json({ message: "Creator not found" });
        return;
      }
      if (creator.createdBy !== userId) {
        res.status(403).json({ message: "You do not have access to this creator" });
        return;
      }
      res.json(creator);
    } catch (error) {
      console.error("[CREATOR GET ERROR]", error);
      res.status(500).json({ message: "Failed to fetch creator" });
    }
  });
  app.patch("/api/creators/:id", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const existing = await storage.getCreator(req.params.id);
      if (!existing) {
        res.status(404).json({ message: "Creator not found" });
        return;
      }
      if (existing.createdBy !== userId) {
        res.status(403).json({ message: "You do not have access to this creator" });
        return;
      }
      const updates = insertCreatorSchema.partial().parse(req.body);
      const updated = await storage.updateCreator(req.params.id, updates);
      await auditLog({
        userId,
        action: "creator.update",
        resourceType: "creator",
        resourceId: req.params.id,
        beforeState: existing,
        afterState: updated,
        ipAddress: req.ip
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof z11.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[CREATOR UPDATE ERROR]", error);
        res.status(500).json({ message: "Failed to update creator" });
      }
    }
  });
  app.delete("/api/creators/:id", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const existing = await storage.getCreator(req.params.id);
      if (!existing) {
        res.status(404).json({ message: "Creator not found" });
        return;
      }
      if (existing.createdBy !== userId) {
        res.status(403).json({ message: "You do not have access to this creator" });
        return;
      }
      await storage.deleteCreator(req.params.id);
      await auditLog({
        userId,
        action: "creator.delete",
        resourceType: "creator",
        resourceId: req.params.id,
        beforeState: { name: existing.name, slCreatorId: existing.slCreatorId },
        ipAddress: req.ip
      });
      res.json({ deleted: true });
    } catch (error) {
      console.error("[CREATOR DELETE ERROR]", error);
      res.status(500).json({ message: "Failed to delete creator" });
    }
  });
}
var init_creator_routes = __esm({
  "server/creator-routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_schema();
    init_security();
  }
});

// server/rights-routes.ts
import { z as z12 } from "zod";
function registerRightsRoutes(app) {
  app.get("/api/rights-organizations", isAuthenticated, async (req, res) => {
    try {
      const territory = typeof req.query.territory === "string" ? req.query.territory.toUpperCase() : void 0;
      const orgs = await storage.getRightsOrganizations(territory);
      res.json(orgs);
    } catch (error) {
      console.error("[RIGHTS ORGS ERROR]", error);
      res.status(500).json({ message: "Failed to fetch rights organizations" });
    }
  });
  app.get("/api/territories", isAuthenticated, (_req, res) => {
    res.json(TERRITORIES);
  });
  app.get("/api/rights-profile", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const profile = await storage.getCreatorRightsProfile(userId);
      res.json(profile ?? null);
    } catch (error) {
      console.error("[RIGHTS PROFILE GET ERROR]", error);
      res.status(500).json({ message: "Failed to fetch rights profile" });
    }
  });
  app.put("/api/rights-profile", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const body = insertCreatorRightsProfileSchema.extend({ territory: z12.enum(TERRITORIES).optional() }).parse(req.body);
      const before = await storage.getCreatorRightsProfile(userId);
      const profile = await storage.upsertCreatorRightsProfile(userId, body);
      await auditLog({
        userId,
        action: "rights_profile.update",
        resourceType: "creator_rights_profile",
        resourceId: profile.id,
        beforeState: before,
        afterState: profile,
        ipAddress: req.ip
      });
      res.json(profile);
    } catch (error) {
      if (error instanceof z12.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[RIGHTS PROFILE UPDATE ERROR]", error);
        res.status(500).json({ message: "Failed to update rights profile" });
      }
    }
  });
}
var init_rights_routes = __esm({
  "server/rights-routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_schema();
    init_security();
  }
});

// server/adminAuth.ts
async function isAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }
  try {
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    const isAdminUser = dbUser.role === "admin";
    if (!isAdminUser) {
      res.status(403).json({ message: "Admin access required" });
      return;
    }
    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
var init_adminAuth = __esm({
  "server/adminAuth.ts"() {
    "use strict";
    init_storage();
  }
});

// server/legal-routes.ts
import { z as z13 } from "zod";
function parseDocType(raw) {
  const result = docTypeParamSchema.safeParse(raw);
  return result.success ? result.data : null;
}
function registerLegalRoutes(app) {
  app.get("/api/legal/documents/:docType/latest", async (req, res) => {
    const docType = parseDocType(req.params.docType);
    if (!docType) {
      res.status(400).json({ error: `Invalid docType. Must be one of: ${LEGAL_DOC_TYPES.join(", ")}` });
      return;
    }
    try {
      const doc = await storage.getLatestLegalDocument(docType);
      if (!doc) {
        res.status(404).json({ error: "No published document for this doc type" });
        return;
      }
      res.json({
        docType: doc.docType,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
        markdownBody: doc.markdownBody,
        publishedAt: doc.publishedAt
      });
    } catch (error) {
      console.error("[LEGAL DOCUMENT LATEST ERROR]", error);
      res.status(500).json({ error: "Failed to fetch legal document" });
    }
  });
  app.get("/api/legal/documents/:docType/history", async (req, res) => {
    const docType = parseDocType(req.params.docType);
    if (!docType) {
      res.status(400).json({ error: `Invalid docType. Must be one of: ${LEGAL_DOC_TYPES.join(", ")}` });
      return;
    }
    try {
      const docs = await storage.getLegalDocumentHistory(docType);
      res.json({
        docType,
        versions: docs.map((d) => ({
          version: d.version,
          effectiveDate: d.effectiveDate,
          publishedAt: d.publishedAt
        }))
      });
    } catch (error) {
      console.error("[LEGAL DOCUMENT HISTORY ERROR]", error);
      res.status(500).json({ error: "Failed to fetch legal document history" });
    }
  });
  app.post("/api/legal/documents", isAuthenticated, isAdmin, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const body = insertLegalDocumentSchema.parse(req.body);
      const doc = await storage.createLegalDocument({ ...body, publishedBy: userId });
      await auditLog({
        userId,
        action: "legal_document.publish",
        resourceType: "legal_document",
        resourceId: doc.id,
        afterState: { docType: doc.docType, version: doc.version, effectiveDate: doc.effectiveDate },
        ipAddress: req.ip
      });
      res.status(201).json({
        id: doc.id,
        docType: doc.docType,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
        publishedAt: doc.publishedAt
      });
    } catch (error) {
      if (error instanceof z13.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else if (error?.code === "23505") {
        res.status(409).json({ error: "This doc type + version has already been published" });
      } else {
        console.error("[LEGAL DOCUMENT PUBLISH ERROR]", error);
        res.status(500).json({ message: "Failed to publish legal document" });
      }
    }
  });
}
var docTypeParamSchema;
var init_legal_routes = __esm({
  "server/legal-routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_adminAuth();
    init_schema();
    init_security();
    docTypeParamSchema = z13.enum(LEGAL_DOC_TYPES);
  }
});

// server/license-readiness.ts
function tierForScore(score) {
  if (score >= 100) return "ready";
  if (score >= 75) return "needs_review";
  return "incomplete";
}
function tierLabel(tier) {
  switch (tier) {
    case "ready":
      return "Ready for licensing";
    case "needs_review":
      return "Needs review";
    case "incomplete":
      return "Incomplete rights information";
  }
}
async function recalculateLicenseReadiness(songAssetId) {
  const asset = await storage.getSongAsset(songAssetId);
  if (!asset) {
    throw new Error("Song asset not found");
  }
  const ownership = await storage.getCurrentOwnership(songAssetId);
  const totalPct = ownership.reduce((sum, o) => sum + parseFloat(o.ownershipPercentage), 0);
  const ownershipComplete = ownership.length > 0 && Math.abs(totalPct - 100) < 0.01;
  let agreementsComplete = false;
  let contributorConfirmed = false;
  if (asset.contractId) {
    const [contract, collaborators] = await Promise.all([
      storage.getContract(asset.contractId),
      storage.getContractCollaborators(asset.contractId)
    ]);
    agreementsComplete = contract?.status === "signed";
    contributorConfirmed = collaborators.length > 0 && collaborators.every((c) => c.status === "signed");
  }
  const master = await storage.getMasterAsset(songAssetId);
  const metadataComplete = Boolean(asset.title?.trim()) && Boolean((asset.isrc || master?.isrc)?.trim());
  const existing = await storage.getLicenseReadiness(songAssetId);
  const sampleClearanceStatus = existing?.sampleClearanceStatus ?? "pending";
  const sampleClearanceOk = sampleClearanceStatus === "clear" || sampleClearanceStatus === "not_applicable";
  let licenseScore = 0;
  if (ownershipComplete) licenseScore += LICENSE_SCORE_WEIGHTS.ownership;
  if (contributorConfirmed) licenseScore += LICENSE_SCORE_WEIGHTS.contributors;
  if (agreementsComplete) licenseScore += LICENSE_SCORE_WEIGHTS.agreements;
  if (metadataComplete) licenseScore += LICENSE_SCORE_WEIGHTS.metadata;
  if (sampleClearanceOk) licenseScore += LICENSE_SCORE_WEIGHTS.sampleClearance;
  return await storage.upsertLicenseReadiness(songAssetId, {
    ownershipComplete,
    contributorConfirmed,
    agreementsComplete,
    metadataComplete,
    sampleClearanceStatus,
    licenseScore
  });
}
var LICENSE_SCORE_WEIGHTS;
var init_license_readiness = __esm({
  "server/license-readiness.ts"() {
    "use strict";
    init_storage();
    LICENSE_SCORE_WEIGHTS = {
      ownership: 30,
      contributors: 25,
      agreements: 25,
      metadata: 15,
      sampleClearance: 5
    };
  }
});

// server/rights-ledger-routes.ts
import { z as z14 } from "zod";
import crypto7 from "crypto";
async function generateUniqueSlSongId() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto7.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slSongId = `SL-SONG-${shortId}`;
    const existing = await storage.getSongAssetBySlSongId(slSongId);
    if (!existing) return slSongId;
  }
  return `SL-SONG-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}
async function requireAssetOwner(req, res) {
  const userId = req.user.claims.sub;
  const asset = await storage.getSongAsset(req.params.id);
  if (!asset) {
    res.status(404).json({ message: "Asset not found" });
    return null;
  }
  if (asset.createdBy !== userId) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return asset;
}
function registerRightsLedgerRoutes(app) {
  app.post("/api/assets/:id/assign-sl-id", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const asset = await requireAssetOwner(req, res);
      if (!asset) return;
      const existing = await storage.getSongAsset(req.params.id);
      if (existing?.slSongId) {
        res.json(existing);
        return;
      }
      const slSongId = await generateUniqueSlSongId();
      const updated = await storage.updateSongAsset(req.params.id, { slSongId });
      await auditLog({
        userId,
        action: "song_asset.assign_sl_id",
        resourceType: "song_asset",
        resourceId: req.params.id,
        afterState: { slSongId },
        ipAddress: req.ip
      });
      res.json(updated);
    } catch (error) {
      console.error("[ASSIGN SL-SONG-ID ERROR]", error);
      res.status(500).json({ message: "Failed to assign SL-SONG id" });
    }
  });
  app.get("/api/assets/:id/composition", isAuthenticated, async (req, res) => {
    try {
      const composition = await storage.getCompositionAsset(req.params.id);
      res.json(composition ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch composition rights" });
    }
  });
  app.put("/api/assets/:id/composition", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const asset = await requireAssetOwner(req, res);
      if (!asset) return;
      const body = insertCompositionAssetSchema.omit({ songAssetId: true }).parse(req.body);
      const before = await storage.getCompositionAsset(req.params.id);
      const composition = await storage.upsertCompositionAsset(req.params.id, body);
      await auditLog({
        userId,
        action: "composition_asset.upsert",
        resourceType: "composition_asset",
        resourceId: composition.id,
        beforeState: before,
        afterState: composition,
        ipAddress: req.ip
      });
      await recalculateLicenseReadiness(req.params.id);
      res.json(composition);
    } catch (error) {
      if (error instanceof z14.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[COMPOSITION UPSERT ERROR]", error);
        res.status(500).json({ message: "Failed to save composition rights" });
      }
    }
  });
  app.get("/api/assets/:id/master", isAuthenticated, async (req, res) => {
    try {
      const master = await storage.getMasterAsset(req.params.id);
      res.json(master ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch master rights" });
    }
  });
  app.put("/api/assets/:id/master", isAuthenticated, async (req, res) => {
    const userId = req.user.claims.sub;
    try {
      const asset = await requireAssetOwner(req, res);
      if (!asset) return;
      const body = insertMasterAssetSchema.omit({ songAssetId: true }).parse(req.body);
      const before = await storage.getMasterAsset(req.params.id);
      const master = await storage.upsertMasterAsset(req.params.id, body);
      await auditLog({
        userId,
        action: "master_asset.upsert",
        resourceType: "master_asset",
        resourceId: master.id,
        beforeState: before,
        afterState: master,
        ipAddress: req.ip
      });
      await recalculateLicenseReadiness(req.params.id);
      res.json(master);
    } catch (error) {
      if (error instanceof z14.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[MASTER UPSERT ERROR]", error);
        res.status(500).json({ message: "Failed to save master rights" });
      }
    }
  });
  app.get("/api/assets/:id/license-readiness", isAuthenticated, async (req, res) => {
    try {
      let readiness = await storage.getLicenseReadiness(req.params.id);
      if (!readiness) {
        readiness = await recalculateLicenseReadiness(req.params.id);
      }
      const tier = tierForScore(readiness.licenseScore);
      res.json({ ...readiness, tier, tierLabel: tierLabel(tier) });
    } catch (error) {
      console.error("[LICENSE READINESS GET ERROR]", error);
      res.status(500).json({ message: "Failed to fetch license readiness" });
    }
  });
  app.post(
    "/api/assets/:id/license-readiness/recalculate",
    isAuthenticated,
    async (req, res) => {
      try {
        const asset = await requireAssetOwner(req, res);
        if (!asset) return;
        const readiness = await recalculateLicenseReadiness(req.params.id);
        const tier = tierForScore(readiness.licenseScore);
        res.json({ ...readiness, tier, tierLabel: tierLabel(tier) });
      } catch (error) {
        console.error("[LICENSE READINESS RECALC ERROR]", error);
        res.status(500).json({ message: "Failed to recalculate license readiness" });
      }
    }
  );
  app.patch(
    "/api/assets/:id/license-readiness/sample-clearance",
    isAuthenticated,
    async (req, res) => {
      const userId = req.user.claims.sub;
      try {
        const asset = await requireAssetOwner(req, res);
        if (!asset) return;
        const { status } = z14.object({ status: z14.enum(["clear", "pending", "not_cleared", "not_applicable"]) }).parse(req.body);
        const existing = await storage.getLicenseReadiness(req.params.id);
        await storage.upsertLicenseReadiness(req.params.id, {
          ownershipComplete: existing?.ownershipComplete ?? false,
          contributorConfirmed: existing?.contributorConfirmed ?? false,
          agreementsComplete: existing?.agreementsComplete ?? false,
          metadataComplete: existing?.metadataComplete ?? false,
          sampleClearanceStatus: status,
          licenseScore: existing?.licenseScore ?? 0
        });
        await auditLog({
          userId,
          action: "license_readiness.sample_clearance_update",
          resourceType: "song_asset",
          resourceId: req.params.id,
          beforeState: { sampleClearanceStatus: existing?.sampleClearanceStatus },
          afterState: { sampleClearanceStatus: status },
          ipAddress: req.ip
        });
        const readiness = await recalculateLicenseReadiness(req.params.id);
        const tier = tierForScore(readiness.licenseScore);
        res.json({ ...readiness, tier, tierLabel: tierLabel(tier) });
      } catch (error) {
        if (error instanceof z14.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[SAMPLE CLEARANCE UPDATE ERROR]", error);
          res.status(500).json({ message: "Failed to update sample clearance status" });
        }
      }
    }
  );
  app.get("/api/assets/:id/rights-history", isAuthenticated, async (req, res) => {
    try {
      const [composition, master, ownershipHistory] = await Promise.all([
        storage.getCompositionAsset(req.params.id),
        storage.getMasterAsset(req.params.id),
        storage.getOwnershipHistory(req.params.id)
      ]);
      const relatedIds = [
        ...composition ? [composition.id] : [],
        ...master ? [master.id] : [],
        ...ownershipHistory.map((o) => o.id)
      ];
      const history = await storage.getRightsChangeHistory(req.params.id, relatedIds);
      res.json(history);
    } catch (error) {
      console.error("[RIGHTS HISTORY ERROR]", error);
      res.status(500).json({ message: "Failed to fetch rights history" });
    }
  });
}
var init_rights_ledger_routes = __esm({
  "server/rights-ledger-routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_schema();
    init_security();
    init_license_readiness();
  }
});

// server/routes.ts
import express2 from "express";
import { createServer } from "http";
import Stripe4 from "stripe";
import { z as z15 } from "zod";
import OpenAI2 from "openai";
function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return next();
    const now = Date.now();
    const key = `${userId}:messages`;
    const current = rateLimitStore2.get(key);
    if (!current || now > current.resetTime) {
      rateLimitStore2.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    if (current.count >= maxRequests) {
      return res.status(429).json({
        message: "Too many messages. Please wait before sending more."
      });
    }
    current.count++;
    next();
  };
}
async function generateAIAnalysis(messages2, negotiation) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured - skipping AI analysis");
    return null;
  }
  const conversationContext = messages2.map(
    (msg) => `${msg.messageType === "ai_suggestion" ? "AI" : "User"}: ${msg.message}`
  ).join("\n");
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI negotiation assistant. Analyze the following negotiation conversation and provide:
1. A brief summary of the current negotiation state
2. Key points and concerns raised by each party
3. Potential areas of compromise
4. A strategic suggestion for moving forward
5. Overall sentiment score between -1 (negative) and 1 (positive)

Be concise, objective, and focus on constructive outcomes. End with "Sentiment: [score]"`
        },
        {
          role: "user",
          content: `Negotiation Title: ${negotiation.title}
Description: ${negotiation.description || "No description provided"}

Recent Conversation:
${conversationContext}

Please provide your analysis and strategic recommendation.`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    const aiContent = response.choices[0]?.message?.content || "Unable to generate analysis";
    const sentimentMatch = aiContent.match(
      /sentiment[:\s]*(-?[0-9]*\.?[0-9]+)/i
    );
    const sentimentScore = sentimentMatch ? Math.max(-1, Math.min(1, parseFloat(sentimentMatch[1]))) : 0;
    return {
      suggestion: aiContent,
      analysis: {
        sentimentScore,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        messageCount: messages2.length,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini"
      }
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null;
  }
}
async function registerRoutes(app) {
  await setupAuth(app);
  registerMessageRoutes(app);
  registerComplianceRoutes(app);
  app.use(requireTermsAccepted);
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app.get("/api/contract-templates", isAuthenticated, async (req, res) => {
    try {
      const templates2 = await storage.getContractTemplates();
      res.json(templates2);
    } catch (error) {
      console.error("Error fetching contract templates:", error);
      res.status(500).json({ message: "Failed to fetch contract templates" });
    }
  });
  app.get("/api/contract-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getContractTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Contract template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching contract template:", error);
      res.status(500).json({ message: "Failed to fetch contract template" });
    }
  });
  app.get("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts2 = await storage.getContracts(userId);
      res.json(contracts2);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });
  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(
          req.params.id
        );
        const isCollaborator = collaborators.some((c) => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });
  app.post("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractData = insertContractSchema.parse({
        ...req.body,
        createdBy: userId
      });
      const contract = await storage.createContract(contractData);
      res.json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contract" });
    }
  });
  app.patch("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(
          req.params.id
        );
        const userCollaborator = collaborators.find((c) => c.userId === userId);
        if (!userCollaborator || userCollaborator.status !== "accepted") {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      const updates = req.body;
      const updatedContract = await storage.updateContract(
        req.params.id,
        updates
      );
      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });
  app.delete("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      if (contract.createdBy !== userId) {
        return res.status(403).json({
          message: "Only the contract owner can delete this contract"
        });
      }
      await storage.deleteContract(req.params.id);
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });
  app.get(
    "/api/contracts/:id/collaborators",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const contract = await storage.getContract(req.params.id);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        if (contract.createdBy !== userId) {
          const collaborators2 = await storage.getContractCollaborators(
            req.params.id
          );
          const isCollaborator = collaborators2.some((c) => c.userId === userId);
          if (!isCollaborator) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        const collaborators = await storage.getContractCollaborators(
          req.params.id
        );
        res.json(collaborators);
      } catch (error) {
        console.error("Error fetching collaborators:", error);
        res.status(500).json({ message: "Failed to fetch collaborators" });
      }
    }
  );
  app.post(
    "/api/contracts/:id/collaborators",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const contract = await storage.getContract(req.params.id);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        if (contract.createdBy !== userId) {
          return res.status(403).json({ message: "Only the contract owner can add collaborators" });
        }
        const collaboratorData = insertContractCollaboratorSchema.parse({
          ...req.body,
          contractId: req.params.id
        });
        const collaborator = await storage.addContractCollaborator(collaboratorData);
        res.json(collaborator);
      } catch (error) {
        console.error("Error adding collaborator:", error);
        if (error instanceof z15.ZodError) {
          return res.status(400).json({
            message: "Invalid collaborator data",
            errors: error.errors
          });
        }
        res.status(500).json({ message: "Failed to add collaborator" });
      }
    }
  );
  app.get(
    "/api/contracts/:id/signatures",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const contract = await storage.getContract(req.params.id);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        if (contract.createdBy !== userId) {
          const collaborators = await storage.getContractCollaborators(
            req.params.id
          );
          const isCollaborator = collaborators.some((c) => c.userId === userId);
          if (!isCollaborator) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        const signatures = await storage.getContractSignatures(req.params.id);
        res.json(signatures);
      } catch (error) {
        console.error("Error fetching signatures:", error);
        res.status(500).json({ message: "Failed to fetch signatures" });
      }
    }
  );
  app.post(
    "/api/contracts/:id/signatures",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const contract = await storage.getContract(req.params.id);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        if (contract.createdBy !== userId) {
          const collaborators = await storage.getContractCollaborators(
            req.params.id
          );
          const isCollaborator = collaborators.some((c) => c.userId === userId);
          if (!isCollaborator) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        const signatureData = insertContractSignatureSchema.parse({
          ...req.body,
          contractId: req.params.id,
          userId,
          // Ensure signature is associated with authenticated user
          ipAddress: req.ip,
          userAgent: req.get("User-Agent")
        });
        const signature = await storage.createContractSignature(signatureData);
        res.json(signature);
      } catch (error) {
        console.error("Error creating signature:", error);
        if (error instanceof z15.ZodError) {
          return res.status(400).json({ message: "Invalid signature data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create signature" });
      }
    }
  );
  app.post(
    "/api/contracts/:id/sign",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const contract = await storage.getContract(req.params.id);
        if (!contract) {
          return res.status(404).json({ message: "Contract not found" });
        }
        if (contract.createdBy !== userId) {
          const collaborators = await storage.getContractCollaborators(
            req.params.id
          );
          const isCollaborator = collaborators.some((c) => c.userId === userId);
          if (!isCollaborator) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        const {
          signatureData,
          signerName,
          signerEmail,
          signerTitle,
          signedAt,
          mode
        } = req.body;
        if (!signatureData || typeof signatureData !== "string" || !signatureData.startsWith("data:image/")) {
          return res.status(400).json({
            message: "Invalid signature data. Must be a Base64 PNG data URL."
          });
        }
        const existingMetadata = contract.metadata || {};
        const sigRecord = {
          signatureData,
          signerName: signerName || "Unknown",
          signerEmail: signerEmail || "",
          signerTitle: signerTitle || "",
          signedAt: signedAt || (/* @__PURE__ */ new Date()).toISOString(),
          signedBy: userId,
          signedIp: req.ip,
          signedUserAgent: req.get("User-Agent"),
          mode: mode || "draw"
        };
        const existingSignatures = existingMetadata.signatures || [];
        const alreadySigned = existingSignatures.find(
          (s) => s.signedBy === userId
        );
        const updatedSignatures = alreadySigned ? existingSignatures.map(
          (s) => s.signedBy === userId ? sigRecord : s
        ) : [...existingSignatures, sigRecord];
        const updatedContract = await storage.updateContract(req.params.id, {
          status: "signed",
          metadata: {
            ...existingMetadata,
            ownerSignature: signatureData,
            signedAt: sigRecord.signedAt,
            signedBy: userId,
            signatures: updatedSignatures
          }
        });
        try {
          const collaborators = await storage.getContractCollaborators(
            req.params.id
          );
          for (const c of collaborators) {
            if (c.userId && c.userId !== userId) {
              await storage.createNotification(
                c.userId,
                "Contract Signed",
                `${sigRecord.signerName} has signed "${contract.title}". Your signature may be required.`,
                "info",
                `/contracts/${req.params.id}`
              );
            }
          }
        } catch (_) {
        }
        res.json({ contract: updatedContract, signatureData, sigRecord });
      } catch (error) {
        console.error("Error saving e-signature:", error);
        res.status(500).json({ message: "Failed to save signature" });
      }
    }
  );
  app.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  app.patch("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateData = insertUserSchema.partial().parse(req.body);
      const {
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionTier,
        role,
        isActive,
        ...cleanData
      } = updateData;
      const updatedUser = await storage.updateUser(userId, cleanData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z15.ZodError) {
        return res.status(400).json({
          message: "Invalid profile data",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message
          }))
        });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  app.put("/api/profile/image", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { profileImageUrl } = req.body;
      if (!profileImageUrl) {
        return res.status(400).json({ message: "Profile image URL is required" });
      }
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        profileImageUrl,
        {
          owner: userId,
          visibility: "public"
          // Profile images are public
        }
      );
      const updatedUser = await storage.updateUser(userId, {
        profileImageUrl: normalizedPath
      });
      res.json({ profileImageUrl: normalizedPath });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: "read" /* READ */
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });
  app.post(
    "/api/get-or-create-subscription",
    isAuthenticated,
    async (req, res) => {
      try {
        if (!stripe4) {
          return res.status(503).json({
            error: {
              message: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment."
            }
          });
        }
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user)
          return res.status(404).json({ error: { message: "User not found" } });
        if (!user.email)
          return res.status(400).json({ error: { message: "No email address on file" } });
        const { plan = "pro" } = req.body;
        if (!["pro", "label"].includes(plan)) {
          return res.status(400).json({ error: { message: `Invalid plan: ${plan}` } });
        }
        let customerId = user.stripeCustomerId;
        if (customerId) {
          try {
            const existing = await stripe4.customers.retrieve(customerId);
            if (existing.deleted) customerId = void 0;
          } catch {
            customerId = void 0;
          }
        }
        if (!customerId) {
          const customer = await stripe4.customers.create({
            email: user.email,
            name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
            metadata: { splitsheet_user_id: userId }
          });
          customerId = customer.id;
          await storage.updateUserStripeInfo(
            userId,
            customerId,
            user.stripeSubscriptionId ?? ""
          );
        }
        if (user.stripeSubscriptionId) {
          try {
            const existingSub = await stripe4.subscriptions.retrieve(
              user.stripeSubscriptionId,
              { expand: ["latest_invoice.payment_intent"] }
            );
            const isActive = ["active", "trialing"].includes(
              existingSub.status
            );
            const currentTier = existingSub.metadata?.tier ?? "pro";
            if (isActive && currentTier === plan) {
              return res.json({
                alreadyActive: true,
                plan,
                subscriptionId: existingSub.id
              });
            }
            if (isActive && currentTier !== plan) {
              await stripe4.subscriptions.cancel(user.stripeSubscriptionId);
            }
            if (!isActive && existingSub.status === "incomplete") {
              const secret = existingSub.latest_invoice?.payment_intent?.client_secret;
              if (secret)
                return res.json({
                  subscriptionId: existingSub.id,
                  clientSecret: secret,
                  plan
                });
            }
          } catch (err) {
            console.warn(
              "[SUBSCRIPTION] Could not retrieve existing sub:",
              err.message
            );
          }
        }
        const priceEnvMap = {
          pro: process.env.STRIPE_PRO_PRICE_ID,
          label: process.env.STRIPE_LABEL_PRICE_ID
        };
        const amountMap = { pro: 1900, label: 4900 };
        let priceId;
        if (priceEnvMap[plan]) {
          priceId = priceEnvMap[plan];
        } else {
          console.warn(
            `[SUBSCRIPTION] STRIPE_${plan.toUpperCase()}_PRICE_ID not set \u2014 creating inline price (demo mode).`
          );
          const inlinePrice = await stripe4.prices.create({
            unit_amount: amountMap[plan],
            currency: "cad",
            recurring: { interval: "month" },
            product_data: {
              name: `SplitSheet ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`
            }
          });
          priceId = inlinePrice.id;
        }
        const subscription = await stripe4.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: "default_incomplete",
          expand: ["latest_invoice.payment_intent"],
          metadata: { tier: plan, userId }
        });
        await storage.updateUserStripeInfo(userId, customerId, subscription.id);
        const clientSecret = subscription.latest_invoice?.payment_intent?.client_secret ?? null;
        if (!clientSecret) {
          return res.json({
            subscriptionId: subscription.id,
            alreadyActive: true,
            plan
          });
        }
        return res.json({
          subscriptionId: subscription.id,
          clientSecret,
          plan
        });
      } catch (error) {
        console.error("[SUBSCRIPTION ERROR]", error?.message ?? error);
        return res.status(400).json({
          error: { message: error?.message ?? "Subscription failed" }
        });
      }
    }
  );
  app.post(
    "/api/stripe/webhook",
    express2.raw({ type: "application/json" }),
    async (req, res) => {
      if (!stripe4) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      const sig = req.headers["stripe-signature"];
      let event;
      try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (webhookSecret) {
          event = stripe4.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          event = req.body;
          console.warn(
            "Webhook signature verification skipped - STRIPE_WEBHOOK_SECRET not configured"
          );
        }
      } catch (err) {
        console.error("Webhook signature verification failed:", err);
        return res.status(400).send(`Webhook Error: ${err}`);
      }
      try {
        switch (event.type) {
          case "customer.subscription.created":
          case "customer.subscription.updated":
            const subscription = event.data.object;
            console.log(`Subscription ${event.type}:`, subscription.id);
            if (subscription.customer) {
              const user = await storage.getUserByStripeCustomerId(
                subscription.customer
              );
              if (user) {
                const tier = subscription.metadata?.tier || "pro";
                const subscriptionStatus = subscription.status === "active" ? tier : "free";
                await storage.updateUser(user.id, {
                  subscriptionStatus: subscription.status,
                  subscriptionTier: subscriptionStatus,
                  stripeSubscriptionId: subscription.id
                });
                console.log(
                  `Updated user ${user.id} subscription to ${tier} (${subscription.status})`
                );
              } else {
                console.warn(
                  `User not found for Stripe customer: ${subscription.customer}`
                );
              }
            }
            break;
          case "customer.subscription.deleted":
            const deletedSubscription = event.data.object;
            console.log("Subscription deleted:", deletedSubscription.id);
            if (deletedSubscription.customer) {
              const user = await storage.getUserByStripeCustomerId(
                deletedSubscription.customer
              );
              if (user) {
                await storage.updateUser(user.id, {
                  subscriptionStatus: "cancelled",
                  subscriptionTier: "free",
                  stripeSubscriptionId: null
                });
                console.log(
                  `Updated user ${user.id} to free tier after subscription deletion`
                );
              } else {
                console.warn(
                  `User not found for Stripe customer: ${deletedSubscription.customer}`
                );
              }
            }
            break;
          case "invoice.payment_succeeded":
            const invoice = event.data.object;
            console.log("Payment succeeded for invoice:", invoice.id);
            break;
          case "invoice.payment_failed":
            const failedInvoice = event.data.object;
            console.log("Payment failed for invoice:", failedInvoice.id);
            break;
          default:
            console.log(`Unhandled event type ${event.type}`);
        }
        res.json({ received: true });
      } catch (error) {
        console.error("Error processing webhook:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
  app.post(
    "/api/stripe/cancel-subscription",
    isAuthenticated,
    async (req, res) => {
      try {
        if (!stripe4) {
          return res.status(503).json({
            message: "Stripe is not configured. Please contact support."
          });
        }
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !user.stripeSubscriptionId) {
          return res.status(400).json({ message: "No active subscription found" });
        }
        const subscription = await stripe4.subscriptions.update(
          user.stripeSubscriptionId,
          {
            cancel_at_period_end: true
          }
        );
        res.json({
          message: "Subscription cancelled successfully",
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end * 1e3
        });
      } catch (error) {
        console.error("Subscription cancellation error:", error);
        return res.status(400).json({ error: { message: error.message } });
      }
    }
  );
  app.get(
    "/api/stripe/subscription",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user || !user.stripeSubscriptionId) {
          return res.json({
            hasSubscription: false,
            tier: user?.subscriptionTier || "free",
            status: "inactive"
          });
        }
        if (stripe4) {
          try {
            const subscription = await stripe4.subscriptions.retrieve(
              user.stripeSubscriptionId
            );
            return res.json({
              hasSubscription: subscription.status === "active",
              subscriptionId: subscription.id,
              status: subscription.status,
              tier: subscription.metadata?.tier || user.subscriptionTier || "pro",
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodStart: subscription.current_period_start * 1e3,
              currentPeriodEnd: subscription.current_period_end * 1e3,
              nextBillingDate: subscription.current_period_end * 1e3
            });
          } catch (stripeError) {
            console.error("Stripe API error:", stripeError);
          }
        }
        return res.json({
          hasSubscription: user.subscriptionTier !== "free",
          tier: user.subscriptionTier || "free",
          status: user.subscriptionStatus || "active",
          subscriptionId: user.stripeSubscriptionId,
          // Mock dates for demo purposes when Stripe unavailable
          currentPeriodStart: Math.floor(Date.now() / 1e3) - 30 * 24 * 60 * 60,
          currentPeriodEnd: Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60,
          nextBillingDate: Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60
        });
      } catch (error) {
        console.error("Subscription retrieval error:", error);
        return res.status(500).json({ error: { message: error.message } });
      }
    }
  );
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts2 = await storage.getContracts(userId);
      const now = /* @__PURE__ */ new Date();
      const stats = {
        totalContracts: contracts2.length,
        pendingSignatures: contracts2.filter((c) => c.status === "pending").length,
        completedThisMonth: contracts2.filter((c) => {
          if (c.status !== "signed" || !c.updatedAt) return false;
          const updatedDate = new Date(c.updatedAt);
          return updatedDate.getMonth() === now.getMonth() && updatedDate.getFullYear() === now.getFullYear();
        }).length,
        revenueSplit: contracts2.filter((c) => c.status === "signed").length * 100
        // Simplified: $100 per signed contract
      };
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });
  app.get("/api/analytics", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const analyticsData = await storage.getAnalyticsData(userId);
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });
  app.get("/api/analytics/global", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.trackUserActivity(userId, "admin_analytics_access");
      const analyticsData = await storage.getAnalyticsData();
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching global analytics data:", error);
      res.status(500).json({ message: "Failed to fetch global analytics data" });
    }
  });
  app.post("/api/activity", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const activityEvent = activityEventSchema.parse(req.body);
      await storage.trackUserActivity(
        userId,
        activityEvent.activityType,
        activityEvent.activityData
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking activity:", error);
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to track activity" });
    }
  });
  app.post("/api/activity/batch", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchData = batchActivitiesSchema.parse(req.body);
      await storage.trackUserActivitiesBulk(userId, batchData.activities);
      res.json({ success: true, processed: batchData.activities.length });
    } catch (error) {
      console.error("Error tracking batch activities:", error);
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid batch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to track batch activities" });
    }
  });
  app.get("/api/negotiations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiations2 = await storage.getNegotiations(userId);
      res.json(negotiations2);
    } catch (error) {
      console.error("Error fetching negotiations:", error);
      res.status(500).json({ message: "Failed to fetch negotiations" });
    }
  });
  app.get("/api/negotiations/:id", isAuthenticated, async (req, res) => {
    try {
      const negotiationId = req.params.id;
      const userId = req.user.claims.sub;
      const negotiation = await storage.getNegotiation(negotiationId);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      const hasAccess = negotiation.createdBy === userId || negotiation.participants && negotiation.participants.includes(userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(negotiation);
    } catch (error) {
      console.error("Error fetching negotiation:", error);
      res.status(500).json({ message: "Failed to fetch negotiation" });
    }
  });
  app.post("/api/negotiations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiationData = insertNegotiationSchema.parse({
        ...req.body,
        createdBy: userId
      });
      const negotiation = await storage.createNegotiation(negotiationData);
      res.status(201).json(negotiation);
    } catch (error) {
      console.error("Error creating negotiation:", error);
      if (error instanceof z15.ZodError) {
        return res.status(400).json({ message: "Invalid negotiation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create negotiation" });
    }
  });
  app.patch("/api/negotiations/:id", isAuthenticated, async (req, res) => {
    try {
      const negotiationId = req.params.id;
      const userId = req.user.claims.sub;
      const negotiation = await storage.getNegotiation(negotiationId);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      if (negotiation.createdBy !== userId) {
        return res.status(403).json({ message: "Only the creator can update this negotiation" });
      }
      const updates = req.body;
      const updatedNegotiation = await storage.updateNegotiation(
        negotiationId,
        updates
      );
      res.json(updatedNegotiation);
    } catch (error) {
      console.error("Error updating negotiation:", error);
      res.status(500).json({ message: "Failed to update negotiation" });
    }
  });
  app.get(
    "/api/negotiations/:id/conversations",
    isAuthenticated,
    async (req, res) => {
      try {
        const negotiationId = req.params.id;
        const userId = req.user.claims.sub;
        const negotiation = await storage.getNegotiation(negotiationId);
        if (!negotiation) {
          return res.status(404).json({ message: "Negotiation not found" });
        }
        const hasAccess = negotiation.createdBy === userId || negotiation.participants && negotiation.participants.includes(userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
        const conversations = await storage.getNegotiationConversations(negotiationId);
        res.json(conversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
      }
    }
  );
  app.post(
    "/api/negotiations/:id/conversations",
    isAuthenticated,
    rateLimit(10, 6e4),
    async (req, res) => {
      try {
        const negotiationId = req.params.id;
        const userId = req.user.claims.sub;
        const negotiation = await storage.getNegotiation(negotiationId);
        if (!negotiation) {
          return res.status(404).json({ message: "Negotiation not found" });
        }
        const hasAccess = negotiation.createdBy === userId || negotiation.participants && negotiation.participants.includes(userId);
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
        const conversationData = insertNegotiationConversationSchema.parse({
          ...req.body,
          negotiationId,
          senderId: userId
        });
        const conversation = await storage.addNegotiationConversation(conversationData);
        res.status(201).json(conversation);
        if (negotiation.aiAssistantEnabled && conversationData.messageType === "text") {
          setImmediate(async () => {
            try {
              const conversations = await storage.getNegotiationConversations(negotiationId);
              const recentMessages = conversations.slice(-5);
              const analysis = await generateAIAnalysis(
                recentMessages,
                negotiation
              );
              if (analysis?.suggestion) {
                await storage.addNegotiationConversation({
                  negotiationId,
                  senderId: "ai-assistant",
                  message: analysis.suggestion,
                  messageType: "ai_suggestion",
                  sentimentScore: analysis.analysis.sentimentScore,
                  aiAnalysis: analysis.analysis
                });
              }
            } catch (aiError) {
              console.error("Background AI analysis failed:", aiError);
            }
          });
        }
      } catch (error) {
        console.error("Error adding conversation:", error);
        if (error instanceof z15.ZodError) {
          return res.status(400).json({
            message: "Invalid conversation data",
            errors: error.errors
          });
        }
        res.status(500).json({ message: "Failed to add conversation" });
      }
    }
  );
  app.get(
    "/api/matches/recommendations",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const limit = parseInt(req.query.limit) || 10;
        const recommendations = await storage.getUserRecommendations(
          userId,
          limit
        );
        res.json(recommendations);
      } catch (error) {
        console.error("Error getting recommendations:", error);
        res.status(500).json({ message: "Failed to get recommendations" });
      }
    }
  );
  app.get("/api/matches", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status;
      const matches = await storage.getUserMatches(userId, status);
      res.json(matches);
    } catch (error) {
      console.error("Error getting matches:", error);
      res.status(500).json({ message: "Failed to get matches" });
    }
  });
  app.post("/api/matches", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchData = insertUserMatchSchema.parse({
        ...req.body,
        userId,
        matchScore: typeof req.body.matchScore === "number" ? req.body.matchScore.toFixed(2) : String(req.body.matchScore || "0.80")
      });
      const { matchedUserId, matchScore, matchReason } = matchData;
      const match = await storage.createUserMatch(
        userId,
        matchedUserId,
        matchScore,
        matchReason || "Manual connection"
      );
      await storage.createNotification(
        matchedUserId,
        "New Connection Request",
        `You have a new connection request!`,
        "info",
        `/matches`
      );
      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ message: "Failed to create match" });
    }
  });
  app.patch("/api/matches/:id", isAuthenticated, async (req, res) => {
    try {
      const matchId = req.params.id;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      await storage.updateMatchStatus(matchId, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating match status:", error);
      res.status(500).json({ message: "Failed to update match status" });
    }
  });
  app.get("/api/conversations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });
  app.get(
    "/api/conversations/:userId",
    isAuthenticated,
    async (req, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const otherUserId = req.params.userId;
        const limit = parseInt(req.query.limit) || 50;
        const messages2 = await storage.getConversation(
          currentUserId,
          otherUserId,
          limit
        );
        res.json(messages2.reverse());
      } catch (error) {
        console.error("Error getting conversation:", error);
        res.status(500).json({ message: "Failed to get conversation" });
      }
    }
  );
  app.post(
    "/api/messages",
    isAuthenticated,
    rateLimit(30, 6e4),
    async (req, res) => {
      try {
        const senderId = req.user.claims.sub;
        const messageData = insertMessageSchema.parse({
          ...req.body,
          senderId
        });
        const { receiverId, content, messageType } = messageData;
        const message = await storage.sendMessage(
          senderId,
          receiverId,
          content,
          messageType || "text"
        );
        const sender = await storage.getUser(senderId);
        await storage.createNotification(
          receiverId,
          "New Message",
          `${sender?.firstName || "Someone"} sent you a message`,
          "info",
          `/messages/${senderId}`
        );
        res.status(201).json(message);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    }
  );
  app.patch(
    "/api/conversations/:userId/read",
    isAuthenticated,
    async (req, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const senderId = req.params.userId;
        await storage.markMessagesAsRead(currentUserId, senderId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    }
  );
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadOnly = req.query.unread === "true";
      const notifications2 = await storage.getUserNotifications(
        userId,
        unreadOnly
      );
      res.json(notifications2);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });
  app.patch(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (req, res) => {
      try {
        const notificationId = req.params.id;
        await storage.markNotificationAsRead(notificationId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Failed to mark notification as read" });
      }
    }
  );
  app.patch(
    "/api/notifications/read-all",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.markAllNotificationsAsRead(userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Failed to mark all notifications as read" });
      }
    }
  );
  app.get(
    "/api/admin/users",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const users2 = await storage.getAllUsers(page, limit, search);
        res.json(users2);
      } catch (error) {
        console.error("Error getting users:", error);
        res.status(500).json({ message: "Failed to get users" });
      }
    }
  );
  app.patch(
    "/api/admin/users/:id",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = req.params.id;
        const { isActive, subscriptionTier } = req.body;
        const updatedUser = await storage.updateUser(userId, {
          isActive,
          subscriptionTier,
          updatedAt: /* @__PURE__ */ new Date()
        });
        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    }
  );
  app.get(
    "/api/admin/activity",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const activity = await storage.getRecentActivity(50);
        res.json(activity);
      } catch (error) {
        console.error("Error getting activity:", error);
        res.status(500).json({ message: "Failed to get activity" });
      }
    }
  );
  app.get("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const assets = await storage.getSongAssets(req.user.claims.sub);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });
  app.post("/api/assets", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = { ...req.body, createdBy: userId };
      const asset = await storage.createSongAsset(data);
      await storage.trackUserActivity(userId, "asset_created", {
        assetId: asset.id
      });
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });
  app.get("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });
  app.patch("/api/assets/:id", isAuthenticated, async (req, res) => {
    try {
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) return res.status(404).json({ message: "Asset not found" });
      if (asset.createdBy !== req.user.claims.sub)
        return res.status(403).json({ message: "Access denied" });
      const updated = await storage.updateSongAsset(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update asset" });
    }
  });
  app.get(
    "/api/assets/:id/ownership",
    isAuthenticated,
    async (req, res) => {
      try {
        const ownership = await storage.getCurrentOwnership(req.params.id);
        res.json(ownership);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ownership" });
      }
    }
  );
  app.get(
    "/api/assets/:id/ownership/named",
    isAuthenticated,
    async (req, res) => {
      try {
        const ownership = await storage.getCurrentOwnershipWithNames(req.params.id);
        res.json(ownership);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ownership" });
      }
    }
  );
  app.get(
    "/api/assets/:id/ownership/history",
    isAuthenticated,
    async (req, res) => {
      try {
        const history = await storage.getOwnershipHistory(req.params.id);
        res.json(history);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ownership history" });
      }
    }
  );
  app.post(
    "/api/assets/:id/ownership",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const asset = await storage.getSongAsset(req.params.id);
        if (!asset) return res.status(404).json({ message: "Asset not found" });
        if (asset.createdBy !== userId)
          return res.status(403).json({ message: "Access denied" });
        const record = await storage.createOwnershipRecord({
          ...req.body,
          assetId: req.params.id,
          createdBy: userId,
          version: 1,
          effectiveAt: /* @__PURE__ */ new Date()
        });
        await auditLog({
          userId,
          action: "ownership_record.create",
          resourceType: "ownership_record",
          resourceId: record.id,
          afterState: record,
          ipAddress: req.ip
        });
        await recalculateLicenseReadiness(req.params.id).catch(() => {
        });
        res.status(201).json(record);
      } catch (error) {
        res.status(500).json({ message: "Failed to create ownership record" });
      }
    }
  );
  app.put(
    "/api/assets/:id/ownership",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const asset = await storage.getSongAsset(req.params.id);
        if (!asset) return res.status(404).json({ message: "Asset not found" });
        if (asset.createdBy !== userId)
          return res.status(403).json({ message: "Access denied" });
        const { splits, changeReason } = req.body;
        if (!Array.isArray(splits) || splits.length === 0)
          return res.status(400).json({ message: "splits array is required" });
        const records = await storage.updateOwnershipSplit(
          req.params.id,
          splits,
          userId,
          changeReason
        );
        await auditLog({
          userId,
          action: "ownership_record.update_split",
          resourceType: "ownership_record",
          resourceId: req.params.id,
          beforeState: { changeReason },
          afterState: records,
          ipAddress: req.ip
        });
        await recalculateLicenseReadiness(req.params.id).catch(() => {
        });
        for (const s of splits) {
          if (s.userId !== userId) {
            await storage.createNotification(
              s.userId,
              "Ownership Updated",
              `Your ownership in "${asset.title}" has been updated to ${s.ownershipPercentage}%.`,
              "info",
              `/ownership/${req.params.id}`
            ).catch(() => {
            });
          }
        }
        res.json(records);
      } catch (error) {
        if (error.message?.includes("100%"))
          return res.status(400).json({ message: error.message });
        res.status(500).json({ message: "Failed to update ownership" });
      }
    }
  );
  app.get("/api/assets/:id/revenue", isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getRevenueEvents(req.params.id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue events" });
    }
  });
  app.post(
    "/api/assets/:id/revenue",
    isAuthenticated,
    async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const asset = await storage.getSongAsset(req.params.id);
        if (!asset) return res.status(404).json({ message: "Asset not found" });
        if (asset.createdBy !== userId)
          return res.status(403).json({ message: "Access denied" });
        const event = await storage.recordRevenueEvent({
          ...req.body,
          assetId: req.params.id
        });
        res.status(201).json(event);
      } catch (error) {
        res.status(500).json({ message: "Failed to record revenue event" });
      }
    }
  );
  app.get(
    "/api/revenue/:eventId/payouts/preview",
    isAuthenticated,
    async (req, res) => {
      try {
        const payouts = await storage.calculatePayouts(req.params.eventId);
        res.json(payouts);
      } catch (error) {
        res.status(500).json({ message: error.message || "Failed to calculate payouts" });
      }
    }
  );
  app.post(
    "/api/revenue/:eventId/payouts/execute",
    isAuthenticated,
    async (req, res) => {
      try {
        const payouts = await storage.executePayouts(req.params.eventId);
        res.json(payouts);
      } catch (error) {
        res.status(500).json({ message: error.message || "Failed to execute payouts" });
      }
    }
  );
  app.get("/api/releases", isAuthenticated, async (_req, res) => {
    res.json([]);
  });
  app.get("/api/revenue-entries", isAuthenticated, async (req, res) => {
    try {
      const projectId = String(req.query.projectId ?? "");
      if (!projectId) return res.json([]);
      const assets = await storage.getSongAssetsByContract(projectId);
      const entriesByAsset = await Promise.all(assets.map((a) => storage.getRevenueEvents(a.id)));
      const entries = entriesByAsset.flat().map((e) => ({
        id: e.id,
        source: e.source,
        amount: e.amount,
        currency: e.currency,
        reportingPeriodStart: e.periodStart,
        reportingPeriodEnd: e.periodEnd,
        releaseId: null
      }));
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to fetch revenue entries" });
    }
  });
  app.get("/api/payouts", isAuthenticated, async (req, res) => {
    try {
      const projectId = String(req.query.projectId ?? "");
      if (!projectId) return res.json([]);
      const assets = await storage.getSongAssetsByContract(projectId);
      const revenueEventLists = await Promise.all(assets.map((a) => storage.getRevenueEvents(a.id)));
      const payoutLists = await Promise.all(
        revenueEventLists.flat().map((e) => storage.getPayoutRecordsByRevenueEvent(e.id))
      );
      const payouts = payoutLists.flat().map((p) => ({
        id: p.id,
        contributorId: p.userId,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        revenueEntryId: p.revenueEventId
      }));
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ message: error.message || "Failed to fetch payouts" });
    }
  });
  app.post("/api/contracts/:id/confirmations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      if (contract.createdBy !== userId) return res.status(403).json({ message: "Access denied" });
      const collaborators = await storage.getContractCollaborators(req.params.id);
      const existingConfirmations = await storage.getConfirmationsByContract(req.params.id);
      const newConfirmations = [];
      const crypto8 = await import("crypto");
      for (const collaborator of collaborators) {
        const existing = existingConfirmations.find((c) => c.collaboratorId === collaborator.id);
        if (existing) {
          newConfirmations.push(existing);
          continue;
        }
        const token = crypto8.randomBytes(32).toString("hex");
        const confirmation = await storage.createConfirmation({
          contractId: req.params.id,
          collaboratorId: collaborator.id,
          token,
          status: "pending",
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1e3)
          // 72 hours
        });
        newConfirmations.push(confirmation);
      }
      res.json(newConfirmations);
    } catch (error) {
      console.error("Error generating confirmations:", error);
      res.status(500).json({ message: "Failed to generate confirmations" });
    }
  });
  app.get("/api/contracts/:id/confirmations", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ message: "Contract not found" });
      if (contract.createdBy !== userId) return res.status(403).json({ message: "Access denied" });
      const confirmations2 = await storage.getConfirmationsByContract(req.params.id);
      res.json(confirmations2);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch confirmations" });
    }
  });
  app.get("/api/confirmations/:token", async (req, res) => {
    try {
      const confirmation = await storage.getConfirmationByToken(req.params.token);
      if (!confirmation) return res.status(404).json({ message: "Invalid or expired link" });
      if (confirmation.expiresAt && confirmation.expiresAt < /* @__PURE__ */ new Date()) {
        return res.status(410).json({ message: "This link has expired" });
      }
      const [contract, collaborator, allCollaborators] = await Promise.all([
        storage.getContract(confirmation.contractId),
        storage.getContractCollaborators(confirmation.contractId).then((cols) => cols.find((c) => c.id === confirmation.collaboratorId)),
        storage.getContractCollaborators(confirmation.contractId)
      ]);
      if (!contract || !collaborator) return res.status(404).json({ message: "Contract details not found" });
      res.json({
        confirmation,
        contract: {
          title: contract.title,
          type: contract.type,
          data: contract.data
        },
        collaborator,
        allCollaborators
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch confirmation details" });
    }
  });
  app.post("/api/confirmations/:token/submit", async (req, res) => {
    try {
      const confirmation = await storage.getConfirmationByToken(req.params.token);
      if (!confirmation) return res.status(404).json({ message: "Invalid link" });
      const { status, notes, name, email } = req.body;
      const updates = {
        status,
        notes,
        confirmedAt: /* @__PURE__ */ new Date(),
        ipAddress: req.ip,
        userAgent: req.get("user-agent")
      };
      const updatedConfirmation = await storage.updateConfirmation(confirmation.id, updates);
      if (status === "confirmed") {
        await storage.updateCollaboratorStatus(confirmation.collaboratorId, "signed");
        const allConfirmations = await storage.getConfirmationsByContract(confirmation.contractId);
        const allConfirmed = allConfirmations.every((c) => c.status === "confirmed");
        if (allConfirmed) {
          await storage.updateContract(confirmation.contractId, { status: "signed" });
        }
      }
      res.json(updatedConfirmation);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit confirmation" });
    }
  });
  app.get("/api/earnings", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const [balance, payouts] = await Promise.all([
        storage.getUserEarnings(userId),
        storage.getUserPayouts(userId)
      ]);
      res.json({ balance, payouts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });
  registerConfirmationRoutes(app);
  registerServiceRoutes(app);
  registerOrganizationRoutes(app);
  registerCreatorRoutes(app);
  registerRightsRoutes(app);
  registerRightsLedgerRoutes(app);
  registerLegalRoutes(app);
  registerCopilotRoutes(app);
  registerPaymentRoutes(app);
  await registerSecurityRoutes(app);
  registerVerificationRoutes(app);
  const httpServer = createServer(app);
  return httpServer;
}
var rateLimitStore2, stripe4, stripeKey, openai;
var init_routes = __esm({
  "server/routes.ts"() {
    "use strict";
    init_storage();
    init_replitAuth();
    init_schema();
    init_objectStorage();
    init_objectAcl();
    init_schema();
    init_confirmation_routes();
    init_copilot_routes();
    init_service_routes();
    init_organization_routes();
    init_message_routes();
    init_payment_routes();
    init_security_routes();
    init_compliance_routes();
    init_verification_routes();
    init_creator_routes();
    init_rights_routes();
    init_legal_routes();
    init_adminAuth();
    init_rights_ledger_routes();
    init_security();
    init_license_readiness();
    rateLimitStore2 = /* @__PURE__ */ new Map();
    stripe4 = null;
    stripeKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY;
    if (stripeKey) {
      if (stripeKey.startsWith("sk_")) {
        stripe4 = new Stripe4(stripeKey, {
          apiVersion: "2025-08-27.basil"
        });
        console.log("Stripe initialized with secret key");
      } else {
        console.warn(
          "Invalid Stripe key - key must start with sk_ for server-side usage. Stripe functionality disabled."
        );
      }
    } else {
      console.warn(
        "STRIPE_SECRET_KEY not found - Stripe functionality will be disabled"
      );
    }
    openai = new OpenAI2({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
});

// server/chatbotRoutes.ts
import OpenAI3 from "openai";
import { promises as fs2 } from "fs";
async function loadKnowledgeBase() {
  try {
    const knowledgeBaseContent = await fs2.readFile(
      "/home/ubuntu/splitsheet-platform/chatbot_knowledge_base.md",
      "utf-8"
    );
    return knowledgeBaseContent;
  } catch (error) {
    console.error("Error loading knowledge base:", error);
    return "";
  }
}
function registerChatbotRoutes(app) {
  app.post("/api/chatbot", isAuthenticated, async (req, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "OpenAI API key not configured." });
    }
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Query is required." });
    }
    try {
      const knowledgeBase = await loadKnowledgeBase();
      const response = await openai2.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the SoundLedger Co-pilot, an AI assistant for the SplitSheet platform. Your goal is to assist users with onboarding, walkthroughs, and platform guidance based on the provided knowledge base. Be concise, helpful, and directly answer questions using only the information from the knowledge base. If the answer is not in the knowledge base, state that you don't have enough information to answer.

Knowledge Base:
${knowledgeBase}`
          },
          { role: "user", content: query }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      const botResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
      res.json({ response: botResponse });
    } catch (error) {
      console.error("Error processing chatbot query:", error);
      res.status(500).json({ message: "Error processing your request." });
    }
  });
}
var openai2;
var init_chatbotRoutes = __esm({
  "server/chatbotRoutes.ts"() {
    "use strict";
    init_replitAuth();
    openai2 = new OpenAI3({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
});

// server/static-serve.ts
import express3 from "express";
import fs3 from "fs";
import path2 from "path";
function log2(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app, options = {}) {
  const candidates = [
    path2.resolve(import.meta.dirname, "public"),
    path2.resolve(import.meta.dirname, "..", "dist", "public"),
    path2.resolve(process.cwd(), "dist", "public")
  ];
  const distPath = candidates.find((p) => fs3.existsSync(p));
  if (!distPath) {
    const message = `Could not find the build directory (tried: ${candidates.join(", ")}). Run \`vite build\` / \`npm run build\` first.`;
    if (options.optional) {
      console.warn(`[static] ${message}`);
      return;
    }
    throw new Error(message);
  }
  app.use(express3.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}
var init_static_serve = __esm({
  "server/static-serve.ts"() {
    "use strict";
  }
});

// server/seedData.ts
async function seedContractTemplates() {
  try {
    console.log("Seeding contract templates...");
    const existingTemplates = await db.select().from(contractTemplates);
    if (existingTemplates.length > 0) {
      console.log("Templates already exist, skipping seed");
      return;
    }
    for (const template of templates) {
      await db.insert(contractTemplates).values(template);
    }
    console.log("Contract templates seeded successfully");
  } catch (error) {
    console.error("Error seeding contract templates:", error);
  }
}
var templates;
var init_seedData = __esm({
  "server/seedData.ts"() {
    "use strict";
    init_db();
    init_schema();
    templates = [
      {
        name: "Split Sheet Agreement",
        type: "split-sheet",
        description: "Define ownership percentages and revenue splits for collaborative music projects.",
        template: {
          fields: [
            { name: "title", label: "Song Title", type: "text", required: true },
            { name: "releaseDate", label: "Release Date", type: "date", required: false },
            { name: "collaborators", label: "Collaborators", type: "array", required: true },
            { name: "performanceRoyalties", label: "Performance Royalties", type: "select", required: true },
            { name: "mechanicalRoyalties", label: "Mechanical Royalties", type: "select", required: true },
            { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
          ],
          legalClauses: [
            "All parties agree to the ownership percentages as specified herein.",
            "Revenue splits shall be distributed according to the agreed percentages.",
            "Publishing rights shall be administered according to ownership shares.",
            "This agreement shall be governed by the laws of [State/Country]."
          ]
        }
      },
      {
        name: "Performance Agreement",
        type: "performance",
        description: "Secure bookings with venues, festivals, and event organizers.",
        template: {
          fields: [
            { name: "title", label: "Event Title", type: "text", required: true },
            { name: "venue", label: "Venue", type: "text", required: true },
            { name: "eventDate", label: "Event Date", type: "datetime", required: true },
            { name: "performanceFee", label: "Performance Fee", type: "number", required: true },
            { name: "technicalRequirements", label: "Technical Requirements", type: "textarea", required: false },
            { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
          ],
          legalClauses: [
            "Artist agrees to perform at the specified venue on the agreed date and time.",
            "Venue agrees to provide adequate sound system and technical support.",
            "Payment shall be made within 30 days of performance completion.",
            "Force majeure clause applies to unforeseen circumstances preventing performance."
          ]
        }
      },
      {
        name: "Producer Agreement",
        type: "producer",
        description: "Establish terms for beat licensing, production credits, and royalties.",
        template: {
          fields: [
            { name: "title", label: "Track Title", type: "text", required: true },
            { name: "producerName", label: "Producer Name", type: "text", required: true },
            { name: "beatPrice", label: "Beat Price", type: "number", required: true },
            { name: "royaltyPercentage", label: "Royalty Percentage", type: "number", required: true },
            { name: "creditRequirement", label: "Credit Requirement", type: "text", required: true },
            { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
          ],
          legalClauses: [
            "Producer grants exclusive/non-exclusive rights to the beat as specified.",
            "Artist agrees to provide proper production credits as specified.",
            "Royalty payments shall be made according to the agreed percentage.",
            "Producer retains ownership of the underlying musical composition."
          ]
        }
      },
      {
        name: "Management Agreement",
        type: "management",
        description: "Define roles and responsibilities with your artist manager or booking agent.",
        template: {
          fields: [
            { name: "title", label: "Agreement Title", type: "text", required: true },
            { name: "managerName", label: "Manager Name", type: "text", required: true },
            { name: "commissionRate", label: "Commission Rate", type: "number", required: true },
            { name: "contractDuration", label: "Contract Duration", type: "text", required: true },
            { name: "responsibilities", label: "Manager Responsibilities", type: "textarea", required: true },
            { name: "additionalTerms", label: "Additional Terms", type: "textarea", required: false }
          ],
          legalClauses: [
            "Manager agrees to provide professional representation and career guidance.",
            "Artist agrees to pay the specified commission rate on gross earnings.",
            "Either party may terminate this agreement with 30 days written notice.",
            "Manager shall act in the best interests of the artist at all times."
          ]
        }
      }
    ];
  }
});

// server/transport-security.ts
function configureTrustProxy(app) {
  if (IS_PRODUCTION) {
    app.set("trust proxy", 1);
  }
}
function requireHttps(req, res, next) {
  if (!IS_PRODUCTION) {
    next();
    return;
  }
  const proto = req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim() ?? req.protocol;
  if (proto !== "https") {
    res.status(403).json({
      message: "HTTPS is required. All messaging and API traffic must use TLS."
    });
    return;
  }
  next();
}
function hstsHeader(_req, res, next) {
  if (IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}
function applyTransportSecurity(app) {
  configureTrustProxy(app);
  app.use(hstsHeader);
  app.use(securityHeaders);
  if (IS_PRODUCTION) {
    app.use(requireHttps);
  }
}
var IS_PRODUCTION;
var init_transport_security = __esm({
  "server/transport-security.ts"() {
    "use strict";
    init_security();
    IS_PRODUCTION = process.env.NODE_ENV === "production";
  }
});

// server/db-migrations.ts
import { sql as sql10 } from "drizzle-orm";
async function runCoreSchemaMigrations() {
  await db.execute(sql10`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS stripe_connect_account_id varchar,
      ADD COLUMN IF NOT EXISTS stripe_connect_onboarded boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp,
      ADD COLUMN IF NOT EXISTS terms_version varchar;
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS confirmations (
      id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id    varchar NOT NULL REFERENCES contracts(id),
      collaborator_id varchar NOT NULL REFERENCES contract_collaborators(id),
      status         varchar DEFAULT 'pending',
      token          varchar NOT NULL UNIQUE,
      expires_at     timestamp,
      confirmed_at   timestamp,
      ip_address     varchar,
      user_agent     text,
      notes          text,
      created_at     timestamp DEFAULT now(),
      updated_at     timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS song_assets (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      title       varchar NOT NULL,
      artist_name varchar,
      isrc        varchar,
      created_by  varchar NOT NULL REFERENCES users(id),
      contract_id varchar REFERENCES contracts(id),
      status      varchar DEFAULT 'active',
      metadata    jsonb,
      created_at  timestamp DEFAULT now(),
      updated_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    ALTER TABLE song_assets
      ADD COLUMN IF NOT EXISTS sl_song_id varchar UNIQUE;
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS ownership_records (
      id                   varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id             varchar NOT NULL REFERENCES song_assets(id),
      user_id              varchar NOT NULL REFERENCES users(id),
      ownership_percentage decimal(5,2) NOT NULL,
      role                 varchar NOT NULL,
      version              integer NOT NULL,
      change_reason        text,
      effective_at         timestamp DEFAULT now(),
      created_by           varchar NOT NULL REFERENCES users(id),
      created_at           timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    ALTER TABLE ownership_records
      ADD COLUMN IF NOT EXISTS ownership_type varchar DEFAULT 'composition',
      ADD COLUMN IF NOT EXISTS territory varchar,
      ADD COLUMN IF NOT EXISTS expiration_date timestamp;
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS revenue_events (
      id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id     varchar NOT NULL REFERENCES song_assets(id),
      source       varchar NOT NULL,
      amount       decimal(12,2) NOT NULL,
      currency     varchar DEFAULT 'USD',
      description  text,
      period_start timestamp,
      period_end   timestamp,
      metadata     jsonb,
      created_at   timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS payout_records (
      id                   varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      revenue_event_id     varchar NOT NULL REFERENCES revenue_events(id),
      user_id              varchar NOT NULL REFERENCES users(id),
      asset_id             varchar NOT NULL REFERENCES song_assets(id),
      ownership_percentage decimal(5,2) NOT NULL,
      amount               decimal(12,2) NOT NULL,
      currency             varchar DEFAULT 'USD',
      status               varchar DEFAULT 'pending',
      stripe_transfer_id   varchar,
      processed_at         timestamp,
      created_at           timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS user_balances (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         varchar NOT NULL UNIQUE REFERENCES users(id),
      total_earned    decimal(12,2) DEFAULT '0',
      total_paid      decimal(12,2) DEFAULT '0',
      pending_balance decimal(12,2) DEFAULT '0',
      currency        varchar DEFAULT 'USD',
      updated_at      timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS split_confirmations (
      id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id        varchar NOT NULL REFERENCES contracts(id),
      collaborator_id    varchar NOT NULL REFERENCES contract_collaborators(id),
      token              varchar NOT NULL UNIQUE,
      status             varchar DEFAULT 'not_sent',
      sent_at            timestamp,
      confirmed_at       timestamp,
      expires_at         timestamp,
      confirmed_name     varchar,
      confirmed_email    varchar,
      confirmation_note  text,
      ip_address         varchar,
      user_agent         text,
      created_at         timestamp DEFAULT now(),
      updated_at         timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS payment_events (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_event_id varchar NOT NULL UNIQUE,
      event_type      varchar NOT NULL,
      payload         jsonb,
      processed       boolean DEFAULT false,
      created_at      timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS error_logs (
      id         varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      level      varchar NOT NULL DEFAULT 'error',
      message    text NOT NULL,
      stack      text,
      route      varchar,
      user_id    varchar,
      metadata   jsonb,
      created_at timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key varchar PRIMARY KEY,
      count      integer NOT NULL DEFAULT 0,
      reset_at   timestamp NOT NULL
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS organizations (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      sl_org_id   varchar NOT NULL UNIQUE,
      name        varchar NOT NULL,
      type        varchar NOT NULL DEFAULT 'label',
      email       varchar,
      website     varchar,
      country     varchar,
      created_by  varchar NOT NULL REFERENCES users(id),
      is_active   boolean DEFAULT true,
      created_at  timestamp DEFAULT now(),
      updated_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS organization_members (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar NOT NULL REFERENCES organizations(id),
      user_id         varchar NOT NULL REFERENCES users(id),
      role            varchar NOT NULL DEFAULT 'member',
      invited_by      varchar REFERENCES users(id),
      created_at      timestamp DEFAULT now(),
      UNIQUE (organization_id, user_id)
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members (organization_id);`);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members (user_id);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS organization_api_keys (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar NOT NULL REFERENCES organizations(id),
      name            varchar NOT NULL,
      key_hash        varchar NOT NULL UNIQUE,
      key_prefix      varchar NOT NULL,
      scopes          text[] NOT NULL DEFAULT '{}',
      created_by      varchar NOT NULL REFERENCES users(id),
      last_used_at    timestamp,
      revoked_at      timestamp,
      created_at      timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_org_api_keys_org ON organization_api_keys (organization_id);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      varchar REFERENCES users(id),
      channel      varchar NOT NULL DEFAULT 'email',
      destination  varchar NOT NULL,
      code_hash    varchar NOT NULL,
      purpose      varchar NOT NULL DEFAULT 'identity_verification',
      legal_name   varchar,
      id_type      varchar,
      attempts     integer NOT NULL DEFAULT 0,
      consumed_at  timestamp,
      expires_at   timestamp NOT NULL,
      created_at   timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS rights_organizations (
      id                varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name              varchar NOT NULL,
      territory         varchar NOT NULL,
      organization_type varchar NOT NULL DEFAULT 'pro',
      website           varchar,
      supported_rights  text[] NOT NULL DEFAULT '{}',
      created_at        timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS creators (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      sl_creator_id varchar NOT NULL UNIQUE,
      name        varchar NOT NULL,
      type        varchar NOT NULL DEFAULT 'songwriter',
      email       varchar,
      pro         varchar,
      ipi         varchar,
      isni        varchar,
      bio         text,
      website     varchar,
      created_by  varchar NOT NULL REFERENCES users(id),
      created_at  timestamp DEFAULT now(),
      updated_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_creators_created_by ON creators (created_by);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS creator_rights_profiles (
      id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id            varchar NOT NULL UNIQUE REFERENCES users(id),
      ipi_number         varchar,
      pro_affiliation    varchar,
      territory          varchar DEFAULT 'CA',
      songwriter_status  boolean DEFAULT false,
      publisher_status   boolean DEFAULT false,
      created_at         timestamp DEFAULT now(),
      updated_at         timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS composition_assets (
      id               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      song_asset_id    varchar NOT NULL UNIQUE REFERENCES song_assets(id),
      title            varchar NOT NULL,
      iswc             varchar,
      ownership_status varchar DEFAULT 'pending',
      created_at       timestamp DEFAULT now(),
      updated_at       timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS master_assets (
      id               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      song_asset_id    varchar NOT NULL UNIQUE REFERENCES song_assets(id),
      recording_title  varchar NOT NULL,
      isrc             varchar,
      artist_owner     varchar,
      label_owner      varchar,
      distributor      varchar,
      release_date     timestamp,
      created_at       timestamp DEFAULT now(),
      updated_at       timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS license_readiness (
      id                       varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      song_asset_id            varchar NOT NULL UNIQUE REFERENCES song_assets(id),
      ownership_complete       boolean DEFAULT false,
      contributor_confirmed    boolean DEFAULT false,
      agreements_complete      boolean DEFAULT false,
      metadata_complete        boolean DEFAULT false,
      sample_clearance_status  varchar DEFAULT 'pending',
      license_score            integer NOT NULL DEFAULT 0,
      last_checked_at          timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    INSERT INTO rights_organizations (name, territory, organization_type, website, supported_rights)
    SELECT * FROM (VALUES
      ('SOCAN',        'CA',    'pro',              'https://www.socan.com',      ARRAY['performance_rights']::text[]),
      ('CMRRA',        'CA',    'mro',              'https://www.cmrra.ca',       ARRAY['mechanical_rights']::text[]),
      ('Re:Sound',     'CA',    'neighboring_rights','https://resound.ca',        ARRAY['neighboring_rights']::text[]),
      ('ASCAP',        'US',    'pro',              'https://www.ascap.com',      ARRAY['performance_rights']::text[]),
      ('BMI',          'US',    'pro',              'https://www.bmi.com',        ARRAY['performance_rights']::text[]),
      ('SESAC',        'US',    'pro',              'https://www.sesac.com',      ARRAY['performance_rights']::text[]),
      ('SoundExchange','US',    'neighboring_rights','https://www.soundexchange.com', ARRAY['neighboring_rights']::text[]),
      ('PRS',          'UK',    'pro',              'https://www.prsformusic.com', ARRAY['performance_rights']::text[]),
      ('MCPS',         'UK',    'mro',              'https://www.prsformusic.com/mcps', ARRAY['mechanical_rights']::text[]),
      ('PPL',          'UK',    'neighboring_rights','https://www.ppluk.com',      ARRAY['neighboring_rights']::text[]),
      ('CISAC Member (EU)',    'EU',    'cmo', 'https://www.cisac.org', ARRAY['performance_rights','mechanical_rights']::text[]),
      ('CISAC Member (AU)',    'AU',    'cmo', 'https://www.cisac.org', ARRAY['performance_rights','mechanical_rights']::text[]),
      ('CISAC Member (Other)', 'OTHER', 'cmo', 'https://www.cisac.org', ARRAY['performance_rights','mechanical_rights']::text[])
    ) AS seed(name, territory, organization_type, website, supported_rights)
    WHERE NOT EXISTS (SELECT 1 FROM rights_organizations LIMIT 1);
  `);
}
async function runLegalDocumentMigrations() {
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS legal_documents (
      id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_type       varchar NOT NULL,
      version        varchar NOT NULL,
      effective_date timestamp NOT NULL,
      markdown_body  text NOT NULL,
      published_by   varchar REFERENCES users(id),
      published_at   timestamp DEFAULT now(),
      UNIQUE (doc_type, version)
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS legal_acceptances (
      id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      varchar NOT NULL REFERENCES users(id),
      doc_type     varchar NOT NULL,
      version      varchar NOT NULL,
      accepted_at  timestamp DEFAULT now(),
      ip_address   varchar,
      user_agent   varchar
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances (user_id);`);
  await db.execute(sql10`
    INSERT INTO legal_documents (doc_type, version, effective_date, markdown_body)
    VALUES ('tos', ${SEED_LEGAL_VERSION}, ${SEED_LEGAL_EFFECTIVE_DATE}::timestamp, ${SEED_TOS_MARKDOWN})
    ON CONFLICT (doc_type, version) DO NOTHING;
  `);
  await db.execute(sql10`
    INSERT INTO legal_documents (doc_type, version, effective_date, markdown_body)
    VALUES ('privacy', ${SEED_LEGAL_VERSION}, ${SEED_LEGAL_EFFECTIVE_DATE}::timestamp, ${SEED_PRIVACY_MARKDOWN})
    ON CONFLICT (doc_type, version) DO NOTHING;
  `);
  await db.execute(sql10`
    INSERT INTO legal_acceptances (user_id, doc_type, version, accepted_at)
    SELECT u.id, 'tos', u.terms_version, u.terms_accepted_at
    FROM users u
    WHERE u.terms_accepted_at IS NOT NULL
      AND u.terms_version IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM legal_acceptances la
        WHERE la.user_id = u.id AND la.doc_type = 'tos' AND la.version = u.terms_version
      );
  `);
  await db.execute(sql10`
    INSERT INTO legal_acceptances (user_id, doc_type, version, accepted_at)
    SELECT u.id, 'privacy', ${SEED_LEGAL_VERSION}, u.terms_accepted_at
    FROM users u
    WHERE u.terms_accepted_at IS NOT NULL
      AND u.terms_version = ${SEED_LEGAL_VERSION}
      AND NOT EXISTS (
        SELECT 1 FROM legal_acceptances la
        WHERE la.user_id = u.id AND la.doc_type = 'privacy' AND la.version = ${SEED_LEGAL_VERSION}
      );
  `);
}
async function runSecurityEngineMigrations() {
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS split_versions (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id     varchar NOT NULL,
      version_number  integer NOT NULL,
      content_hash    varchar NOT NULL,
      prev_hash       varchar,
      status          varchar NOT NULL DEFAULT 'draft',
      collaborators   jsonb NOT NULL,
      total_pct       decimal(6,2) NOT NULL,
      created_by      varchar NOT NULL,
      signed_at       timestamp,
      locked_at       timestamp,
      lock_expires_at timestamp,
      created_at      timestamp DEFAULT now(),
      UNIQUE (contract_id, version_number)
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_split_versions_contract ON split_versions (contract_id);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS split_signatures (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      split_version_id uuid NOT NULL REFERENCES split_versions(id) ON DELETE CASCADE,
      contract_id      varchar NOT NULL,
      signer_name      varchar NOT NULL,
      signer_email     varchar NOT NULL,
      signer_title     varchar,
      signature_data   text NOT NULL,
      signature_hash   varchar NOT NULL,
      ip_address       inet,
      user_agent       text,
      mode             varchar NOT NULL DEFAULT 'draw',
      kyc_legal_name   varchar,
      kyc_id_type      varchar,
      kyc_phone_hash   varchar,
      kyc_verified_at  timestamp,
      signed_at        timestamp DEFAULT now(),
      UNIQUE (split_version_id, signer_email)
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS fraud_events (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id    varchar NOT NULL,
      user_id        varchar,
      rule_triggered text NOT NULL,
      risk_score     integer NOT NULL DEFAULT 0,
      action_taken   varchar NOT NULL,
      details        jsonb,
      resolved       boolean NOT NULL DEFAULT false,
      created_at     timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_fraud_events_contract ON fraud_events (contract_id);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS contract_risk_profiles (
      contract_id        varchar PRIMARY KEY,
      current_score      integer NOT NULL DEFAULT 0,
      freeze_active       boolean NOT NULL DEFAULT false,
      freeze_reason       text,
      version_changes     integer NOT NULL DEFAULT 0,
      rapid_change_flag   boolean NOT NULL DEFAULT false,
      last_change_at      timestamp,
      updated_at          timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS audit_log (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       varchar,
      api_key_id    uuid,
      action        varchar NOT NULL,
      resource_type varchar,
      resource_id   varchar,
      before_state  jsonb,
      after_state   jsonb,
      ip_address    inet,
      user_agent    text,
      request_id    varchar,
      created_at    timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id, created_at DESC);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS api_keys (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id     varchar NOT NULL,
      key_hash     varchar NOT NULL UNIQUE,
      key_prefix   varchar NOT NULL,
      name         varchar NOT NULL,
      scopes       text[] NOT NULL DEFAULT '{}',
      rate_limit   integer NOT NULL DEFAULT 100,
      is_active    boolean NOT NULL DEFAULT true,
      last_used_at timestamp,
      expires_at   timestamptz,
      created_at   timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_id);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS login_events (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     varchar NOT NULL,
      event_type  varchar NOT NULL,
      ip_address  inet,
      user_agent  text,
      device_hash varchar,
      risk_score  integer NOT NULL DEFAULT 0,
      created_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events (user_id, created_at DESC);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS user_devices (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      varchar NOT NULL,
      device_hash  varchar NOT NULL,
      ip_address   inet,
      device_name  varchar,
      is_trusted   boolean NOT NULL DEFAULT false,
      last_seen_at timestamp DEFAULT now(),
      created_at   timestamp DEFAULT now(),
      UNIQUE (user_id, device_hash)
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS disputes (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id       varchar NOT NULL,
      split_version_id  uuid,
      raised_by         varchar NOT NULL,
      assigned_to       varchar,
      dispute_type      varchar NOT NULL,
      description       text NOT NULL,
      status            varchar NOT NULL DEFAULT 'open',
      freeze_payouts    boolean NOT NULL DEFAULT false,
      resolution_notes  text,
      resolved_at       timestamp,
      created_at        timestamp DEFAULT now(),
      updated_at        timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes (contract_id);`);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS dispute_transitions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id  uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      from_status varchar,
      to_status   varchar NOT NULL,
      actor_id    varchar NOT NULL,
      note        text,
      created_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`
    CREATE TABLE IF NOT EXISTS zk_ownership_proofs (
      proof_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id        varchar NOT NULL,
      version_number     integer NOT NULL,
      content_hash       varchar NOT NULL,
      prev_hash          varchar,
      status             varchar NOT NULL,
      total_pct          decimal(6,2),
      is_valid           boolean NOT NULL DEFAULT true,
      is_finalized       boolean NOT NULL DEFAULT false,
      is_contested        boolean NOT NULL DEFAULT false,
      signature_count    integer NOT NULL DEFAULT 0,
      collaborator_count integer NOT NULL DEFAULT 0,
      signed_at          timestamp,
      locked_at          timestamp,
      lock_expires_at    timestamp,
      created_at         timestamp DEFAULT now()
    );
  `);
  await db.execute(sql10`CREATE INDEX IF NOT EXISTS idx_zk_proofs_contract ON zk_ownership_proofs (contract_id, version_number DESC);`);
}
var SEED_TOS_MARKDOWN, SEED_PRIVACY_MARKDOWN, SEED_LEGAL_VERSION, SEED_LEGAL_EFFECTIVE_DATE;
var init_db_migrations = __esm({
  "server/db-migrations.ts"() {
    "use strict";
    init_db();
    SEED_TOS_MARKDOWN = `SoundLedger Technologies Inc. \u2013 SplitSheet Product \xB7 Governing Law: Ontario, Canada

## 1. Acceptance of Terms
By accessing or using SplitSheet ("Platform"), you agree to these Terms. If you do not agree, do not use the Platform.

## 2. Platform Liability
SplitSheet acts solely as a platform to facilitate agreements and is **not a party to any agreement between users**. We are not responsible for disputes, performance, or enforcement of user-created agreements.

## 3. User Responsibility
Users are solely responsible for the **accuracy, legality, and enforceability** of the agreements they create.

## 4. As-Is Disclaimer
The Platform and all documents are provided **"as-is" without guarantees or warranties**, express or implied.

## 5. No Legal Advice
SplitSheet is **not a law firm** and does not provide legal advice. All templates, documents, and tools are provided for general informational purposes only and may not be suitable for every situation.

Users are strongly encouraged to seek **independent legal advice** from a qualified lawyer before entering into any agreement.

## 6. Intellectual Property
All content, logos, and trademarks on SplitSheet are the **exclusive property of SoundLedger Technologies Inc.**

## 7. Dispute Resolution
Disputes arising from use of the Platform will be resolved in the following order:
- Mutual negotiation
- Mediation
- Arbitration (costs shared equally)

## 8. Eligibility
- Must be 18+ or age of majority in your jurisdiction
- Must have authority to enter binding agreements

## 9. User Accounts & Content
- Maintain account security
- You own all uploaded content
- You grant SplitSheet a limited license to operate the platform

## 10. Payments & Subscriptions
- Fees may apply; payments are non-refundable unless required by law
- Pricing may change with notice

## 11. Termination
Accounts may be suspended or terminated for violating terms, fraudulent activity, or abuse.

## 12. Limitation of Liability
SplitSheet is **not liable for indirect or consequential damages**, and total liability is limited to fees paid in the last 12 months.

## 13. Changes
We may update these Terms; continued use constitutes acceptance.`;
    SEED_PRIVACY_MARKDOWN = `SoundLedger Technologies Inc. \u2013 SplitSheet Product \xB7 GDPR & Canadian Privacy Law Aligned

## 1. Information We Collect
- **Account info:** name, email, username
- **Contract data:** royalty splits, ownership percentages, agreement terms
- **Usage data:** device info, IP address, interaction data

## 2. How We Use Information
- Operate the platform
- Store agreements
- Improve user experience
- Ensure security

## 3. Data Sharing
We **do NOT sell user data**. We may share with cloud providers, payment processors, or legal authorities if required.

## 4. Data Storage & Security
- Stored securely with encryption
- Access controls and secure authentication

## 5. Your Rights (Canada / GDPR)
You have the right to access, correct, or request deletion of your data.

## 6. Data Retention
Retained while your account is active and as required for legal compliance.

## 7. Platform Liability
SplitSheet is **not responsible for the content or legality** of user-created agreements.

## 8. Children
Platform is not for users under 18.

## 9. Dispute Resolution
Privacy-related disputes follow: negotiation \u2192 mediation \u2192 arbitration (costs shared equally).

## 10. Changes
Policy updates may occur; continued use constitutes acceptance.`;
    SEED_LEGAL_VERSION = "2026-07-12";
    SEED_LEGAL_EFFECTIVE_DATE = "2026-07-12";
  }
});

// server/boot-check.ts
function assertRuntimeEnv() {
  const missing = [];
  const hasDb = Boolean(
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL
  );
  if (!hasDb) missing.push("DATABASE_URL (or NEON_DATABASE_URL)");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");
  const isProd = process.env.NODE_ENV === "production" || isVercelRuntime();
  const useLocalAuth2 = useLocalAuthProvider();
  if (isProd) {
    if (process.env.LOCAL_DEV === "true") {
      throw new Error(
        "LOCAL_DEV=true is not allowed when NODE_ENV=production / Vercel. Set LOCAL_DEV=false and use AUTH_PROVIDER=local for operator login."
      );
    }
    if (useLocalAuth2) {
    } else {
      if (!process.env.REPL_ID) missing.push("REPL_ID");
      if (!process.env.REPLIT_DOMAINS) {
        missing.push(
          "REPLIT_DOMAINS (hostname only) \u2014 or set AUTH_PROVIDER=local"
        );
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. In Vercel, ensure these are enabled for Production (and Preview), then Redeploy.`
    );
  }
}
var init_boot_check = __esm({
  "server/boot-check.ts"() {
    "use strict";
    init_runtime();
  }
});

// server/app.ts
var app_exports = {};
__export(app_exports, {
  getApp: () => getApp
});
import express4 from "express";
function isStripeWebhookPath(req) {
  return STRIPE_WEBHOOK_PATHS.has(req.path);
}
async function runBootMigrations() {
  await runCoreSchemaMigrations();
  await runSecurityEngineMigrations();
  await runLegalDocumentMigrations();
  log2("Database schema up to date");
}
async function buildApp() {
  assertRuntimeEnv();
  const app = express4();
  applyTransportSecurity(app);
  console.log("Environment loaded");
  console.log(
    "OpenAI API (CoPilot):",
    process.env.OPENAI_API_KEY ? "Configured" : "Missing \u2014 offline fallback only"
  );
  console.log(
    "Message encryption:",
    process.env.FIELD_ENCRYPTION_SECRET || process.env.SESSION_SECRET ? "AES-256-GCM at rest" : "Dev key \u2014 set FIELD_ENCRYPTION_SECRET for production"
  );
  if (useLocalAuthProvider()) {
    console.log("[auth] AUTH_PROVIDER=local (operator /api/login)");
  }
  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    return express4.json({ limit: "1mb" })(req, res, next);
  });
  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    return express4.urlencoded({ extended: false })(req, res, next);
  });
  app.use(sanitizeMiddleware);
  app.use("/api", createPgRateLimiter(300, 6e4, "global-api"));
  app.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const sensitive = path3.startsWith("/api/messages") || path3.startsWith("/api/conversations");
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      if (!sensitive) capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path3.startsWith("/api")) {
        let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } else if (sensitive) {
          logLine += " :: [redacted]";
        }
        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "\u2026";
        }
        log2(logLine);
      }
    });
    next();
  });
  const skipMigrations = shouldSkipBootMigrations() && !useLocalAuthProvider();
  if (skipMigrations) {
    log2("Skipping boot migrations (SKIP_BOOT_MIGRATIONS or Vercel runtime)");
  } else {
    try {
      await runBootMigrations();
    } catch (err) {
      logger.fatal("startup.migration_failed", {
        message: err?.message,
        stack: err?.stack
      });
      console.error("FATAL: database migrations failed:", err);
      if (isVercelRuntime()) {
        throw err;
      }
      process.exit(1);
    }
  }
  if (!skipMigrations) {
    await seedContractTemplates();
  }
  const server = await registerRoutes(app);
  registerChatbotRoutes(app);
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    logger.error("request.unhandled_error", {
      route: req.path,
      method: req.method,
      status,
      message,
      stack: err.stack
    });
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });
  if (isVercelRuntime()) {
    log2("Vercel runtime: API-only Express (static via outputDirectory)");
  } else if (app.get("env") === "development") {
    const viteModule = "./vite";
    const { setupVite } = await import(viteModule);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  return { app, server };
}
function getApp() {
  if (!cached) {
    cached = buildApp().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
var cached, STRIPE_WEBHOOK_PATHS;
var init_app = __esm({
  "server/app.ts"() {
    "use strict";
    init_loadEnv();
    init_routes();
    init_chatbotRoutes();
    init_static_serve();
    init_seedData();
    init_transport_security();
    init_security();
    init_db_migrations();
    init_logger();
    init_runtime();
    init_boot_check();
    cached = null;
    STRIPE_WEBHOOK_PATHS = /* @__PURE__ */ new Set([
      "/api/stripe/webhook",
      "/api/stripe/connect-webhook"
    ]);
  }
});

// server/vercel-entry.ts
import express5 from "express";
function bootFailureApp(err) {
  const message = err instanceof Error ? err.message : "Application failed to start";
  console.error("[vercel-boot] boot failed:", message);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  const app = express5();
  app.use((_req, res) => {
    res.status(503).json({
      error: "SERVICE_UNAVAILABLE",
      message,
      hint: "Set Production env: DATABASE_URL or NEON_DATABASE_URL, SESSION_SECRET, LOCAL_DEV=false, AUTH_PROVIDER=local. Then Redeploy."
    });
  });
  return app;
}
var bridge = express5();
var realApp = null;
var bootPromise = null;
async function ensureApp() {
  if (realApp) return realApp;
  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        const { getApp: getApp2 } = await Promise.resolve().then(() => (init_app(), app_exports));
        const { app } = await getApp2();
        realApp = app;
        return app;
      } catch (err) {
        realApp = bootFailureApp(err);
        return realApp;
      }
    })();
  }
  return bootPromise;
}
bridge.use(async (req, res, next) => {
  try {
    const app = await ensureApp();
    app(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: err instanceof Error ? err.message : "Boot failed"
      });
    }
  }
});
var vercel_entry_default = bridge;
export {
  vercel_entry_default as default
};
