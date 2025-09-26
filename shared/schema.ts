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
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, pro, label
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
