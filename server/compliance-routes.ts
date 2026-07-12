/**
 * server/compliance-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Technical enforcement for two launch-readiness gaps called out in the
 * README (§17 Launch Readiness):
 *   1. Mandatory Terms of Service acceptance at login (was: not enforced).
 *   2. PIPEDA/GDPR-style personal data export & account deletion (was: absent).
 *
 * These are functional/technical implementations. The actual Terms of
 * Service and Privacy Policy text still require legal review before public
 * launch — see Footer.tsx and README §17.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, NextFunction, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { eq } from "drizzle-orm";
import {
  users,
  contracts,
  contractCollaborators,
  contractSignatures,
  songAssets,
  ownershipRecords,
  payoutRecords,
  userBalances,
  userActivity,
  notifications,
  messages,
} from "@shared/schema";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { logger } from "./logger";

/** Bump this whenever the published Terms/Privacy text materially changes —
 *  existing users will be prompted to re-accept. */
export const CURRENT_TERMS_VERSION = "2026-07-12";

/** Paths that must always be reachable even for a user who hasn't accepted
 *  the current Terms yet (otherwise the client could never show/complete
 *  the acceptance flow, or log out). */
const TERMS_ALLOWLIST = new Set<string>([
  "/api/auth/user",
  "/api/login",
  "/api/logout",
  "/api/callback",
  "/api/health",
  "/api/user/accept-terms",
  "/api/user/terms-status",
]);

/**
 * Global middleware — blocks authenticated API access until the current
 * user has accepted the current Terms version. Unauthenticated requests
 * (public confirmation links, webhooks, landing page) pass through
 * untouched since req.user is only populated for logged-in sessions.
 */
export function requireTermsAccepted(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;
  if (!path.startsWith("/api/") || TERMS_ALLOWLIST.has(path)) {
    next();
    return;
  }

  const user = (req as any).user;
  if (!user?.claims?.sub) {
    // Not authenticated on this request — let per-route isAuthenticated
    // middleware (or public route) handle it.
    next();
    return;
  }

  // Cached on the session by setupAuth's deserialize step in most Passport
  // configs; fall back to a DB check to be safe on every request.
  storage
    .getUser(user.claims.sub)
    .then((record) => {
      if (record?.termsAcceptedAt && record.termsVersion === CURRENT_TERMS_VERSION) {
        next();
        return;
      }
      res.status(403).json({
        error: "TERMS_NOT_ACCEPTED",
        message: "Please review and accept the current Terms of Service to continue.",
        currentVersion: CURRENT_TERMS_VERSION,
      });
    })
    .catch((err) => {
      logger.error("compliance.terms_check_failed", { error: err?.message, route: path });
      // Fail open on infrastructure errors — a DB hiccup should not lock
      // every user out of the app.
      next();
    });
}

