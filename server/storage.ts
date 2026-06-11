import {
  users,
  contracts,
  contractTemplates,
  contractCollaborators,
  contractSignatures,
  userActivity,
  profileViews,
  negotiations,
  negotiationConversations,
  userMatches,
  messages,
  notifications,
  confirmations,
  songAssets,
  ownershipRecords,
  revenueEvents,
  payoutRecords,
  userBalances,
  releases,
  revenueEntries,
  payouts,
  clients,
  serviceProjects,
  projectContributors,
  creators,
  organizations,
  organizationMembers,
  apiKeys,
  ownershipEvents,
  type User,
  type UpsertUser,
  type Contract,
  type InsertContract,
  type ContractTemplate,
  type InsertContractTemplate,
  type ContractCollaborator,
  type InsertContractCollaborator,
  type ContractSignature,
  type InsertContractSignature,
  type UserMatch,
  type Message,
  type Notification,
  type Confirmation,
  type InsertConfirmation,
  type Negotiation,
  type NegotiationConversation,
  type SongAsset,
  type InsertSongAsset,
  type OwnershipRecord,
  type InsertOwnershipRecord,
  type RevenueEvent,
  type InsertRevenueEvent,
  type PayoutRecord,
  type UserBalance,
  type Release,
  type InsertRelease,
  type RevenueEntry,
  type InsertRevenueEntry,
  type Payout,
  type InsertPayout,
  type Client,
  type InsertClient,
  type ServiceProject,
  type InsertServiceProject,
  type ProjectContributor,
  type InsertProjectContributor,
  type Creator,
  type InsertCreator,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type ApiKey,
  type InsertApiKey,
  type OwnershipEvent,
  type InsertOwnershipEvent,
} from "@shared/schema";

import { db } from "./db";
import { eq, desc, and, or, sql, count, gte, lt, max } from "drizzle-orm";

export interface IStorage {
  getUserContracts(userId: string): Promise<any[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;

  getContractTemplates(): Promise<ContractTemplate[]>;
  getContractTemplate(id: string): Promise<ContractTemplate | undefined>;
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;

  getContracts(userId: string): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, updates: Partial<Contract>): Promise<Contract>;
  deleteContract(id: string): Promise<void>;

  getContractCollaborators(contractId: string): Promise<ContractCollaborator[]>;
  addContractCollaborator(collaborator: InsertContractCollaborator): Promise<ContractCollaborator>;
  updateCollaboratorStatus(id: string, status: string): Promise<ContractCollaborator>;

  createContractSignature(signature: InsertContractSignature): Promise<ContractSignature>;
  getContractSignatures(contractId: string): Promise<ContractSignature[]>;

  getAnalyticsData(userId?: string): Promise<any>;
  trackUserActivity(userId: string, activityType: string, activityData?: any): Promise<void>;
  trackUserActivitiesBulk(userId: string, activities: Array<{ activityType: string; activityData?: any }>): Promise<void>;

  getUserRecommendations(userId: string, limit?: number): Promise<any[]>;
  createUserMatch(userId: string, matchedUserId: string, matchScore: number, matchReason: string): Promise<any>;
  updateMatchStatus(matchId: string, status: string): Promise<void>;
  getUserMatches(userId: string, status?: string): Promise<any[]>;

  sendMessage(senderId: string, receiverId: string, content: string, messageType?: string): Promise<any>;
  getConversation(userId1: string, userId2: string, limit?: number): Promise<any[]>;
  getUserConversations(userId: string): Promise<any[]>;
  markMessagesAsRead(userId: string, senderId: string): Promise<void>;

