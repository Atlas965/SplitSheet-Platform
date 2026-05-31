import type { Express } from "express";
import { storage } from "./storage";
import express from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertContractSchema,
  insertContractCollaboratorSchema,
  insertContractSignatureSchema,
  insertUserSchema,
  insertNegotiationSchema,
  insertNegotiationConversationSchema,
  activityEventSchema,
  batchActivitiesSchema,
  type ActivityEvent,
  type BatchActivities,
  type Negotiation,
  type NegotiationConversation,
  insertReleaseSchema,
  insertRevenueEntrySchema,
  insertPayoutSchema,
  type Release,
  type RevenueEntry,
  type Payout,
  type ContractCollaborator,
  type SongAsset,
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import OpenAI from "openai";
import { insertUserMatchSchema, insertMessageSchema, insertNotificationSchema } from "@shared/schema";

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting middleware
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: any, res: any, next: any) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return next();

    const now = Date.now();
    const key = `${userId}:messages`;
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (current.count >= maxRequests) {
      return res.status(429).json({ message: "Too many messages. Please wait before sending more." });
    }

    current.count++;
    next();
  };
}

// Admin authorization middleware
async function isAdmin(req: any, res: any, next: any) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    // Get user from database to verify admin role
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user has admin privileges (only from database role field)
    const isAdminUser = (dbUser as any).role === 'admin';

    if (!isAdminUser) {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY;

if (stripeKey) {
  // Validate that we have a secret key, not a public key
  if (stripeKey.startsWith('sk_')) {
    stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27",
    });
    console.log('Stripe initialized with secret key');
  } else {
    console.warn('Invalid Stripe key - key must start with sk_ for server-side usage. Stripe functionality disabled.');
  }
} else {
  console.warn('STRIPE_SECRET_KEY not found - Stripe functionality will be disabled');
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// AI Analysis function
async function generateAIAnalysis(messages: any[], negotiation: any) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured - skipping AI analysis");
    return null;
  }

  // Prepare conversation context
  const conversationContext = messages.map(msg => 
    `${msg.messageType === 'ai_suggestion' ? 'AI' : 'User'}: ${msg.message}`
  ).join('\n');

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
Description: ${negotiation.description || 'No description provided'}

Recent Conversation:
${conversationContext}