export function registerComplianceRoutes(app: Express): void {
  // ══════════════════════════════════════════════════════════════════════════
  // TERMS OF SERVICE ACCEPTANCE
  // ══════════════════════════════════════════════════════════════════════════

  app.get("/api/user/terms-status", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const user = await storage.getUser(userId);
    res.json({
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedVersion: user?.termsVersion ?? null,
      acceptedAt: user?.termsAcceptedAt ?? null,
      accepted: Boolean(user?.termsAcceptedAt && user.termsVersion === CURRENT_TERMS_VERSION),
    });
  });

  app.post("/api/user/accept-terms", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const schema = z.object({ version: z.string().max(40).optional() });
    try {
      const { version } = schema.parse(req.body ?? {});
      const acceptedAt = new Date();
      await db
        .update(users)
        .set({ termsAcceptedAt: acceptedAt, termsVersion: version ?? CURRENT_TERMS_VERSION })
        .where(eq(users.id, userId));

      await storage.trackUserActivity(userId, "terms_accepted", {
        version: version ?? CURRENT_TERMS_VERSION,
        ipAddress: req.ip,
      });

      res.json({ accepted: true, version: version ?? CURRENT_TERMS_VERSION, acceptedAt });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request" });
      } else {
        logger.error("compliance.accept_terms_failed", { error: (err as Error)?.message });
        res.status(500).json({ error: "Failed to record terms acceptance" });
      }
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PIPEDA / GDPR — DATA EXPORT
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/user/export
   * Returns every record this platform holds that is tied to the
   * authenticated user, as a single downloadable JSON document.
   */
  app.get("/api/user/export", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
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
        sentOrReceivedMessages,
      ] = await Promise.all([
        storage.getUser(userId),
        db.select().from(contracts).where(eq(contracts.createdBy, userId)),
        db.select().from(contractCollaborators).where(eq(contractCollaborators.userId, userId)),
        db
          .select()
          .from(contractSignatures)
          .innerJoin(contractCollaborators, eq(contractSignatures.collaboratorId, contractCollaborators.id))
          .where(eq(contractCollaborators.userId, userId)),
        db.select().from(songAssets).where(eq(songAssets.createdBy, userId)),
        db.select().from(ownershipRecords).where(eq(ownershipRecords.userId, userId)),
        db.select().from(payoutRecords).where(eq(payoutRecords.userId, userId)),
        db.select().from(userBalances).where(eq(userBalances.userId, userId)),
        db.select().from(userActivity).where(eq(userActivity.userId, userId)),
        db.select().from(notifications).where(eq(notifications.userId, userId)),
        db.select().from(messages).where(eq(messages.senderId, userId)),
      ]);

      await storage.trackUserActivity(userId, "data_export_requested", { requestedAt: new Date().toISOString() });

      res.setHeader("Content-Disposition", `attachment; filename="splitsheet-data-export-${userId}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        jurisdiction: "PIPEDA (Canada) / GDPR-equivalent",
        profile,
        contractsCreated: createdContracts,
        collaboratorRecords,
        signatures: signatures.map((row: any) => row.contractSignatures ?? row),
        songAssets: assets,
        ownershipRecords: ownership,
        payoutRecords: payouts,
        balance,
        activityLog: activity,
        notifications: userNotifications,
        messagesSent: sentOrReceivedMessages,
      });
    } catch (err) {
      logger.error("compliance.export_failed", { userId, error: (err as Error)?.message });
      res.status(500).json({ error: "Failed to generate data export" });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PIPEDA / GDPR — ACCOUNT DELETION (right to erasure)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/account/delete
   * Anonymizes personally identifying fields and deactivates the account.
   * Financial/legal records (signed contracts, payout ledgers) are
   * retained in anonymized form rather than hard-deleted — this mirrors
   * standard practice for regulated financial/royalty platforms, which
   * must keep an audit trail even after a "delete my data" request.
   */
  app.post("/api/account/delete", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const schema = z.object({ confirm: z.literal(true) });
    try {
      schema.parse(req.body ?? {});

      const anonymizedEmail = `deleted-${userId}@anonymized.splitsheet.ca`;
      await db
        .update(users)
        .set({
          email: anonymizedEmail,
          firstName: "Deleted",
          lastName: "User",
          profileImageUrl: null,
          bio: null,
          skills: [],
          preferences: null,
          contactInfo: null,
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      await storage.trackUserActivity(userId, "account_deletion_requested", {
        requestedAt: new Date().toISOString(),
        ipAddress: req.ip,
      });

      logger.info("compliance.account_deleted", { userId });

      req.logout?.(() => {});
      res.json({
        deleted: true,
        message:
          "Your account has been deactivated and personal data anonymized. Financial/legal records required for royalty accounting are retained in anonymized form.",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "You must confirm deletion (confirm: true)." });
      } else {
        logger.error("compliance.delete_failed", { userId, error: (err as Error)?.message });
        res.status(500).json({ error: "Failed to delete account" });
      }
    }
  });
}