  createNotification(userId: string, title: string, content: string, type: string, actionUrl?: string): Promise<any>;
  getUserNotifications(userId: string, unreadOnly?: boolean): Promise<any[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  trackProfileView(viewerId: string | null, profileId: string): Promise<void>;

  getAllUsers(page: number, limit: number, search: string): Promise<any[]>;
  getRecentActivity(limit: number): Promise<any[]>;

  getNegotiations(userId: string): Promise<any[]>;
  getNegotiation(id: string): Promise<any>;
  createNegotiation(negotiation: any): Promise<any>;
  updateNegotiation(id: string, updates: any): Promise<any>;
  getNegotiationConversations(negotiationId: string): Promise<any[]>;
  addNegotiationConversation(conversation: any): Promise<any>;

  createSongAsset(asset: InsertSongAsset): Promise<SongAsset>;
  getSongAssets(userId: string): Promise<SongAsset[]>;
  getSongAsset(id: string): Promise<SongAsset | undefined>;
  updateSongAsset(id: string, updates: Partial<SongAsset>): Promise<SongAsset>;

  createOwnershipRecord(record: InsertOwnershipRecord): Promise<OwnershipRecord>;
  getCurrentOwnership(assetId: string): Promise<OwnershipRecord[]>;
  getOwnershipHistory(assetId: string): Promise<OwnershipRecord[]>;
  updateOwnershipSplit(
    assetId: string,
    splits: Array<{ userId: string; ownershipPercentage: string; role: string }>,
    changedBy: string,
    changeReason?: string
  ): Promise<OwnershipRecord[]>;

  recordRevenueEvent(event: InsertRevenueEvent): Promise<RevenueEvent>;
  getRevenueEvents(assetId: string): Promise<RevenueEvent[]>;
  calculatePayouts(revenueEventId: string): Promise<PayoutRecord[]>;
  executePayouts(revenueEventId: string): Promise<PayoutRecord[]>;

  getUserEarnings(userId: string): Promise<UserBalance | null>;
  getUserPayouts(userId: string): Promise<PayoutRecord[]>;

  getConfirmationByToken(token: string): Promise<Confirmation | undefined>;
  getConfirmationsByContract(contractId: string): Promise<Confirmation[]>;
  createConfirmation(confirmation: InsertConfirmation): Promise<Confirmation>;
  updateConfirmation(id: string, updates: Partial<Confirmation>): Promise<Confirmation>;

  createRelease(release: InsertRelease): Promise<Release>;
  getRelease(id: string): Promise<Release | undefined>;
  getReleasesByProjectId(projectId: string): Promise<Release[]>;
  updateRelease(id: string, updates: Partial<Release>): Promise<Release>;

  createRevenueEntry(revenueEntry: InsertRevenueEntry): Promise<RevenueEntry>;
  getRevenueEntriesByProjectId(projectId: string): Promise<RevenueEntry[]>;
  getRevenueEntriesByReleaseId(releaseId: string): Promise<RevenueEntry[]>;

  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayoutsByProjectId(projectId: string): Promise<Payout[]>;
  getPayoutsByContributorId(contributorId: string): Promise<Payout[]>;
  updatePayoutStatus(id: string, status: string): Promise<Payout>;

  // Service Business
  getClients(operatorId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<Client>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  getServiceProjects(operatorId: string): Promise<ServiceProject[]>;
  getServiceProjectsByClient(clientId: string): Promise<ServiceProject[]>;
  getServiceProject(id: string): Promise<ServiceProject | undefined>;
  createServiceProject(project: InsertServiceProject): Promise<ServiceProject>;
  updateServiceProject(id: string, updates: Partial<ServiceProject>): Promise<ServiceProject>;
  deleteServiceProject(id: string): Promise<void>;

  getProjectContributors(projectId: string): Promise<ProjectContributor[]>;
  addProjectContributor(contributor: InsertProjectContributor): Promise<ProjectContributor>;
  updateProjectContributor(id: string, updates: Partial<ProjectContributor>): Promise<ProjectContributor>;
  removeProjectContributor(id: string): Promise<void>;
  getContributorByToken(token: string): Promise<ProjectContributor | undefined>;
  confirmContributor(token: string, ip: string): Promise<ProjectContributor>;
  generateConfirmationTokens(projectId: string): Promise<ProjectContributor[]>;

  // Identity Layer — Creators
  getCreators(operatorId: string): Promise<Creator[]>;
  getCreator(id: string): Promise<Creator | undefined>;
  createCreator(data: InsertCreator): Promise<Creator>;
  updateCreator(id: string, updates: Partial<Creator>): Promise<Creator>;
  deleteCreator(id: string): Promise<void>;

  // Identity Layer — Organizations
  getOrganizations(operatorId: string): Promise<Organization[]>;
  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(data: InsertOrganization): Promise<Organization>;
  updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization>;
  deleteOrganization(id: string): Promise<void>;

  // Org Members
  getOrgMembers(orgId: string): Promise<OrganizationMember[]>;
  addOrgMember(data: InsertOrganizationMember): Promise<OrganizationMember>;
  removeOrgMember(orgId: string, userId: string): Promise<void>;
  updateOrgMemberRole(orgId: string, userId: string, role: string): Promise<OrganizationMember>;

  // API Keys
  getApiKeys(orgId: string): Promise<ApiKey[]>;
  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<void>;
  getApiKeyByHash(hash: string): Promise<ApiKey | undefined>;

  // Ownership Events (immutable append-only)
  appendOwnershipEvent(event: InsertOwnershipEvent): Promise<OwnershipEvent>;
  getOwnershipEvents(songAssetId: string): Promise<OwnershipEvent[]>;
}

export class DatabaseStorage implements IStorage {

  // ---------------- USERS ----------------
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserContracts(userId: string) {
    return db.select().from(contracts).where(eq(contracts.userId, userId));
  }

  async getUserByStripeCustomerId(id: string) {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, id));
    return user;
  }

