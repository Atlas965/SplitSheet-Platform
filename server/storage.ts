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

  async createSongAsset() { return {} as any; }
  async getSongAssets() { return []; }
  async getSongAsset() { return undefined; }
  async updateSongAsset() { return {} as any; }

  async createOwnershipRecord() { return {} as any; }
  async getCurrentOwnership() { return []; }
  async getOwnershipHistory() { return []; }
  async updateOwnershipSplit() { return []; }

  async recordRevenueEvent() { return {} as any; }
  async getRevenueEvents() { return []; }
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

  async createRevenueEntry() { return {} as any; }
  async getRevenueEntriesByProjectId() { return []; }
  async getRevenueEntriesByReleaseId() { return []; }

  async createPayout() { return {} as any; }
  async getPayoutsByProjectId() { return []; }
  async getPayoutsByContributorId() { return []; }
  async updatePayoutStatus() { return {} as any; }
}

// ✅ IMPORTANT FIX: MUST BE OUTSIDE CLASS
export const storage = new DatabaseStorage();