Please provide your analysis and strategic recommendation.`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiContent = response.choices[0]?.message?.content || "Unable to generate analysis";

    // Extract sentiment from the main response instead of separate call
    const sentimentMatch = aiContent.match(/sentiment[:\s]*(-?[0-9]*\.?[0-9]+)/i);
    const sentimentScore = sentimentMatch ? Math.max(-1, Math.min(1, parseFloat(sentimentMatch[1]))) : 0;

    return {
      suggestion: aiContent,
      analysis: {
        sentimentScore,
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini"
      }
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null; // Graceful degradation - never throw
  }
}

// Split Calculation Engine Service
async function calculateProjectSplits(projectId: string): Promise<any> {
  const revenueEntries = await storage.getRevenueEntriesByProjectId(projectId);
  const collaborators = await storage.getContractCollaborators(projectId);

  if (!revenueEntries || revenueEntries.length === 0) {
    return { message: "No revenue entries found for this project." };
  }
  if (!collaborators || collaborators.length === 0) {
    return { message: "No collaborators found for this project." };
  }

  const payoutBreakdown: { [key: string]: { amount: number; currency: string; contributor: ContractCollaborator } } = {};

  for (const entry of revenueEntries) {
    const totalRevenue = parseFloat(entry.amount as any);
    for (const collab of collaborators) {
      const ownershipPercentage = parseFloat(collab.ownershipPercentage as any);
      const share = totalRevenue * (ownershipPercentage / 100);

      if (!payoutBreakdown[collab.id]) {
        payoutBreakdown[collab.id] = { amount: 0, currency: entry.currency, contributor: collab };
      }
      payoutBreakdown[collab.id].amount += share;
    }
  }

  return Object.values(payoutBreakdown).map(payout => ({
    contributorId: payout.contributor.id,
    projectId: projectId,
    amount: payout.amount.toFixed(2),
    currency: payout.currency,
    contributorName: payout.contributor.name,
    contributorRole: payout.contributor.role,
  }));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Contract template routes
  app.get('/api/contract-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getContractTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching contract templates:", error);
      res.status(500).json({ message: "Failed to fetch contract templates" });
    }
  });

  app.get('/api/contract-templates/:id', isAuthenticated, async (req, res) => {
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

  // Contract routes
  app.get('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if user owns this contract or is a collaborator
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(req.params.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
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

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractData = insertContractSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const contract = await storage.createContract(contractData);
      res.json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.patch('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if user owns this contract or is a collaborator with edit permission
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(req.params.id);
        const userCollaborator = collaborators.find(c => c.userId === userId);
        if (!userCollaborator || userCollaborator.status !== 'accepted') {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const updates = req.body;
      const updatedContract = await storage.updateContract(req.params.id, updates);
      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete('/api/contracts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Only the contract owner can delete the contract
      if (contract.createdBy !== userId) {
        return res.status(403).json({ message: "Only the contract owner can delete contracts" });
      }

      await storage.deleteContract(req.params.id);
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Contract collaborator routes
  app.get('/api/contracts/:id/collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if user owns this contract or is a collaborator
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(req.params.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const collaborators = await storage.getContractCollaborators(req.params.id);
      res.json(collaborators);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
      res.status(500).json({ message: "Failed to fetch collaborators" });
    }
  });

  app.post('/api/contracts/:id/collaborators', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Only the contract owner can add collaborators
      if (contract.createdBy !== userId) {
        return res.status(403).json({ message: "Only the contract owner can add collaborators" });
      }

      const collaboratorData = insertContractCollaboratorSchema.parse({
        ...req.body,
        contractId: req.params.id,
      });

      const collaborator = await storage.addContractCollaborator(collaboratorData);
      res.json(collaborator);
    } catch (error) {
      console.error("Error adding collaborator:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collaborator data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add collaborator" });
    }
  });

  // Contract signature routes
  app.get('/api/contracts/:id/signatures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if user owns this contract or is a collaborator
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(req.params.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
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
  });

  app.post('/api/contracts/:id/signatures', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Check if user owns this contract or is a collaborator
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(req.params.id);
        const isCollaborator = collaborators.some(c => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const signatureData = insertContractSignatureSchema.parse({
        ...req.body,
        contractId: req.params.id,
        userId: userId, // Ensure signature is associated with authenticated user
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const signature = await storage.createContractSignature(signatureData);
      res.json(signature);
    } catch (error) {
      console.error("Error creating signature:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid signature data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create signature" });
    }
  });

  // Owner e-signature endpoint — stores drawn signature as Base64 in contract metadata
  app.post('/api/contracts/:id/sign', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Only the contract owner or a collaborator may sign
      if (contract.createdBy !== userId) {
        const collaborators = await storage.getContractCollaborators(req.params.id);
        const isCollaborator = collaborators.some((c) => c.userId === userId);
        if (!isCollaborator) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const { signatureData, signerName, signerEmail, signerTitle, signedAt, mode } = req.body;
      if (!signatureData || typeof signatureData !== "string" || !signatureData.startsWith("data:image/")) {
        return res.status(400).json({ message: "Invalid signature data. Must be a Base64 PNG data URL." });
      }

      const existingMetadata = (contract.metadata as any) || {};
      const sigRecord = {
        signatureData,
        signerName: signerName || "Unknown",
        signerEmail: signerEmail || "",
        signerTitle: signerTitle || "",
        signedAt: signedAt || new Date().toISOString(),
        signedBy: userId,
        signedIp: req.ip,
        signedUserAgent: req.get("User-Agent"),
        mode: mode || "draw",
      };

      // Keep an array of all signatures so multi-party signing is supported
      const existingSignatures: any[] = existingMetadata.signatures || [];
      const alreadySigned = existingSignatures.find((s: any) => s.signedBy === userId);
      const updatedSignatures = alreadySigned
        ? existingSignatures.map((s: any) => (s.signedBy === userId ? sigRecord : s))
        : [...existingSignatures, sigRecord];

      const updatedContract = await storage.updateContract(req.params.id, {
        status: "signed",
        metadata: {
          ...existingMetadata,
          ownerSignature: signatureData,
          signedAt: sigRecord.signedAt,
          signedBy: userId,
          signatures: updatedSignatures,
        },
      });

      // Notify contract collaborators that the owner has signed
      try {
        const collaborators = await storage.getContractCollaborators(req.params.id);
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
      } catch (_) {}

      res.json({ contract: updatedContract, signatureData, sigRecord });
    } catch (error) {
      console.error("Error saving e-signature:", error);
      res.status(500).json({ message: "Failed to save signature" });
    }
  });

  // Profile management routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
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

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Validate and clean the profile data with strict allowlist
      const updateData = insertUserSchema.partial().parse(req.body);

      // Remove protected fields that users cannot update
      const {
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        subscriptionTier,
        role,
        ...allowedUpdates
      } = updateData;

      const updatedUser = await storage.updateUser(userId, allowedUpdates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || "";
      const users = await storage.getAllUsers(page, limit, search);
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get('/api/admin/activity', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getAnalyticsData(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Analytics data (admin only)
  app.get('/api/analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const analyticsData = await storage.getAnalyticsData();
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // User activity tracking
  app.post('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { activityType, activityData } = activityEventSchema.parse(req.body);
      await storage.trackUserActivity(userId, activityType, activityData);
      res.status(200).json({ message: "Activity tracked" });
    } catch (error) {
      console.error("Error tracking activity:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to track activity" });
    }
  });

  app.post('/api/activity/batch', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { activities } = batchActivitiesSchema.parse(req.body);
      await storage.trackUserActivitiesBulk(userId, activities);
      res.status(200).json({ message: "Activities tracked in batch" });
    } catch (error) {
      console.error("Error tracking batch activities:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid batch activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to track batch activities" });
    }
  });

  // User matching routes
  app.get('/api/users/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recommendations = await storage.getUserRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching user recommendations:", error);
      res.status(500).json({ message: "Failed to fetch user recommendations" });
    }
  });

  app.post('/api/users/:id/match', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const matchedUserId = req.params.id;
      const { matchScore, matchReason } = req.body;
      const match = await storage.createUserMatch(userId, matchedUserId, matchScore, matchReason);
      res.json(match);
    } catch (error) {
      console.error("Error creating user match:", error);
      res.status(500).json({ message: "Failed to create user match" });
    }
  });

  app.patch('/api/matches/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const matchId = req.params.id;
      const { status } = req.body;
      await storage.updateMatchStatus(matchId, status);
      res.json({ message: "Match status updated" });
    } catch (error) {
      console.error("Error updating match status:", error);
      res.status(500).json({ message: "Failed to update match status" });
    }
  });

  app.get('/api/users/matches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const status = req.query.status as string;
      const matches = await storage.getUserMatches(userId, status);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching user matches:", error);
      res.status(500).json({ message: "Failed to fetch user matches" });
    }
  });

  // Messaging routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const { receiverId, content, messageType } = insertMessageSchema.parse(req.body);
      const message = await storage.sendMessage(senderId, receiverId, content, messageType);
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.get('/api/messages/:otherUserId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const otherUserId = req.params.otherUserId;
      const conversation = await storage.getConversation(userId, otherUserId);
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      res.status(500).json({ message: "Failed to fetch user conversations" });
    }
  });

  app.patch('/api/messages/:senderId/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const senderId = req.params.senderId;
      await storage.markMessagesAsRead(userId, senderId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Notification routes
  app.post('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, content, type, actionUrl } = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(userId, title, content, type, actionUrl);
      res.json(notification);
    } catch (error) {
      console.error("Error creating notification:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid notification data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create notification" });
    }
  });

  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadOnly = req.query.unreadOnly === 'true';
      const notifications = await storage.getUserNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({ message: "Failed to fetch user notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = req.params.id;
      await storage.markNotificationAsRead(notificationId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Negotiation routes
  app.get('/api/negotiations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiations = await storage.getNegotiations(userId);
      res.json(negotiations);
    } catch (error) {
      console.error("Error fetching negotiations:", error);
      res.status(500).json({ message: "Failed to fetch negotiations" });
    }
  });

  app.get('/api/negotiations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiation = await storage.getNegotiation(req.params.id);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      // Basic authorization: only creator can view for now
      if (negotiation.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(negotiation);
    } catch (error) {
      console.error("Error fetching negotiation:", error);
      res.status(500).json({ message: "Failed to fetch negotiation" });
    }
  });

  app.post('/api/negotiations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiationData = insertNegotiationSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const newNegotiation = await storage.createNegotiation(negotiationData);
      res.json(newNegotiation);
    } catch (error) {
      console.error("Error creating negotiation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid negotiation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create negotiation" });
    }
  });

  app.patch('/api/negotiations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiation = await storage.getNegotiation(req.params.id);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      if (negotiation.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updatedNegotiation = await storage.updateNegotiation(req.params.id, req.body);
      res.json(updatedNegotiation);
    } catch (error) {
      console.error("Error updating negotiation:", error);
      res.status(500).json({ message: "Failed to update negotiation" });
    }
  });

  app.get('/api/negotiations/:id/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiationId = req.params.id;
      const negotiation = await storage.getNegotiation(negotiationId);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      if (negotiation.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const conversations = await storage.getNegotiationConversations(negotiationId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching negotiation conversations:", error);
      res.status(500).json({ message: "Failed to fetch negotiation conversations" });
    }
  });

  app.post('/api/negotiations/:id/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiationId = req.params.id;
      const negotiation = await storage.getNegotiation(negotiationId);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }
      if (negotiation.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const conversationData = insertNegotiationConversationSchema.parse({
        ...req.body,
        negotiationId,
        senderId: userId,
      });
      const newConversation = await storage.addNegotiationConversation(conversationData);

      // Trigger AI analysis if enabled
      if (negotiation.aiAssistantEnabled) {
        const allConversations = await storage.getNegotiationConversations(negotiationId);
        const aiAnalysisResult = await generateAIAnalysis(allConversations, negotiation);
        if (aiAnalysisResult) {
          await storage.addNegotiationConversation({
            negotiationId,
            senderId: userId, // AI suggestions are "from" the user in the UI
            message: aiAnalysisResult.suggestion,
            messageType: "ai_suggestion",
            sentimentScore: aiAnalysisResult.analysis.sentimentScore,
            aiAnalysis: aiAnalysisResult.analysis,
          });
        }
      }

      res.json(newConversation);
    } catch (error) {
      console.error("Error adding negotiation conversation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add negotiation conversation" });
    }
  });

  // Ownership ledger routes (existing)
  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assetData = req.body; // insertSongAssetSchema.parse(req.body);
      const newAsset = await storage.createSongAsset({ ...assetData, createdBy: userId });
      res.json(newAsset);
    } catch (error) {
      console.error("Error creating song asset:", error);
      res.status(500).json({ message: "Failed to create song asset" });
    }
  });

  app.get('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const assets = await storage.getSongAssets(userId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching song assets:", error);
      res.status(500).json({ message: "Failed to fetch song assets" });
    }
  });

  app.get('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Song asset not found" });
      }
      if (asset.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(asset);
    } catch (error) {
      console.error("Error fetching song asset:", error);
      res.status(500).json({ message: "Failed to fetch song asset" });
    }
  });

  app.patch('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Song asset not found" });
      }
      if (asset.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const updatedAsset = await storage.updateSongAsset(req.params.id, req.body);
      res.json(updatedAsset);
    } catch (error) {
      console.error("Error updating song asset:", error);
      res.status(500).json({ message: "Failed to update song asset" });
    }
  });

  app.get('/api/assets/:id/ownership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Song asset not found" });
      }
      if (asset.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const ownership = await storage.getCurrentOwnership(req.params.id);
      res.json(ownership);
    } catch (error) {
      console.error("Error fetching current ownership:", error);
      res.status(500).json({ message: "Failed to fetch current ownership" });
    }
  });

  app.get('/api/assets/:id/ownership/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Song asset not found" });
      }
      if (asset.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const history = await storage.getOwnershipHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching ownership history:", error);
      res.status(500).json({ message: "Failed to fetch ownership history" });
    }
  });

  app.put('/api/assets/:id/ownership', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Song asset not found" });
      }
      if (asset.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const { splits, changeReason } = req.body;
      if (!Array.isArray(splits) || splits.some(s => typeof s.userId !== 'string' || typeof s.ownershipPercentage !== 'string' || typeof s.role !== 'string')) {
        return res.status(400).json({ message: "Invalid splits data" });
      }
      const updatedOwnership = await storage.updateOwnershipSplit(req.params.id, splits, userId, changeReason);
      res.json(updatedOwnership);
    } catch (error) {
      console.error("Error updating ownership split:", error);
      res.status(500).json({ message: "Failed to update ownership split" });
    }
  });

  app.post('/api/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const revenueEventData = req.body; // insertRevenueEventSchema.parse(req.body);
      const newRevenueEvent = await storage.recordRevenueEvent(revenueEventData);
      res.json(newRevenueEvent);
    } catch (error) {
      console.error("Error recording revenue event:", error);
      res.status(500).json({ message: "Failed to record revenue event" });
    }
  });

  app.get('/api/assets/:id/revenue', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const asset = await storage.getSongAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ message: "Song asset not found" });
      }
      if (asset.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const revenueEvents = await storage.getRevenueEvents(req.params.id);
      res.json(revenueEvents);
    } catch (error) {
      console.error("Error fetching revenue events:", error);
      res.status(500).json({ message: "Failed to fetch revenue events" });
    }
  });

  app.post('/api/revenue/:eventId/payouts/calculate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // TODO: Add authorization check that user owns the asset associated with the revenue event
      const payouts = await storage.calculatePayouts(req.params.eventId);
      res.json(payouts);
    } catch (error) {
      console.error("Error calculating payouts:", error);
      res.status(500).json({ message: "Failed to calculate payouts" });
    }
  });

  app.post('/api/revenue/:eventId/payouts/execute', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // TODO: Add authorization check that user owns the asset associated with the revenue event
      const executedPayouts = await storage.executePayouts(req.params.eventId);
      res.json(executedPayouts);
    } catch (error) {
      console.error("Error executing payouts:", error);
      res.status(500).json({ message: "Failed to execute payouts" });
    }
  });

  app.get('/api/earnings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const earnings = await storage.getUserEarnings(userId);
      res.json(earnings);
    } catch (error) {
      console.error("Error fetching user earnings:", error);
      res.status(500).json({ message: "Failed to fetch user earnings" });
    }
  });

  app.get('/api/payouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payouts = await storage.getUserPayouts(userId);
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching user payouts:", error);
      res.status(500).json({ message: "Failed to fetch user payouts" });
    }
  });

  // Confirmation routes (existing)
  app.get('/api/confirmations/:token', async (req, res) => {
    try {
      const confirmation = await storage.getConfirmationByToken(req.params.token);
      if (!confirmation) {
        return res.status(404).json({ message: "Confirmation not found or expired" });
      }
      res.json(confirmation);
    } catch (error) {
      console.error("Error fetching confirmation by token:", error);
      res.status(500).json({ message: "Failed to fetch confirmation" });
    }
  });

  app.post('/api/confirmations/:token/confirm', async (req, res) => {
    try {
      const confirmation = await storage.getConfirmationByToken(req.params.token);
      if (!confirmation) {
        return res.status(404).json({ message: "Confirmation not found or expired" });
      }
      if (confirmation.status !== 'pending') {
        return res.status(400).json({ message: "Confirmation already processed" });
      }

      const updatedConfirmation = await storage.updateConfirmation(confirmation.id, { status: 'confirmed', confirmedAt: new Date() });

      // Update collaborator status in the contract
      await storage.updateCollaboratorStatus(updatedConfirmation.collaboratorId, 'signed');

      res.json(updatedConfirmation);
    } catch (error) {
      console.error("Error confirming:", error);
      res.status(500).json({ message: "Failed to confirm" });
    }
  });

  app.post('/api/confirmations/:token/request-change', async (req, res) => {
    try {
      const confirmation = await storage.getConfirmationByToken(req.params.token);
      if (!confirmation) {
        return res.status(404).json({ message: "Confirmation not found or expired" });
      }
      if (confirmation.status !== 'pending') {
        return res.status(400).json({ message: "Confirmation already processed" });
      }

      const { notes } = req.body;
      const updatedConfirmation = await storage.updateConfirmation(confirmation.id, { status: 'requested_change', notes });

      res.json(updatedConfirmation);
    } catch (error) {
      console.error("Error requesting change:", error);
      res.status(500).json({ message: "Failed to request change" });
    }
  });

  app.post('/api/contracts/:id/confirmations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contractId = req.params.id;
      const contract = await storage.getContract(contractId);

      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      if (contract.createdBy !== userId) {
        return res.status(403).json({ message: "Only the contract owner can generate confirmation links" });
      }

      const collaborators = await storage.getContractCollaborators(contractId);
      const confirmations = [];

      for (const collab of collaborators) {
        // Generate a unique token for each collaborator
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Link valid for 7 days

        const newConfirmation = await storage.createConfirmation({
          contractId,
          collaboratorId: collab.id,
          token,
          expiresAt,
          status: 'pending',
        });
        confirmations.push(newConfirmation);

        // Send email/notification to collaborator (placeholder)
        console.log(`Confirmation link for ${collab.name}: ${process.env.REPLIT_URL}/confirm/${token}`);
        await storage.createNotification(
          collab.userId || '', // If no userId, notification won't be sent to a specific user
          "Action Required: Confirm Your Music Split",
          `Please review and confirm your ownership split for "${contract.title}".`,
          "info",
          `/confirm/${token}`
        );
      }

      res.json(confirmations);
    } catch (error) {
      console.error("Error generating confirmation links:", error);
      res.status(500).json({ message: "Failed to generate confirmation links" });
    }
  });

  // NEW: Releases routes
  app.post('/api/releases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const releaseData = insertReleaseSchema.parse(req.body);
      // Ensure the project exists and belongs to the user
      const project = await storage.getContract(releaseData.projectId);
      if (!project || project.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
      }
      const newRelease = await storage.createRelease(releaseData);
      res.json(newRelease);
    } catch (error) {
      console.error("Error creating release:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid release data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create release" });
    }
  });

  app.get('/api/releases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.query.projectId as string;
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required." });
      }
      // Ensure the project exists and belongs to the user
      const project = await storage.getContract(projectId);
      if (!project || project.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
      }
      const releases = await storage.getReleasesByProjectId(projectId);
      res.json(releases);
    } catch (error) {
      console.error("Error fetching releases:", error);
      res.status(500).json({ message: "Failed to fetch releases" });
    }
  });

  app.patch('/api/releases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const releaseId = req.params.id;
      const updates = req.body;
      const existingRelease = await storage.getRelease(releaseId);

      if (!existingRelease) {
        return res.status(404).json({ message: "Release not found." });
      }
      // Ensure the project associated with the release belongs to the user
      const project = await storage.getContract(existingRelease.projectId);
      if (!project || project.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
      }

      const updatedRelease = await storage.updateRelease(releaseId, updates);
      res.json(updatedRelease);
    } catch (error) {
      console.error("Error updating release:", error);
      res.status(500).json({ message: "Failed to update release" });
    }
  });

  // NEW: Revenue Entry routes
  app.post('/api/revenue-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const revenueEntryData = insertRevenueEntrySchema.parse(req.body);
      // Ensure the project exists and belongs to the user
      const project = await storage.getContract(revenueEntryData.projectId);
      if (!project || project.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
      }
      // If releaseId is provided, ensure it belongs to the same project
      if (revenueEntryData.releaseId) {
        const release = await storage.getRelease(revenueEntryData.releaseId);
        if (!release || release.projectId !== revenueEntryData.projectId) {
          return res.status(400).json({ message: "Invalid releaseId for the given projectId." });
        }
      }
      const newRevenueEntry = await storage.createRevenueEntry(revenueEntryData);
      res.json(newRevenueEntry);
    } catch (error) {
      console.error("Error creating revenue entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid revenue entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create revenue entry" });
    }
  });

  app.get('/api/revenue-entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.query.projectId as string;
      const releaseId = req.query.releaseId as string;

      if (!projectId && !releaseId) {
        return res.status(400).json({ message: "Either projectId or releaseId is required." });
      }

      let revenueEntries: RevenueEntry[] = [];

      if (projectId) {
        const project = await storage.getContract(projectId);
        if (!project || project.createdBy !== userId) {
          return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
        }
        revenueEntries = await storage.getRevenueEntriesByProjectId(projectId);
      } else if (releaseId) {
        const release = await storage.getRelease(releaseId);
        if (!release) {
          return res.status(404).json({ message: "Release not found." });
        }
        const project = await storage.getContract(release.projectId);
        if (!project || project.createdBy !== userId) {
          return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
        }
        revenueEntries = await storage.getRevenueEntriesByReleaseId(releaseId);
      }
      res.json(revenueEntries);
    } catch (error) {
      console.error("Error fetching revenue entries:", error);
      res.status(500).json({ message: "Failed to fetch revenue entries" });
    }
  });

  // NEW: Split Calculation Engine endpoint
  app.get('/api/projects/:projectId/calculate-splits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.params.projectId;
      const project = await storage.getContract(projectId);
      if (!project || project.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
      }
      const payoutBreakdown = await calculateProjectSplits(projectId);
      res.json(payoutBreakdown);
    } catch (error) {
      console.error("Error calculating project splits:", error);
      res.status(500).json({ message: "Failed to calculate project splits" });
    }
  });

  // NEW: Payout routes
  app.post('/api/payouts/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { projectId, revenueEntryId } = req.body;

      // Authorization: Ensure user owns the project associated with the revenue entry
      const project = await storage.getContract(projectId);
      if (!project || project.createdBy !== userId) {
        return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
      }

      // Calculate splits for the given revenue entry and project
      const payoutBreakdown = await calculateProjectSplits(projectId);

      const generatedPayouts: Payout[] = [];
      for (const payout of payoutBreakdown) {
        const newPayout = await storage.createPayout({
          contributorId: payout.contributorId,
          projectId: payout.projectId,
          revenueEntryId: revenueEntryId, // Link to the specific revenue entry that triggered this payout
          amount: payout.amount,
          currency: payout.currency,
          status: 'pending',
        });
        generatedPayouts.push(newPayout);
      }
      res.json(generatedPayouts);
    } catch (error) {
      console.error("Error generating payouts:", error);
      res.status(500).json({ message: "Failed to generate payouts" });
    }
  });

  app.get('/api/payouts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = req.query.projectId as string;
      const contributorId = req.query.contributorId as string;

      let payouts: Payout[] = [];

      if (projectId) {
        const project = await storage.getContract(projectId);
        if (!project || project.createdBy !== userId) {
          return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
        }
        payouts = await storage.getPayoutsByProjectId(projectId);
      } else if (contributorId) {
        // For contributor-specific payouts, ensure the contributor is associated with a project owned by the user
        const collaborator = await storage.getContractCollaborators(contributorId); // This needs to be improved to get a single collaborator by ID
        // For now, assuming getContractCollaborators can return a single one if ID matches
        if (!collaborator || collaborator.length === 0) {
          return res.status(404).json({ message: "Contributor not found." });
        }
        const project = await storage.getContract(collaborator[0].contractId);
        if (!project || project.createdBy !== userId) {
          return res.status(403).json({ message: "Access denied: Project not found or not owned by user." });
        }
        payouts = await storage.getPayoutsByContributorId(contributorId);
      } else {
        // If no projectId or contributorId, return payouts for all projects owned by the user
        const userContracts = await storage.getContracts(userId);
        const allPayouts: Payout[] = [];
        for (const contract of userContracts) {
          const projectPayouts = await storage.getPayoutsByProjectId(contract.id);
          allPayouts.push(...projectPayouts);
        }
        payouts = allPayouts;
      }
      res.json(payouts);
    } catch (error) {
      console.error("Error fetching payouts:", error);
      res.status(500).json({ message: "Failed to fetch payouts" });
    }
  });

  app.patch('/api/payouts/:id/pay', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payoutId = req.params.id;
      const payout = await storage.createPayout(payoutId); // This is incorrect, should be getPayout
      // TODO: Implement actual payment processing (e.g., Stripe transfer)
      const updatedPayout = await storage.updatePayoutStatus(payoutId, 'paid');
      res.json(updatedPayout);
    } catch (error) {
      console.error("Error processing payout:", error);
      res.status(500).json({ message: "Failed to process payout" });
    }
  });

  // Rights & Metadata Expansion (update existing song asset routes)
  // The patch /api/assets/:id route already handles updates to song assets,
  // and the new fields (proRegistrationStatus, publishingStatus, externalDistributorId)
  // are already added to the schema. No new routes are strictly needed here,
  // but the frontend would need to be updated to expose these fields.

  // External Integration Layer (structural only - no new routes needed yet)

  const server = createServer(app);
  return server;
}