  async upsertUser(userData: UpsertUser) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: { ...userData, updatedAt: new Date() },
    }).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>) {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId: string) {
    const [user] = await db.update(users)
      .set({ stripeCustomerId, stripeSubscriptionId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // ---------------- CONTRACTS ----------------
  async getContracts(userId: string) {
    return db.select().from(contracts).where(eq(contracts.createdBy, userId));
  }

  async getContract(id: string) {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract;
  }

  async createContract(contract: any) {
    const [c] = await db.insert(contracts).values(contract).returning();
    return c;
  }

  async updateContract(id: string, updates: any) {
    const [c] = await db.update(contracts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return c;
  }

  async deleteContract(id: string) {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // ---------------- USER MATCHES (FIXED) ----------------
  async getUserMatches(userId: string, status?: string) {
    const conditions = [eq(userMatches.userId, userId)];

    if (status) {
      conditions.push(eq(userMatches.status, status));
    }

    return db.select()
      .from(userMatches)
      .where(and(...conditions));
  }

  async updateMatchStatus(matchId: string, status: string) {
    await db.update(userMatches)
      .set({ status })
      .where(eq(userMatches.id, matchId));
  }

  async createUserMatch(userId: string, matchedUserId: string, matchScore: number, matchReason: string) {
    const [match] = await db.insert(userMatches).values({
      userId,
      matchedUserId,
      matchScore,
      matchReason,
    }).returning();

    return match;
  }

  // ---------------- PLACEHOLDER OTHERS ----------------
  async sendMessage() { return {}; }
  async getConversation() { return []; }
  async getUserConversations() { return []; }
  async markMessagesAsRead() {}

  async createNotification() { return {}; }
  async getUserNotifications() { return []; }
  async markNotificationAsRead() {}
  async markAllNotificationsAsRead() {}

  async trackProfileView() {}

  async getAllUsers() { return []; }
  async getRecentActivity() { return []; }

  async getNegotiations() { return []; }
  async getNegotiation() { return {}; }
  async createNegotiation() { return {}; }
  async updateNegotiation() { return {}; }
  async getNegotiationConversations() { return []; }
  async addNegotiationConversation() { return {}; }

  async createSongAsset(asset: any) {
    const [a] = await db.insert(songAssets).values(asset).returning();
    return a;
  }
  async getSongAssets(userId: string) {
    return db.select().from(songAssets).where(eq(songAssets.createdBy, userId)).orderBy(desc(songAssets.createdAt));
  }
  async getSongAsset(id: string) {
    const [a] = await db.select().from(songAssets).where(eq(songAssets.id, id));
    return a;
  }
  async updateSongAsset(id: string, updates: any) {
    const [a] = await db.update(songAssets).set({ ...updates, updatedAt: new Date() }).where(eq(songAssets.id, id)).returning();
    return a;
  }

  async createOwnershipRecord(record: any) {
    const [r] = await db.insert(ownershipRecords).values(record).returning();
    return r;
  }
  async getCurrentOwnership(assetId: string) {
    return db.select().from(ownershipRecords).where(eq(ownershipRecords.assetId, assetId)).orderBy(desc(ownershipRecords.createdAt));
  }
  async getOwnershipHistory(assetId: string) {
    return db.select().from(ownershipRecords).where(eq(ownershipRecords.assetId, assetId)).orderBy(desc(ownershipRecords.createdAt));
  }
  async updateOwnershipSplit() { return []; }

  async recordRevenueEvent(event: any) {
    const [e] = await db.insert(revenueEvents).values(event).returning();
    return e;
  }
  async getRevenueEvents(assetId: string) {
    return db.select().from(revenueEvents).where(eq(revenueEvents.assetId, assetId)).orderBy(desc(revenueEvents.createdAt));
  }
  async calculatePayouts() { return []; }
  async executePayouts() { return []; }

  async getUserEarnings() { return null; }
  async getUserPayouts() { return []; }

  async getConfirmationByToken() { return undefined; }
  async getConfirmationsByContract() { return []; }
  async createConfirmation() { return {} as any; }
  async updateConfirmation() { return {} as any; }

  async createRelease() { return {} as any; }
  async getRelease() { return undefined; }
  async getReleasesByProjectId() { return []; }
  async updateRelease() { return {} as any; }

  async createRevenueEntry(entry: any) {
    const [e] = await db.insert(revenueEntries).values(entry).returning();
    return e;
  }
  async getRevenueEntriesByProjectId(projectId: string) {
    return db.select().from(revenueEntries).where(eq(revenueEntries.projectId, projectId)).orderBy(desc(revenueEntries.createdAt));
  }
  async getRevenueEntriesByReleaseId(releaseId: string) {
    return db.select().from(revenueEntries).where(eq(revenueEntries.releaseId, releaseId)).orderBy(desc(revenueEntries.createdAt));
  }

  async createPayout(payout: any) {
    const [p] = await db.insert(payouts).values(payout).returning();
    return p;
  }
  async getPayoutsByProjectId(projectId: string) {
    return db.select().from(payouts).where(eq(payouts.projectId, projectId)).orderBy(desc(payouts.createdAt));
  }
  async getPayoutsByContributorId(contributorId: string) {
    return db.select().from(payouts).where(eq(payouts.contributorId, contributorId)).orderBy(desc(payouts.createdAt));
  }
  async updatePayoutStatus(id: string, status: string) {
    const [p] = await db.update(payouts).set({ status }).where(eq(payouts.id, id)).returning();
    return p;
  }

  // ── getAnalyticsData ────────────────────────────────────────────────────────
  async getAnalyticsData(userId?: string): Promise<any> {
    if (userId) {
      const userContracts = await db.select().from(contracts).where(eq(contracts.createdBy, userId));
      const total = userContracts.length;
      const pending = userContracts.filter(c => c.status === "pending").length;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const completedThisMonth = userContracts.filter(c =>
        c.status === "signed" && c.updatedAt && new Date(c.updatedAt) >= monthStart
      ).length;
      return { totalContracts: total, pendingSignatures: pending, completedThisMonth, revenueSplit: 0 };
    }
    const allContracts = await db.select().from(contracts);
    return {
      totalContracts: allContracts.length,
      pendingSignatures: allContracts.filter(c => c.status === "pending").length,
      completedThisMonth: 0,
      revenueSplit: 0,
    };
  }

  async trackUserActivity(userId: string, activityType: string, activityData?: any): Promise<void> {
    await db.insert(userActivity).values({ userId, activityType, activityData: activityData ?? {} });
  }

  async trackUserActivitiesBulk(userId: string, activities: Array<{ activityType: string; activityData?: any }>): Promise<void> {
    for (const a of activities) await this.trackUserActivity(userId, a.activityType, a.activityData);
  }

  async getUserRecommendations() { return []; }

  // ── Service Business — Clients ──────────────────────────────────────────────
  async getClients(operatorId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.operatorId, operatorId)).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [c] = await db.select().from(clients).where(eq(clients.id, id));
    return c;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [c] = await db.insert(clients).values(client).returning();
    return c;
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const [c] = await db.update(clients).set({ ...updates, updatedAt: new Date() }).where(eq(clients.id, id)).returning();
    return c;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // ── Service Business — Projects ─────────────────────────────────────────────
  async getServiceProjects(operatorId: string): Promise<ServiceProject[]> {
    return db.select().from(serviceProjects).where(eq(serviceProjects.operatorId, operatorId)).orderBy(desc(serviceProjects.createdAt));
  }

  async getServiceProjectsByClient(clientId: string): Promise<ServiceProject[]> {
    return db.select().from(serviceProjects).where(eq(serviceProjects.clientId, clientId)).orderBy(desc(serviceProjects.createdAt));
  }

  async getServiceProject(id: string): Promise<ServiceProject | undefined> {
    const [p] = await db.select().from(serviceProjects).where(eq(serviceProjects.id, id));
    return p;
  }

  async createServiceProject(project: InsertServiceProject): Promise<ServiceProject> {
    const [p] = await db.insert(serviceProjects).values(project).returning();
    return p;
  }

  async updateServiceProject(id: string, updates: Partial<ServiceProject>): Promise<ServiceProject> {
    const [p] = await db.update(serviceProjects).set({ ...updates, updatedAt: new Date() }).where(eq(serviceProjects.id, id)).returning();
    return p;
  }

  async deleteServiceProject(id: string): Promise<void> {
    await db.delete(projectContributors).where(eq(projectContributors.projectId, id));
    await db.delete(serviceProjects).where(eq(serviceProjects.id, id));
  }

  // ── Service Business — Contributors ─────────────────────────────────────────
  async getProjectContributors(projectId: string): Promise<ProjectContributor[]> {
    return db.select().from(projectContributors).where(eq(projectContributors.projectId, projectId)).orderBy(projectContributors.createdAt);
  }

  async addProjectContributor(contributor: InsertProjectContributor): Promise<ProjectContributor> {
    const [c] = await db.insert(projectContributors).values(contributor).returning();
    return c;
  }

  async updateProjectContributor(id: string, updates: Partial<ProjectContributor>): Promise<ProjectContributor> {
    const [c] = await db.update(projectContributors).set(updates).where(eq(projectContributors.id, id)).returning();
    return c;
  }

  async removeProjectContributor(id: string): Promise<void> {
    await db.delete(projectContributors).where(eq(projectContributors.id, id));
  }

  async getContributorByToken(token: string): Promise<ProjectContributor | undefined> {
    const [c] = await db.select().from(projectContributors).where(eq(projectContributors.confirmationToken, token));
    return c;
  }

  async confirmContributor(token: string, ip: string): Promise<ProjectContributor> {
    const [c] = await db.update(projectContributors)
      .set({ confirmedAt: new Date(), confirmationIp: ip })
      .where(eq(projectContributors.confirmationToken, token))
      .returning();
    const all = await this.getProjectContributors(c.projectId);
    if (all.length > 0 && all.every(x => x.confirmedAt !== null)) {
      await this.updateServiceProject(c.projectId, { status: "confirmed" });
    }
    return c;
  }

  async generateConfirmationTokens(projectId: string): Promise<ProjectContributor[]> {
    const contribs = await this.getProjectContributors(projectId);
    const updated: ProjectContributor[] = [];
    for (const c of contribs) {
      if (!c.confirmationToken) {
        const token = `${projectId.slice(0, 8)}-${c.id.slice(0, 8)}-${Date.now().toString(36)}`;
        const [u] = await db.update(projectContributors).set({ confirmationToken: token }).where(eq(projectContributors.id, c.id)).returning();
        updated.push(u);
      } else {
        updated.push(c);
      }
    }
    await this.updateServiceProject(projectId, { status: "pending_confirmation" });
    return updated;
  }

  // ── Identity Layer — Creators ────────────────────────────────────────────────
  async getCreators(operatorId: string): Promise<Creator[]> {
    return db.select().from(creators).where(eq(creators.createdBy, operatorId)).orderBy(desc(creators.createdAt));
  }
  async getCreator(id: string): Promise<Creator | undefined> {
    const [c] = await db.select().from(creators).where(eq(creators.id, id));
    return c;
  }
  async createCreator(data: InsertCreator): Promise<Creator> {
    const [c] = await db.insert(creators).values(data).returning();
    return c;
  }
  async updateCreator(id: string, updates: Partial<Creator>): Promise<Creator> {
    const [c] = await db.update(creators).set({ ...updates, updatedAt: new Date() }).where(eq(creators.id, id)).returning();
    return c;
  }
  async deleteCreator(id: string): Promise<void> {
    await db.delete(creators).where(eq(creators.id, id));
  }

  // ── Identity Layer — Organizations ───────────────────────────────────────────
  async getOrganizations(operatorId: string): Promise<Organization[]> {
    return db.select().from(organizations).where(eq(organizations.createdBy, operatorId)).orderBy(desc(organizations.createdAt));
  }
  async getOrganization(id: string): Promise<Organization | undefined> {
    const [o] = await db.select().from(organizations).where(eq(organizations.id, id));
    return o;
  }
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const [o] = await db.insert(organizations).values(data).returning();
    return o;
  }
  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const [o] = await db.update(organizations).set({ ...updates, updatedAt: new Date() }).where(eq(organizations.id, id)).returning();
    return o;
  }
  async deleteOrganization(id: string): Promise<void> {
    await db.delete(organizations).where(eq(organizations.id, id));
  }

  // ── Org Members ──────────────────────────────────────────────────────────────
  async getOrgMembers(orgId: string): Promise<OrganizationMember[]> {
    return db.select().from(organizationMembers).where(eq(organizationMembers.orgId, orgId));
  }
  async addOrgMember(data: InsertOrganizationMember): Promise<OrganizationMember> {
    const [m] = await db.insert(organizationMembers).values(data).returning();
    return m;
  }
  async removeOrgMember(orgId: string, userId: string): Promise<void> {
    await db.delete(organizationMembers).where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)));
  }
  async updateOrgMemberRole(orgId: string, userId: string, role: string): Promise<OrganizationMember> {
    const [m] = await db.update(organizationMembers).set({ role }).where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId))).returning();
    return m;
  }

  // ── API Keys ─────────────────────────────────────────────────────────────────
  async getApiKeys(orgId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.orgId, orgId)).orderBy(desc(apiKeys.createdAt));
  }
  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [k] = await db.insert(apiKeys).values(data).returning();
    return k;
  }
  async revokeApiKey(id: string): Promise<void> {
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
  }
  async getApiKeyByHash(hash: string): Promise<ApiKey | undefined> {
    const [k] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash));
    return k;
  }

  // ── Ownership Events (immutable append-only) ─────────────────────────────────
  async appendOwnershipEvent(event: InsertOwnershipEvent): Promise<OwnershipEvent> {
    const [e] = await db.insert(ownershipEvents).values(event).returning();
    return e;
  }
  async getOwnershipEvents(songAssetId: string): Promise<OwnershipEvent[]> {
    return db.select().from(ownershipEvents).where(eq(ownershipEvents.songAssetId, songAssetId)).orderBy(desc(ownershipEvents.occurredAt));
  }
}

// ✅ IMPORTANT FIX: MUST BE OUTSIDE CLASS
export const storage = new DatabaseStorage();