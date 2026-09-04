import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
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
} from "@shared/schema";
import { z } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import OpenAI from "openai";
import {
  insertUserMatchSchema,
  insertMessageSchema,
  insertNotificationSchema,
} from "@shared/schema";
import { registerConfirmationRoutes } from "./confirmation-routes";
import { createBillingPortalSession } from "./stripe-billing-portal";
import { resetOperatorWorkspace } from "./workspace-reset";
import { summarizeWorkspace } from "@shared/workspace-analytics";
import { registerCopilotRoutes } from "./copilot-routes";
import { registerVoiceRoutes } from "./voice-routes";
import { registerServiceRoutes } from "./service-routes";
import { registerOrganizationRoutes } from "./organization-routes";
import { registerEnterpriseStubs } from "./enterprise-stubs";
import { registerMessageRoutes } from "./message-routes";
import { registerPaymentRoutes } from "./payment-routes";
import { registerSecurityRoutes } from "./security-routes";
import { registerComplianceRoutes, requireTermsAccepted } from "./compliance-routes";
import { registerVerificationRoutes } from "./verification-routes";
import { registerCreatorRoutes } from "./creator-routes";
import { registerRightsRoutes } from "./rights-routes";
import { registerLegalRoutes } from "./legal-routes";
import { registerTemplateRoutes } from "./template-routes";
import { syncAgreementToRightsLedger } from "./agreement-ledger";
import { isDraftableStatus, validateTemplateFieldValues } from "@shared/agreement-catalog";
import { isAdmin } from "./adminAuth";
import { registerRightsLedgerRoutes } from "./rights-ledger-routes";
import { auditLog } from "./security";
import { recalculateLicenseReadiness } from "./license-readiness";
import { handleSubscriptionWebhook } from "./stripe-subscription-webhook";
import {
  requireOwnedAsset,
  requireOwnedContract,
  requireOwnedRevenueEvent,
  canReadContract,
} from "./authz-helpers";
import { resolveActiveOrganization } from "./org-context";
import {
  requireActivePermission,
  type OrgAuthedRequest,
} from "./rbac-middleware";

// ── Inline CORS middleware (no package install required) ──────────────────────
function cors(options?: {
  origin?: string | string[] | boolean;
  credentials?: boolean;
  methods?: string[];
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const allowedOrigin =
      options?.origin === true || !options?.origin
        ? (req.headers.origin ?? "*")
        : Array.isArray(options.origin)
          ? options.origin.includes(req.headers.origin ?? "")
            ? req.headers.origin!
            : options.origin[0]
          : (options.origin as string);

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    if (options?.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }
    res.setHeader(
      "Access-Control-Allow-Methods",
      (
        options?.methods ?? ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
      ).join(","),
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Api-Key, X-Signature, X-Timestamp",
    );
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  };
}

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
      return res
        .status(429)
        .json({
          message: "Too many messages. Please wait before sending more.",
        });
    }

    current.count++;
    next();
  };
}

// Admin authorization middleware — moved to server/adminAuth.ts so other
// route modules (e.g. legal-routes.ts) can import it without a circular
// dependency on this file. Re-imported below via the top-of-file import.

// Initialize Stripe only if secret key is available
let stripe: Stripe | null = null;
const stripeKey =
  process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY;

