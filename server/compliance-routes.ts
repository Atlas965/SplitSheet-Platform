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
import type { LegalDocType } from "@shared/schema";

/** Fallback only — used if no `legal_documents` row exists yet for a doc
 *  type (should not happen after server/db-migrations.ts seeds the initial
 *  versions, but keeps terms-status from crashing on a fresh/partial DB). */
export const CURRENT_TERMS_VERSION = "2026-07-12";

/** The doc types that gate the operator app (block the UI via TermsGate).
 *  `dpa` and `contributor_consent` are published/versioned the same way but
 *  are not part of this blocking gate — see server/legal-routes.ts. */
export const GATED_DOC_TYPES: LegalDocType[] = ["tos", "privacy"];

/** Paths that must always be reachable even for a user who hasn't accepted
 *  the current Terms yet (otherwise the client could never show/complete
 *  the acceptance flow, or log out). */
const TERMS_ALLOWLIST = new Set<string>([
  "/api/auth/user",
  "/api/auth/providers",
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
  // GET /api/legal/documents/:docType/latest|history must always be reachable
  // — TermsGate itself has to fetch the ToS/Privacy body to show the user
  // before they can accept it, and the same routes are also public marketing
  // pages (see server/legal-routes.ts).
  const isPublicLegalDocRoute = req.method === "GET" && path.startsWith("/api/legal/documents/");
  const isAuthProviderRoute =
    path.startsWith("/api/auth/google") ||
    path.startsWith("/api/auth/apple") ||
    path.startsWith("/api/auth/github") ||
    path.startsWith("/api/auth/microsoft") ||
    path === "/api/auth/providers";
  if (
    !path.startsWith("/api/") ||
    TERMS_ALLOWLIST.has(path) ||
    isPublicLegalDocRoute ||
    isAuthProviderRoute
  ) {
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

  // Checks every gated doc type (tos, privacy) against the authoritative
  // legal_acceptances ledger — a user must be current on ALL of them.
  Promise.all(GATED_DOC_TYPES.map((docType) => checkAcceptance(user.claims.sub, docType)))
    .then((results) => {
      if (results.every((r) => r.accepted)) {
        next();
        return;
      }
      res.status(403).json({
        error: "TERMS_NOT_ACCEPTED",
        message: "Please review and accept the current Terms of Service and Privacy Policy to continue.",
        currentVersion: results.find((r) => !r.accepted)?.currentVersion ?? CURRENT_TERMS_VERSION,
      });
    })
    .catch((err) => {
      logger.error("compliance.terms_check_failed", { error: err?.message, route: path });
      // Production-like: fail closed. Local/dev: fail open so a DB hiccup does not lock operators out.
      const prodLike =
        process.env.NODE_ENV === "production" ||
        process.env.VERCEL === "1" ||
        process.env.VERCEL === "true";
      if (prodLike) {
        res.status(503).json({
          error: "TERMS_CHECK_UNAVAILABLE",
          message: "Unable to verify terms acceptance. Try again shortly.",
        });
        return;
      }
      next();
    });
}

interface AcceptanceCheck {
  docType: LegalDocType;
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: Date | string | null;
  accepted: boolean;
}

/** Pure comparison, exported for unit testing without a database — a user
 *  is current on a doc type only if they have an acceptance AND its version
 *  string exactly matches the latest published version. Publishing a new
 *  version (any different string) always re-opens the gate. */
export function isAcceptanceCurrent(acceptedVersion: string | null | undefined, currentVersion: string): boolean {
  return Boolean(acceptedVersion) && acceptedVersion === currentVersion;
}

/** Compares a user's latest legal_acceptances row for `docType` against the
 *  latest published legal_documents version for that type. */
async function checkAcceptance(userId: string, docType: LegalDocType): Promise<AcceptanceCheck> {
  const [latestDoc, acceptance] = await Promise.all([
    storage.getLatestLegalDocument(docType),
    storage.getLegalAcceptance(userId, docType),
  ]);
  const currentVersion = latestDoc?.version ?? CURRENT_TERMS_VERSION;
  return {
    docType,
    currentVersion,
    acceptedVersion: acceptance?.version ?? null,
    acceptedAt: acceptance?.acceptedAt ?? null,
    accepted: isAcceptanceCurrent(acceptance?.version, currentVersion),
  };
}

export function registerComplianceRoutes(app: Express): void {
  // ══════════════════════════════════════════════════════════════════════════
  // TERMS OF SERVICE ACCEPTANCE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /api/user/terms-status
   * Reports acceptance status per gated doc type (tos, privacy) against the
   * latest published legal_documents version for each — plus a top-level
   * `accepted` flag (true only if ALL gated types are current) kept for
   * backward compatibility with the pre-Priority-1.1 TermsGate contract.
   */
  app.get("/api/user/terms-status", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
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
        accepted: tos.accepted && privacy.accepted,
      });
    } catch (err) {
      logger.error("compliance.terms_status_failed", { userId, error: (err as Error)?.message });
      res.status(500).json({ error: "Failed to load terms status" });
    }
  });

  /**
   * POST /api/user/accept-terms
   * Records acceptance for one or both gated doc types. Body may specify a
   * single `docType`, or omit it to accept all gated types at once (the
   * TermsGate UI shows both ToS and Privacy on one screen with one button).
   */
  app.post("/api/user/accept-terms", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const schema = z.object({
      docType: z.enum(GATED_DOC_TYPES as [LegalDocType, ...LegalDocType[]]).optional(),
      version: z.string().max(40).optional(), // legacy field, ignored — version is always the current published one
    });
    try {
      const { docType } = schema.parse(req.body ?? {});
      const docTypesToAccept = docType ? [docType] : GATED_DOC_TYPES;
      const acceptedAt = new Date();

      const results = await Promise.all(
        docTypesToAccept.map(async (dt) => {
          const latestDoc = await storage.getLatestLegalDocument(dt);
          const version = latestDoc?.version ?? CURRENT_TERMS_VERSION;
          await storage.createLegalAcceptance({
            userId,
            docType: dt,
            version,
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
          return { docType: dt, version };
        })
      );

      // Keep the fast-path cache on `users` in sync for the `tos` type only
      // (read by the per-request requireTermsAccepted middleware).
      const tosResult = results.find((r) => r.docType === "tos");
      if (tosResult) {
        await db
          .update(users)
          .set({ termsAcceptedAt: acceptedAt, termsVersion: tosResult.version })
          .where(eq(users.id, userId));
      }

      await storage.trackUserActivity(userId, "terms_accepted", {
        docTypes: results.map((r) => r.docType),
        versions: results.map((r) => r.version),
        ipAddress: req.ip,
      });

      res.json({ accepted: true, results, acceptedAt });
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