if (stripeKey) {
  // Validate that we have a secret key, not a public key
  if (stripeKey.startsWith("sk_")) {
    stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    console.log("Stripe initialized with secret key");
  } else {
    console.warn(
      "Invalid Stripe key - key must start with sk_ for server-side usage. Stripe functionality disabled.",
    );
  }
} else {
  console.warn(
    "STRIPE_SECRET_KEY not found - Stripe functionality will be disabled",
  );
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
  const conversationContext = messages
    .map(
      (msg) =>
        `${msg.messageType === "ai_suggestion" ? "AI" : "User"}: ${msg.message}`,
    )
    .join("\n");

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

Be concise, objective, and focus on constructive outcomes. End with "Sentiment: [score]"`,
        },
        {
          role: "user",
          content: `Negotiation Title: ${negotiation.title}
Description: ${negotiation.description || "No description provided"}

Recent Conversation:
${conversationContext}

Please provide your analysis and strategic recommendation.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiContent =
      response.choices[0]?.message?.content || "Unable to generate analysis";

    // Extract sentiment from the main response instead of separate call
    const sentimentMatch = aiContent.match(
      /sentiment[:\s]*(-?[0-9]*\.?[0-9]+)/i,
    );
    const sentimentScore = sentimentMatch
      ? Math.max(-1, Math.min(1, parseFloat(sentimentMatch[1])))
      : 0;

    return {
      suggestion: aiContent,
      analysis: {
        sentimentScore,
        timestamp: new Date().toISOString(),
        messageCount: messages.length,
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      },
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return null; // Graceful degradation - never throw
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  registerMessageRoutes(app);

  // Terms of Service acceptance + PIPEDA/GDPR export & deletion — registered
  // before the enforcement gate so they're always reachable.
  registerComplianceRoutes(app);
  app.use(requireTermsAccepted);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      let activeOrganization = null;
      try {
        activeOrganization = await resolveActiveOrganization(userId);
      } catch (orgErr) {
        console.warn("[auth/user] org resolve skipped:", orgErr);
      }
      res.json({ ...(user as any), activeOrganization });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Contract template routes
  app.get("/api/contract-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getContractTemplates({
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        riskLevel: req.query.riskLevel as string | undefined,
        jurisdiction: req.query.jurisdiction as string | undefined,
        rights: req.query.rights as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json(templates);
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

  // Contract routes
  app.get("/api/contracts", ...requireActivePermission("agreement.read"), async (req: OrgAuthedRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const orgId = req.orgAuth?.organizationId;
      const contracts = orgId
        ? await storage.getContractsForOrganization(orgId, userId)
        : await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get("/api/contracts/:id", ...requireActivePermission("agreement.read"), async (req: any, res) => {
    try {
      const access = await canReadContract(req, req.params.id);
      if (!access.ok) {
        return res.status(access.status).json({ message: access.message });
      }
      res.json(access.contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post("/api/contracts", ...requireActivePermission("agreement.create"), async (req: OrgAuthedRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const organizationId = req.orgAuth?.organizationId ?? null;

      // Resolve template by id or type and snapshot version for auditability
      let templateId = req.body.templateId as string | undefined;
      let templateVersion = req.body.templateVersion as string | undefined;
      let template = templateId
        ? await storage.getContractTemplate(templateId)
        : await storage.getContractTemplateByType(req.body.type);

      if (template) {
        if (
          !isDraftableStatus(template.status) &&
          !(template.isActive && (template.status == null || template.status === ""))
        ) {
          return res.status(400).json({
            message: "Template is not available for new agreements",
            status: template.status,
          });
        }
        templateId = template.id;
        templateVersion = template.version || "1.0";

        const fields = ((template.template as any)?.fields ?? []) as any[];
        if (fields.length > 0 && req.body.data && req.body.status !== "draft") {
          const validation = validateTemplateFieldValues(fields, req.body.data);
          if (!validation.ok) {
            return res.status(400).json({
              message: "Template field validation failed",
              errors: validation.errors,
            });
          }
        }
      }

      const contractData = insertContractSchema.parse({
        ...req.body,
        templateId: templateId ?? req.body.templateId ?? null,
        templateVersion: templateVersion ?? null,
        createdBy: userId,
        organizationId,
        metadata: {
          ...(req.body.metadata || {}),
          createdFrom: req.body.metadata?.createdFrom || "template",
          templateType: req.body.type,
          templateVersion: templateVersion ?? null,
          organizationId,
        },
      });

      const contract = await storage.createContract(contractData);
      res.json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid contract data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.patch("/api/contracts/:id", ...requireActivePermission("agreement.update"), async (req: any, res) => {
    try {
      const contract = await requireOwnedContract(req, res, req.params.id);
      if (!contract) return;

      const updates = req.body;
      const updatedContract = await storage.updateContract(
        req.params.id,
        updates,
      );
      res.json(updatedContract);
    } catch (error) {
      console.error("Error updating contract:", error);
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete("/api/contracts/:id", ...requireActivePermission("agreement.update"), async (req: any, res) => {
    try {
      const contract = await requireOwnedContract(req, res, req.params.id);
      if (!contract) return;

      await storage.deleteContract(req.params.id);
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  // Contract collaborator routes
  app.get(
    "/api/contracts/:id/collaborators",
    ...requireActivePermission("agreement.read"),
    async (req: any, res) => {
      try {
        const access = await canReadContract(req, req.params.id);
        if (!access.ok) {
          return res.status(access.status).json({ message: access.message });
        }

        const collaborators = await storage.getContractCollaborators(
          req.params.id,
        );
        res.json(collaborators);
      } catch (error) {
        console.error("Error fetching collaborators:", error);
        res.status(500).json({ message: "Failed to fetch collaborators" });
      }
    },
  );

  app.post(
    "/api/contracts/:id/collaborators",
    ...requireActivePermission("agreement.update"),
    async (req: any, res) => {
      try {
        const contract = await requireOwnedContract(req, res, req.params.id);
        if (!contract) return;

        const collaboratorData = insertContractCollaboratorSchema.parse({
          ...req.body,
          contractId: req.params.id,
        });

        const collaborator =
          await storage.addContractCollaborator(collaboratorData);
        res.json(collaborator);
      } catch (error) {
        console.error("Error adding collaborator:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({
              message: "Invalid collaborator data",
              errors: error.errors,
            });
        }
        res.status(500).json({ message: "Failed to add collaborator" });
      }
    },
  );

  // Contract signature routes
  app.get(
    "/api/contracts/:id/signatures",
    ...requireActivePermission("agreement.read"),
    async (req: any, res) => {
      try {
        const access = await canReadContract(req, req.params.id);
        if (!access.ok) {
          return res.status(access.status).json({ message: access.message });
        }

        const signatures = await storage.getContractSignatures(req.params.id);
        res.json(signatures);
      } catch (error) {
        console.error("Error fetching signatures:", error);
        res.status(500).json({ message: "Failed to fetch signatures" });
      }
    },
  );

  app.post(
    "/api/contracts/:id/signatures",
    ...requireActivePermission("agreement.update"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const access = await canReadContract(req, req.params.id);
        if (!access.ok) {
          return res.status(access.status).json({ message: access.message });
        }

        const signatureData = insertContractSignatureSchema.parse({
          ...req.body,
          contractId: req.params.id,
          userId: userId, // Ensure signature is associated with authenticated user
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        });

        const signature = await storage.createContractSignature(signatureData);
        res.json(signature);
      } catch (error) {
        console.error("Error creating signature:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ message: "Invalid signature data", errors: error.errors });
        }
        res.status(500).json({ message: "Failed to create signature" });
      }
    },
  );

  // Owner e-signature endpoint — stores drawn signature as Base64 in contract metadata
  app.post(
    "/api/contracts/:id/sign",
    ...requireActivePermission("agreement.update"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const access = await canReadContract(req, req.params.id);
        if (!access.ok) {
          return res.status(access.status).json({ message: access.message });
        }
        const contract = access.contract;
        const {
          signatureData,
          signerName,
          signerEmail,
          signerTitle,
          signedAt,
          mode,
        } = req.body;
        if (
          !signatureData ||
          typeof signatureData !== "string" ||
          !signatureData.startsWith("data:image/")
        ) {
          return res
            .status(400)
            .json({
              message: "Invalid signature data. Must be a Base64 PNG data URL.",
            });
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
        const alreadySigned = existingSignatures.find(
          (s: any) => s.signedBy === userId,
        );
        const updatedSignatures = alreadySigned
          ? existingSignatures.map((s: any) =>
              s.signedBy === userId ? sigRecord : s,
            )
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
          const collaborators = await storage.getContractCollaborators(
            req.params.id,
          );
          for (const c of collaborators) {
            if (c.userId && c.userId !== userId) {
              await storage.createNotification(
                c.userId,
                "Contract Signed",
                `${sigRecord.signerName} has signed "${contract.title}". Your signature may be required.`,
                "info",
                `/contracts/${req.params.id}`,
              );
            }
          }
        } catch (_) {}

        res.json({ contract: updatedContract, signatureData, sigRecord });
      } catch (error) {
        console.error("Error saving e-signature:", error);
        res.status(500).json({ message: "Failed to save signature" });
      }
    },
  );

  // Profile management routes
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
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

  app.patch("/api/profile", isAuthenticated, async (req: any, res) => {
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
        isActive,
        ...cleanData
      } = updateData;

      const updatedUser = await storage.updateUser(userId, cleanData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid profile data",
          errors: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/profile/image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { profileImageUrl } = req.body;

      if (!profileImageUrl) {
        return res
          .status(400)
          .json({ message: "Profile image URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const normalizedPath =
        await objectStorageService.trySetObjectEntityAclPolicy(
          profileImageUrl,
          {
            owner: userId,
            visibility: "public", // Profile images are public
          },
        );

      const updatedUser = await storage.updateUser(userId, {
        profileImageUrl: normalizedPath,
      });

      res.json({ profileImageUrl: normalizedPath });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ message: "Failed to update profile image" });
    }
  });

  // Object Storage routes
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
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

  // Stripe subscription routes
  app.post(
    "/api/get-or-create-subscription",
    isAuthenticated,
    async (req: any, res) => {
      try {
        if (!stripe) {
          return res
            .status(503)
            .json({
              error: {
                message:
                  "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment.",
              },
            });
        }

        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user)
          return res.status(404).json({ error: { message: "User not found" } });
        if (!user.email)
          return res
            .status(400)
            .json({ error: { message: "No email address on file" } });

        // UI plan keys (billing.tsx) + legacy Stripe keys
        const rawPlan = String(req.body?.plan || "creator_pro");
        const planAliases: Record<string, string> = {
          pro: "pro", // Multi-Creator (quote)
          label: "studio_pro", // legacy
          session: "session",
          creator_pro: "creator_pro",
          studio_pro: "studio_pro",
        };
        const plan = planAliases[rawPlan];
        if (!plan) {
          return res.status(400).json({
            error: {
              message: `Invalid plan: ${rawPlan}. Use session, creator_pro, or studio_pro.`,
            },
          });
        }

        // Multi-Creator is quote-based — do not create a Stripe subscription here
        if (plan === "pro") {
          return res.json({
            quoteRequired: true,
            plan,
            message:
              "Multi-Creator is quote-based. Contact enterprise@splitsheet.ca for pricing.",
          });
        }

        const planPricing: Record<
          string,
          { amount: number; name: string; envKey: string }
        > = {
          session: {
            amount: 2500,
            name: "Pay-Per-Session",
            envKey: "STRIPE_SESSION_PRICE_ID",
          },
          creator_pro: {
            amount: 1500,
            name: "Creator Pro",
            envKey: "STRIPE_CREATOR_PRO_PRICE_ID",
          },
          studio_pro: {
            amount: 4900,
            name: "Studio Pro",
            envKey: "STRIPE_STUDIO_PRO_PRICE_ID",
          },
        };
        // Legacy env fallbacks for Creator/Studio
        const priceEnvMap: Record<string, string | undefined> = {
          session: process.env.STRIPE_SESSION_PRICE_ID,
          creator_pro:
            process.env.STRIPE_CREATOR_PRO_PRICE_ID ||
            process.env.STRIPE_PRO_PRICE_ID,
          studio_pro:
            process.env.STRIPE_STUDIO_PRO_PRICE_ID ||
            process.env.STRIPE_LABEL_PRICE_ID,
        };

        // ── Resolve or reuse existing Stripe customer ──────────────────────────
        let customerId = user.stripeCustomerId as string | undefined;

        if (customerId) {
          try {
            const existing = await stripe.customers.retrieve(customerId);
            if ((existing as any).deleted) customerId = undefined;
          } catch {
            customerId = undefined;
          }
        }

        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              user.email,
            metadata: { splitsheet_user_id: userId },
          });
          customerId = customer.id;
          await storage.updateUserStripeInfo(
            userId,
            customerId,
            user.stripeSubscriptionId ?? "",
          );
        }

        // ── Check for existing active subscription ─────────────────────────────
        if (user.stripeSubscriptionId) {
          try {
            const existingSub = await stripe.subscriptions.retrieve(
              user.stripeSubscriptionId,
              { expand: ["latest_invoice.payment_intent"] },
            );
            const isActive = ["active", "trialing"].includes(
              existingSub.status,
            );
            const currentTier = (existingSub.metadata?.tier ?? "pro") as string;

            if (isActive && currentTier === plan) {
              return res.json({
                alreadyActive: true,
                plan,
                subscriptionId: existingSub.id,
              });
            }

            if (isActive && currentTier !== plan) {
              await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            }

            if (!isActive && existingSub.status === "incomplete") {
              const secret = (existingSub.latest_invoice as any)?.payment_intent
                ?.client_secret;
              if (secret)
                return res.json({
                  subscriptionId: existingSub.id,
                  clientSecret: secret,
                  plan,
                });
            }
          } catch (err: any) {
            console.warn(
              "[SUBSCRIPTION] Could not retrieve existing sub:",
              err.message,
            );
          }
        }

        // ── Resolve price ID — create inline price if env var missing ──────────
        const pricing = planPricing[plan];
        let priceId: string;
        if (priceEnvMap[plan]) {
          priceId = priceEnvMap[plan] as string;
        } else {
          console.warn(
            `[SUBSCRIPTION] ${pricing.envKey} not set — creating inline price (demo mode).`,
          );
          const inlinePrice = await stripe.prices.create({
            unit_amount: pricing.amount,
            currency: "cad",
            recurring: { interval: "month" },
            product_data: {
              name: `SplitSheet ${pricing.name}`,
            },
          });
          priceId = inlinePrice.id;
        }

        // ── Create subscription ────────────────────────────────────────────────
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: "default_incomplete",
          expand: ["latest_invoice.payment_intent"],
          metadata: { tier: plan, userId },
        });

        await storage.updateUserStripeInfo(userId, customerId, subscription.id);

        const clientSecret =
          (subscription.latest_invoice as any)?.payment_intent?.client_secret ??
          null;
        if (!clientSecret) {
          return res.json({
            subscriptionId: subscription.id,
            alreadyActive: true,
            plan,
          });
        }

        return res.json({
          subscriptionId: subscription.id,
          clientSecret,
          plan,
        });
      } catch (error: any) {
        console.error("[SUBSCRIPTION ERROR]", error?.message ?? error);
        return res
          .status(400)
          .json({
            error: { message: error?.message ?? "Subscription failed" },
          });
      }
    },
  );

  // Stripe subscription webhook — authoritative billing → PostgreSQL entitlements
  // Dashboard URL must be: https://splitsheet.ca/api/stripe/webhook  (NOT the homepage)
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      if (!stripe) {
        return res.status(503).json({ message: "Stripe is not configured" });
      }
      await handleSubscriptionWebhook(stripe, req, res);
    },
  );

  // Cancel subscription endpoint
  app.post(
    "/api/stripe/cancel-subscription",
    isAuthenticated,
    async (req: any, res) => {
      try {
        if (!stripe) {
          return res
            .status(503)
            .json({
              message: "Stripe is not configured. Please contact support.",
            });
        }

        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        if (!user || !user.stripeSubscriptionId) {
          return res
            .status(400)
            .json({ message: "No active subscription found" });
        }

        // Cancel the subscription at period end
        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          {
            cancel_at_period_end: true,
          },
        );

        res.json({
          message: "Subscription cancelled successfully",
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: (subscription as any).current_period_end * 1000,
        });
      } catch (error: any) {
        console.error("Subscription cancellation error:", error);
        return res.status(400).json({ error: { message: error.message } });
      }
    },
  );

  // Stripe Customer Portal — invoices, payment methods, plan changes
  app.post(
    "/api/billing/portal",
    isAuthenticated,
    async (req: any, res) => {
      try {
        if (!stripe) {
          return res.status(503).json({
            message: "Stripe is not configured. Add STRIPE_SECRET_KEY to open the billing portal.",
          });
        }

        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user?.stripeCustomerId) {
          return res.status(400).json({
            message: "No Stripe customer on this account yet. Subscribe first, then manage billing here.",
          });
        }

        const returnUrl =
          process.env.APP_URL
            ? `${process.env.APP_URL.replace(/\/$/, "")}/billing`
            : `${req.protocol}://${req.get("host")}/billing`;

        const session = await createBillingPortalSession(
          stripe,
          user.stripeCustomerId,
          returnUrl,
        );

        return res.json({ url: session.url });
      } catch (error: any) {
        console.error("[BILLING PORTAL]", error?.message ?? error);
        return res.status(400).json({
          message: error?.message ?? "Could not open the billing portal.",
        });
      }
    },
  );

  app.post("/api/account/reset-workspace", isAuthenticated, async (req: any, res) => {
    try {
      if (String(req.body?.confirm ?? "") !== "RESET") {
        return res.status(400).json({
          message: "Type RESET to confirm you want to clear this workspace and return to Starter.",
        });
      }
      const userId = req.user.claims.sub;
      const result = await resetOperatorWorkspace(userId, stripe);
      res.json({
        ok: true,
        ...result,
        tier: "free",
        message: "Workspace cleared. You are on the Starter (free) plan.",
      });
    } catch (error: any) {
      console.error("[RESET WORKSPACE]", error?.message ?? error);
      res.status(error?.status ?? 500).json({
        message: error?.message ?? "Could not reset workspace.",
      });
    }
  });

  app.get("/api/analytics/workspace", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const projects = await storage.getContracts(userId);
      let clientCount = 0;
      let contributorCount = 0;
      const confirmations: { status?: string | null }[] = [];
      try {
        const clients = await db.execute(sql`
          SELECT COUNT(*) AS cnt FROM operator_clients WHERE created_by = ${userId}
        `);
        clientCount = Number((clients.rows[0] as any)?.cnt ?? 0);
        for (const project of projects) {
          const collabs = await storage.getContractCollaborators(project.id);
          contributorCount += collabs.length;
          const conf = await db.execute(sql`
            SELECT status FROM split_confirmations WHERE contract_id = ${project.id}
          `);
          for (const row of conf.rows as any[]) {
            confirmations.push({ status: row.status });
          }
        }
      } catch (inner: any) {
        console.warn("[analytics/workspace] extra counts skipped:", inner?.message);
      }
      res.json(
        summarizeWorkspace({
          projects,
          confirmations,
          clientCount,
          contributorCount,
          tier: user?.subscriptionTier,
        }),
      );
    } catch (error: any) {
      console.error("[analytics/workspace]", error?.message ?? error);
      res.status(500).json({ message: "Failed to load workspace analytics" });
    }
  });

  // Get subscription details endpoint
  app.get(
    "/api/stripe/subscription",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);

        // If no user or subscription, return free tier
        if (!user || !user.stripeSubscriptionId) {
          return res.json({
            hasSubscription: false,
            tier: user?.subscriptionTier || "free",
            status: "inactive",
          });
        }

        // If Stripe is properly configured, get live data
        if (stripe) {
          try {
            const subscription = await stripe.subscriptions.retrieve(
              user.stripeSubscriptionId,
            );

            return res.json({
              hasSubscription: subscription.status === "active",
              subscriptionId: subscription.id,
              status: subscription.status,
              tier:
                subscription.metadata?.tier || user.subscriptionTier || "pro",
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodStart:
                (subscription as any).current_period_start * 1000,
              currentPeriodEnd: (subscription as any).current_period_end * 1000,
              nextBillingDate: (subscription as any).current_period_end * 1000,
            });
          } catch (stripeError: any) {
            console.error("Stripe API error:", stripeError);
            // Fall back to database data if Stripe fails
          }
        }

        // Fallback to database-stored subscription info when Stripe unavailable
        return res.json({
          hasSubscription: user.subscriptionTier !== "free",
          tier: user.subscriptionTier || "free",
          status: user.subscriptionStatus || "active",
          subscriptionId: user.stripeSubscriptionId,
          // Mock dates for demo purposes when Stripe unavailable
          currentPeriodStart: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60,
          currentPeriodEnd: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          nextBillingDate: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        });
      } catch (error: any) {
        console.error("Subscription retrieval error:", error);
        return res.status(500).json({ error: { message: error.message } });
      }
    },
  );

  // Dashboard stats route
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contracts = await storage.getContracts(userId);

      const now = new Date();
      const isPending = (c: { status?: string | null }) =>
        c.status === "pending_confirmation" || c.status === "pending";
      const isConfirmed = (c: { status?: string | null }) =>
        c.status === "confirmed" || c.status === "signed";
      const stats = {
        totalProjects: contracts.length,
        pendingConfirmation: contracts.filter(isPending).length,
        confirmedThisMonth: contracts.filter((c) => {
          if (!isConfirmed(c) || !c.updatedAt) return false;
          const updatedDate = new Date(c.updatedAt);
          return (
            updatedDate.getMonth() === now.getMonth() &&
            updatedDate.getFullYear() === now.getFullYear()
          );
        }).length,
        drafts: contracts.filter((c) => c.status === "draft").length,
        // Legacy keys kept so older clients do not break
        totalContracts: contracts.length,
        pendingSignatures: contracts.filter(isPending).length,
        completedThisMonth: contracts.filter((c) => {
          if (!isConfirmed(c) || !c.updatedAt) return false;
          const updatedDate = new Date(c.updatedAt);
          return (
            updatedDate.getMonth() === now.getMonth() &&
            updatedDate.getFullYear() === now.getFullYear()
          );
        }).length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Analytics data route - user-specific analytics by default
  app.get("/api/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Don't track page view here to avoid double counting (client-side tracks it)

      // Get user-specific analytics (scoped to user's own data)
      const analyticsData = await storage.getAnalyticsData(userId);
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  // Global analytics route - admin only
  app.get("/api/analytics/global", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.trackUserActivity(userId, "admin_analytics_access");
      const analyticsData = await storage.getAnalyticsData();
      res.json(analyticsData);
    } catch (error) {
      console.error("Error fetching global analytics data:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch global analytics data" });
    }
  });

  // Activity tracking endpoint
  app.post("/api/activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const activityEvent = activityEventSchema.parse(req.body);

      await storage.trackUserActivity(
        userId,
        activityEvent.activityType,
        activityEvent.activityData,
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking activity:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid activity data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to track activity" });
    }
  });

  // Batch activity tracking endpoint
  app.post("/api/activity/batch", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchData = batchActivitiesSchema.parse(req.body);

      // Use bulk insert for true batching
      await storage.trackUserActivitiesBulk(userId, batchData.activities);

      res.json({ success: true, processed: batchData.activities.length });
    } catch (error) {
      console.error("Error tracking batch activities:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid batch data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to track batch activities" });
    }
  });

  // Negotiation CRUD endpoints

  // Get all negotiations for user
  app.get("/api/negotiations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiations = await storage.getNegotiations(userId);
      res.json(negotiations);
    } catch (error) {
      console.error("Error fetching negotiations:", error);
      res.status(500).json({ message: "Failed to fetch negotiations" });
    }
  });

  // Get single negotiation
  app.get("/api/negotiations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const negotiationId = req.params.id;
      const userId = req.user.claims.sub;

      const negotiation = await storage.getNegotiation(negotiationId);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }

      // Check access (creator or participant)
      const hasAccess =
        negotiation.createdBy === userId ||
        (negotiation.participants && negotiation.participants.includes(userId));

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(negotiation);
    } catch (error) {
      console.error("Error fetching negotiation:", error);
      res.status(500).json({ message: "Failed to fetch negotiation" });
    }
  });

  // Create new negotiation
  app.post("/api/negotiations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const negotiationData = insertNegotiationSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const negotiation = await storage.createNegotiation(negotiationData);
      res.status(201).json(negotiation);
    } catch (error) {
      console.error("Error creating negotiation:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid negotiation data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create negotiation" });
    }
  });

  // Update negotiation
  app.patch("/api/negotiations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const negotiationId = req.params.id;
      const userId = req.user.claims.sub;

      const negotiation = await storage.getNegotiation(negotiationId);
      if (!negotiation) {
        return res.status(404).json({ message: "Negotiation not found" });
      }

      // Only creator can update negotiation
      if (negotiation.createdBy !== userId) {
        return res
          .status(403)
          .json({ message: "Only the creator can update this negotiation" });
      }

      const updates = req.body;
      const updatedNegotiation = await storage.updateNegotiation(
        negotiationId,
        updates,
      );
      res.json(updatedNegotiation);
    } catch (error) {
      console.error("Error updating negotiation:", error);
      res.status(500).json({ message: "Failed to update negotiation" });
    }
  });

  // Get negotiation conversations
  app.get(
    "/api/negotiations/:id/conversations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const negotiationId = req.params.id;
        const userId = req.user.claims.sub;

        const negotiation = await storage.getNegotiation(negotiationId);
        if (!negotiation) {
          return res.status(404).json({ message: "Negotiation not found" });
        }

        // Check access (creator or participant)
        const hasAccess =
          negotiation.createdBy === userId ||
          (negotiation.participants &&
            negotiation.participants.includes(userId));

        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        const conversations =
          await storage.getNegotiationConversations(negotiationId);
        res.json(conversations);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: "Failed to fetch conversations" });
      }
    },
  );

  // Add conversation message (with optional AI analysis)
  app.post(
    "/api/negotiations/:id/conversations",
    isAuthenticated,
    rateLimit(10, 60000),
    async (req: any, res) => {
      try {
        const negotiationId = req.params.id;
        const userId = req.user.claims.sub;

        const negotiation = await storage.getNegotiation(negotiationId);
        if (!negotiation) {
          return res.status(404).json({ message: "Negotiation not found" });
        }

        // Check access (creator or participant)
        const hasAccess =
          negotiation.createdBy === userId ||
          (negotiation.participants &&
            negotiation.participants.includes(userId));

        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        const conversationData = insertNegotiationConversationSchema.parse({
          ...req.body,
          negotiationId,
          senderId: userId,
        });

        // Add the user message
        const conversation =
          await storage.addNegotiationConversation(conversationData);

        // Send response immediately to ensure message delivery is not blocked by AI
        res.status(201).json(conversation);

        // Process AI analysis asynchronously if enabled (never blocks message sending)
        if (
          negotiation.aiAssistantEnabled &&
          conversationData.messageType === "text"
        ) {
          setImmediate(async () => {
            try {
              // Get recent conversations and limit to last 5 for cost control
              const conversations =
                await storage.getNegotiationConversations(negotiationId);
              const recentMessages = conversations.slice(-5); // Enforce context limit here

              // Generate AI analysis (gracefully handles missing API key)
              const analysis = await generateAIAnalysis(
                recentMessages,
                negotiation,
              );

              // Add AI suggestion as a separate message if analysis succeeded
              if (analysis?.suggestion) {
                await storage.addNegotiationConversation({
                  negotiationId,
                  senderId: "ai-assistant",
                  message: analysis.suggestion,
                  messageType: "ai_suggestion",
                  sentimentScore: analysis.analysis.sentimentScore,
                  aiAnalysis: analysis.analysis,
                });
              }
            } catch (aiError) {
              console.error("Background AI analysis failed:", aiError);
              // Error is logged but never affects user message delivery
            }
          });
        }
      } catch (error) {
        console.error("Error adding conversation:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({
              message: "Invalid conversation data",
              errors: error.errors,
            });
        }
        res.status(500).json({ message: "Failed to add conversation" });
      }
    },
  );

  // ===== USER MATCHING ROUTES =====

  // Get user recommendations
  app.get(
    "/api/matches/recommendations",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const limit = parseInt(req.query.limit) || 10;

        const recommendations = await storage.getUserRecommendations(
          userId,
          limit,
        );
        res.json(recommendations);
      } catch (error) {
        console.error("Error getting recommendations:", error);
        res.status(500).json({ message: "Failed to get recommendations" });
      }
    },
  );

  // Get user matches
  app.get("/api/matches", isAuthenticated, async (req: any, res) => {
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

  // Connect with a user (create match)
  app.post("/api/matches", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Validate request body using Zod schema
      const matchData = insertUserMatchSchema.parse({
        ...req.body,
        userId,
        matchScore:
          typeof req.body.matchScore === "number"
            ? req.body.matchScore.toFixed(2)
            : String(req.body.matchScore || "0.80"),
      });

      const { matchedUserId, matchScore, matchReason } = matchData;

      const match = await storage.createUserMatch(
        userId,
        matchedUserId,
        matchScore as any,
        matchReason || "Manual connection",
      );

      // Create notification for the matched user
      await storage.createNotification(
        matchedUserId,
        "New Connection Request",
        `You have a new connection request!`,
        "info",
        `/matches`,
      );

      res.status(201).json(match);
    } catch (error) {
      console.error("Error creating match:", error);
      res.status(500).json({ message: "Failed to create match" });
    }
  });

  // Update match status
  app.patch("/api/matches/:id", isAuthenticated, async (req: any, res) => {
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

  // ===== MESSAGING ROUTES =====

  // Get user conversations
  app.get("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ message: "Failed to get conversations" });
    }
  });

  // Get conversation with specific user
  app.get(
    "/api/conversations/:userId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const otherUserId = req.params.userId;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await storage.getConversation(
          currentUserId,
          otherUserId,
          limit,
        );
        res.json(messages.reverse()); // Return in chronological order
      } catch (error) {
        console.error("Error getting conversation:", error);
        res.status(500).json({ message: "Failed to get conversation" });
      }
    },
  );

  // Send message
  app.post(
    "/api/messages",
    isAuthenticated,
    rateLimit(30, 60000),
    async (req: any, res) => {
      try {
        const senderId = req.user.claims.sub;

        // Validate request body using Zod schema
        const messageData = insertMessageSchema.parse({
          ...req.body,
          senderId,
        });

        const { receiverId, content, messageType } = messageData;

        const message = await storage.sendMessage(
          senderId,
          receiverId,
          content,
          messageType || "text",
        );

        // Create notification for receiver
        const sender = await storage.getUser(senderId);
        await storage.createNotification(
          receiverId,
          "New Message",
          `${sender?.firstName || "Someone"} sent you a message`,
          "info",
          `/messages/${senderId}`,
        );

        res.status(201).json(message);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  // Mark messages as read
  app.patch(
    "/api/conversations/:userId/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const senderId = req.params.userId;

        await storage.markMessagesAsRead(currentUserId, senderId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    },
  );

  // ===== NOTIFICATION ROUTES =====

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadOnly = req.query.unread === "true";

      const notifications = await storage.getUserNotifications(
        userId,
        unreadOnly,
      );
      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  // Mark notification as read
  app.patch(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const notificationId = req.params.id;
        await storage.markNotificationAsRead(notificationId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notification as read" });
      }
    },
  );

  // Mark all notifications as read
  app.patch(
    "/api/notifications/read-all",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        await storage.markAllNotificationsAsRead(userId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark all notifications as read" });
      }
    },
  );

  // ===== ADMIN ROUTES =====

  // Get all users (admin only)
  app.get(
    "/api/admin/users",
    isAuthenticated,
    isAdmin,
    async (req: any, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";

        // Get users with pagination and search
        const users = await storage.getAllUsers(page, limit, search);
        res.json(users);
      } catch (error) {
        console.error("Error getting users:", error);
        res.status(500).json({ message: "Failed to get users" });
      }
    },
  );

  // Update user status (admin only)
  app.patch(
    "/api/admin/users/:id",
    isAuthenticated,
    isAdmin,
    async (req: any, res) => {
      try {
        const userId = req.params.id;
        const { isActive, subscriptionTier } = req.body;

        const updatedUser = await storage.updateUser(userId, {
          isActive,
          subscriptionTier,
          updatedAt: new Date(),
        });

        res.json(updatedUser);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Failed to update user" });
      }
    },
  );

  // Get system activity (admin only)
  app.get(
    "/api/admin/activity",
    isAuthenticated,
    isAdmin,
    async (req: any, res) => {
      try {
        const activity = await storage.getRecentActivity(50);
        res.json(activity);
      } catch (error) {
        console.error("Error getting activity:", error);
        res.status(500).json({ message: "Failed to get activity" });
      }
    },
  );

  // ─── SONG ASSETS (CAP TABLE) ─────────────────────────────────────────────

  app.get("/api/assets", ...requireActivePermission("rights.read"), async (req: OrgAuthedRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const orgId = req.orgAuth?.organizationId;
      const assets = orgId
        ? await storage.getSongAssetsForOrganization(orgId, userId)
        : await storage.getSongAssets(userId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post("/api/assets", ...requireActivePermission("rights.update"), async (req: OrgAuthedRequest, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const data = {
        ...req.body,
        createdBy: userId,
        organizationId: req.orgAuth?.organizationId ?? null,
      };
      const asset = await storage.createSongAsset(data);
      await storage.trackUserActivity(userId, "asset_created", {
        assetId: asset.id,
      });
      res.status(201).json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(500).json({ message: "Failed to create asset" });
    }
  });

  app.get("/api/assets/:id", ...requireActivePermission("rights.read"), async (req: any, res) => {
    try {
      const asset = await requireOwnedAsset(req, res, req.params.id);
      if (!asset) return;
      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch asset" });
    }
  });

  app.patch("/api/assets/:id", ...requireActivePermission("rights.update"), async (req: any, res) => {
    try {
      const asset = await requireOwnedAsset(req, res, req.params.id);
      if (!asset) return;
      const updated = await storage.updateSongAsset(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update asset" });
    }
  });

  // ─── OWNERSHIP LEDGER ─────────────────────────────────────────────────────

  // GET current ownership (latest version)
  app.get(
    "/api/assets/:id/ownership",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const asset = await requireOwnedAsset(req, res, req.params.id);
        if (!asset) return;
        const ownership = await storage.getCurrentOwnership(req.params.id);
        res.json(ownership);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ownership" });
      }
    },
  );

  // GET current ownership with stakeholder display names (for CWR export / UI)
  app.get(
    "/api/assets/:id/ownership/named",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const asset = await requireOwnedAsset(req, res, req.params.id);
        if (!asset) return;
        const ownership = await storage.getCurrentOwnershipWithNames(req.params.id);
        res.json(ownership);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ownership" });
      }
    },
  );

  // GET full ownership history (immutable audit trail)
  app.get(
    "/api/assets/:id/ownership/history",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const asset = await requireOwnedAsset(req, res, req.params.id);
        if (!asset) return;
        const history = await storage.getOwnershipHistory(req.params.id);
        res.json(history);
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch ownership history" });
      }
    },
  );

  // POST initial ownership record for a new asset
  app.post(
    "/api/assets/:id/ownership",
    ...requireActivePermission("rights.update"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const asset = await requireOwnedAsset(req, res, req.params.id);
        if (!asset) return;

        const record = await storage.createOwnershipRecord({
          ...req.body,
          assetId: req.params.id,
          createdBy: userId,
          version: 1,
          effectiveAt: new Date(),
        });

        await auditLog({
          userId,
          action: "ownership_record.create",
          resourceType: "ownership_record",
          resourceId: record.id,
          afterState: record,
          ipAddress: req.ip,
        });
        await recalculateLicenseReadiness(req.params.id).catch(() => {});

        res.status(201).json(record);
      } catch (error) {
        res.status(500).json({ message: "Failed to create ownership record" });
      }
    },
  );

  // PUT update ownership split — versioned, never overwrites
  app.put(
    "/api/assets/:id/ownership",
    ...requireActivePermission("rights.update"),
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const asset = await requireOwnedAsset(req, res, req.params.id);
        if (!asset) return;

        const { splits, changeReason } = req.body;
        if (!Array.isArray(splits) || splits.length === 0)
          return res.status(400).json({ message: "splits array is required" });

        const records = await storage.updateOwnershipSplit(
          req.params.id,
          splits,
          userId,
          changeReason,
        );

        await auditLog({
          userId,
          action: "ownership_record.update_split",
          resourceType: "ownership_record",
          resourceId: req.params.id,
          beforeState: { changeReason },
          afterState: records,
          ipAddress: req.ip,
        });
        await recalculateLicenseReadiness(req.params.id).catch(() => {});

        // Notify all stakeholders via the messaging system
        for (const s of splits) {
          if (s.userId !== userId) {
            await storage
              .createNotification(
                s.userId,
                "Ownership Updated",
                `Your ownership in "${asset.title}" has been updated to ${s.ownershipPercentage}%.`,
                "info",
                `/ownership/${req.params.id}`,
              )
              .catch(() => {});
          }
        }

        res.json(records);
      } catch (error: any) {
        if (error.message?.includes("100%"))
          return res.status(400).json({ message: error.message });
        res.status(500).json({ message: "Failed to update ownership" });
      }
    },
  );

  // ─── REVENUE EVENTS ───────────────────────────────────────────────────────

  app.get("/api/assets/:id/revenue", isAuthenticated, async (req: any, res) => {
    try {
      const asset = await requireOwnedAsset(req, res, req.params.id);
      if (!asset) return;
      const events = await storage.getRevenueEvents(req.params.id);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch revenue events" });
    }
  });

  app.post(
    "/api/assets/:id/revenue",
    ...requireActivePermission("rights.update"),
    async (req: any, res) => {
      try {
        const asset = await requireOwnedAsset(req, res, req.params.id);
        if (!asset) return;

        const event = await storage.recordRevenueEvent({
          ...req.body,
          assetId: req.params.id,
        });
        res.status(201).json(event);
      } catch (error) {
        res.status(500).json({ message: "Failed to record revenue event" });
      }
    },
  );

  // Preview payout splits without persisting
  app.get(
    "/api/revenue/:eventId/payouts/preview",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const owned = await requireOwnedRevenueEvent(req, res, req.params.eventId);
        if (!owned) return;
        const payouts = await storage.calculatePayouts(req.params.eventId);
        res.json(payouts);
      } catch (error: any) {
        res
          .status(500)
          .json({ message: error.message || "Failed to calculate payouts" });
      }
    },
  );

  // Execute payouts — persist and update balances
  app.post(
    "/api/revenue/:eventId/payouts/execute",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const owned = await requireOwnedRevenueEvent(req, res, req.params.eventId);
        if (!owned) return;
        const payouts = await storage.executePayouts(req.params.eventId);
        res.json(payouts);
      } catch (error: any) {
        res
          .status(500)
          .json({ message: error.message || "Failed to execute payouts" });
      }
    },
  );

  // ─── PROJECT-SCOPED REVENUE VIEWS (contract-details.tsx "Releases" tab) ────
  // Reads the real revenue_events/payout_records ledger for any song_assets
  // linked to this contract (contracts.id === song_assets.contractId).

  app.get("/api/releases", isAuthenticated, async (_req: any, res) => {
    // No distributor-release tracking table exists yet — return an honest
    // empty list rather than fabricating data. Wire up once a `releases`
    // table is added to shared/schema.ts.
    res.json([]);
  });

  app.get("/api/revenue-entries", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = String(req.query.projectId ?? "");
      if (!projectId) return res.json([]);
      const contract = await requireOwnedContract(req, res, projectId);
      if (!contract) return;
      const assets = await storage.getSongAssetsByContract(projectId);
      const entriesByAsset = await Promise.all(assets.map((a) => storage.getRevenueEvents(a.id)));
      const entries = entriesByAsset.flat().map((e) => ({
        id: e.id,
        source: e.source,
        amount: e.amount,
        currency: e.currency,
        reportingPeriodStart: e.periodStart,
        reportingPeriodEnd: e.periodEnd,
        releaseId: null,
      }));
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch revenue entries" });
    }
  });

  app.get("/api/payouts", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = String(req.query.projectId ?? "");
      if (!projectId) return res.json([]);
      const contract = await requireOwnedContract(req, res, projectId);
      if (!contract) return;
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
        revenueEntryId: p.revenueEventId,
      }));
      res.json(payouts);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to fetch payouts" });
    }
  });

  // ─── CONFIRMATIONS ────────────────────────────────────────────────────────

  // Generate confirmation links for a contract
  app.post('/api/contracts/:id/confirmations', ...requireActivePermission("agreement.send"), async (req: any, res) => {
    try {
      const contract = await requireOwnedContract(req, res, req.params.id);
      if (!contract) return;

      const collaborators = await storage.getContractCollaborators(req.params.id);
      const existingConfirmations = await storage.getConfirmationsByContract(req.params.id);

      const newConfirmations = [];
      const crypto = await import("crypto");

      for (const collaborator of collaborators) {
        // Check if confirmation already exists for this collaborator
        const existing = existingConfirmations.find(c => c.collaboratorId === collaborator.id);
        if (existing) {
          newConfirmations.push(existing);
          continue;
        }

        const token = crypto.randomBytes(32).toString('hex');
        const confirmation = await storage.createConfirmation({
          contractId: req.params.id,
          collaboratorId: collaborator.id,
          token,
          status: 'pending',
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        });
        newConfirmations.push(confirmation);
      }

      res.json(newConfirmations);
    } catch (error) {
      console.error("Error generating confirmations:", error);
      res.status(500).json({ message: "Failed to generate confirmations" });
    }
  });

  // Get confirmations for a contract (operator view)
  app.get('/api/contracts/:id/confirmations', ...requireActivePermission("agreement.read"), async (req: any, res) => {
    try {
      const contract = await requireOwnedContract(req, res, req.params.id);
      if (!contract) return;

      const confirmations = await storage.getConfirmationsByContract(req.params.id);
      res.json(confirmations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch confirmations" });
    }
  });

  // Legacy public confirmation API — locked down (use /api/confirm/:contractId/:token).
  app.get('/api/confirmations/:token', (_req, res) => {
    res.status(410).json({
      message:
        "This confirmation API is retired. Use /api/confirm/:contractId/:token from the operator-issued link.",
      code: "CONFIRMATION_API_RETIRED",
    });
  });

  app.post('/api/confirmations/:token/submit', (_req, res) => {
    res.status(410).json({
      message:
        "This confirmation API is retired. Use POST /api/confirm/:contractId/:token.",
      code: "CONFIRMATION_API_RETIRED",
    });
  });

  // ─── USER EARNINGS ────────────────────────────────────────────────────────

  app.get("/api/earnings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [balance, payouts] = await Promise.all([
        storage.getUserEarnings(userId),
        storage.getUserPayouts(userId),
      ]);
      res.json({ balance, payouts });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch earnings" });
    }
  });

  // ── Confirmation link system (send via WhatsApp/SMS/Instagram, track in dashboard)
  registerConfirmationRoutes(app);

  // B2B2C operator workflow — clients, projects, contributors, health
  registerServiceRoutes(app);

  // Enterprise multi-tenant workspaces — organizations, RBAC members, org API keys
  registerOrganizationRoutes(app);

  // Phases 9–10 — SSO/SCIM discovery stubs (501 until enterprise enablement)
  registerEnterpriseStubs(app);

  // Global Music Rights Infrastructure — creator registry, rights profile/orgs, rights ledger
  registerCreatorRoutes(app);
  registerRightsRoutes(app);
  registerRightsLedgerRoutes(app);

  // Legal document versioning + acceptance (counsel-editable ToS/Privacy/DPA text)
  registerLegalRoutes(app);

  // Entertainment Agreement Template Library + recommendations + ledger sync
  registerTemplateRoutes(app);

  // SoundLedger CoPilot AI assistant
  registerCopilotRoutes(app);

  // Copilot Voice Assistant orchestration layer (no UI)
  registerVoiceRoutes(app);

  // Stripe Connect payouts — per-contributor royalty transfers
  registerPaymentRoutes(app);

  // Hash-chained split versioning, fraud detection, disputes, API keys, RaaS verification
  await registerSecurityRoutes(app);

  // Identity verification (OTP) backend
  registerVerificationRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
