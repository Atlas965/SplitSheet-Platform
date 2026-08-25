/**
 * server/security-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Financial-grade split security layer: hash-chained split versioning,
 * fraud/risk scoring, e-signatures with KYC metadata, disputes, API keys,
 * and the zero-knowledge "RaaS" ownership verification endpoint.
 *
 * Mounted from server/routes.ts via registerSecurityRoutes(app).
 * All tables this touches are bootstrapped by server/db-migrations.ts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { isAdmin } from "./adminAuth";
import {
  splitSheetSchema,
  computeContentHash,
  calculateRiskScore,
  recordFraudEvent,
  computeLockExpiry,
  auditLog,
  trackLoginEvent,
  openDispute,
  resolveDispute,
  zkVerifyHandler,
  generateApiKey,
  sha256,
  apiKeyAuth,
  requireScope,
  createRateLimiter,
  type Collaborator,
} from "./security";

// Rate limiters
const splitRateLimit  = createRateLimiter(10, 60_000);   // 10 split changes/min
const signRateLimit   = createRateLimiter(5,  60_000);   // 5 sign attempts/min
const apiRateLimit    = createRateLimiter(100, 60_000);  // 100 RaaS calls/min

export async function registerSecurityRoutes(app: Express): Promise<void> {

  // ══════════════════════════════════════════════════════════════════════════
  // SPLIT SHEET CORE — Secured creation with fraud detection
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/splits
   * Creates a new split version with hash chain + fraud check.
   * Financial-grade companion to the simpler /api/contracts flow — used when
   * an operator wants a tamper-evident, versioned split record.
   */
  app.post(
    "/api/splits",
    isAuthenticated,
    splitRateLimit,
    async (req: Request, res: Response): Promise<void> => {
      const userId = (req as any).user?.claims?.sub;
      try {
        const body = splitSheetSchema.parse(req.body);

        const prevRows = await db.execute(sql`
          SELECT version_number, collaborators, content_hash, created_at
          FROM split_versions
          WHERE contract_id = ${body.contractId}
          ORDER BY version_number DESC LIMIT 1
        `);
        const prev = prevRows.rows[0] as any;
        const prevVersion   = prev ? Number(prev.version_number) : 0;
        const prevCollabs   = prev ? (prev.collaborators as Collaborator[]) : undefined;
        const prevHash      = prev ? String(prev.content_hash) : undefined;
        const timeSincePrev = prev
          ? (Date.now() - new Date(prev.created_at).getTime()) / 60_000
          : undefined;

        const newVersion = prevVersion + 1;

        const fraudCtx = {
          contractId:          body.contractId,
          userId,
          collaborators:       body.collaborators as Collaborator[],
          prevCollaborators:   prevCollabs,
          versionNumber:       newVersion,
          ipAddress:           (req as any).ip ?? "unknown",
          userAgent:           req.headers["user-agent"],
          timeSinceLastVersion: timeSincePrev,
        };
        const fraud = calculateRiskScore(fraudCtx);
        await recordFraudEvent(fraudCtx, fraud);

        if (fraud.action === "freeze") {
          await auditLog({
            userId,
            action:       "split.freeze_rejected",
            resourceType: "contract",
            resourceId:   body.contractId,
            afterState:   { riskScore: fraud.riskScore, rules: fraud.rulesTriggered },
            ipAddress:    (req as any).ip,
            requestId:    (req as any).requestId,
          });
          res.status(403).json({
            error:          "Split creation frozen due to suspicious activity.",
            riskScore:      fraud.riskScore,
            rulesTriggered: fraud.rulesTriggered,
          });
          return;
        }

        const contentHash = computeContentHash(
          body.contractId,
          newVersion,
          body.collaborators as Collaborator[],
          prevHash
        );
        const totalPct = body.collaborators.reduce(
          (s, c) => s + c.ownershipPercentage, 0
        );

        const result = await db.execute(sql`
          INSERT INTO split_versions
            (contract_id, version_number, content_hash, prev_hash,
             status, collaborators, total_pct, created_by)
          VALUES
            (${body.contractId}, ${newVersion}, ${contentHash}, ${prevHash ?? null},
             'draft', ${JSON.stringify(body.collaborators)}::jsonb,
             ${totalPct}, ${userId})
          RETURNING id, version_number, content_hash, status
        `);
        const newSplit = result.rows[0] as any;

        await auditLog({
          userId,
          action:       "split.version_create",
          resourceType: "split_version",
          resourceId:   newSplit.id,
          beforeState:  prev ? { version: prevVersion, hash: prevHash } : null,
          afterState:   { version: newVersion, hash: contentHash, fraudScore: fraud.riskScore },
          ipAddress:    (req as any).ip,
          requestId:    (req as any).requestId,
        });

        res.status(201).json({
          splitVersionId: newSplit.id,
          versionNumber:  newSplit.version_number,
          contentHash:    newSplit.content_hash,
          prevHash:       prevHash ?? null,
          status:         newSplit.status,
          fraudWarning:   fraud.action === "delay" ? {
            message:        "This change has been flagged for review. A short delay may apply.",
            riskScore:      fraud.riskScore,
            rulesTriggered: fraud.rulesTriggered,
          } : null,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: "Validation failed", issues: err.errors });
        } else {
          console.error("[SPLIT CREATE ERROR]", err);
          res.status(500).json({ error: "Failed to create split version" });
        }
      }
    }
  );

  /**
   * POST /api/splits/:versionId/sign
   * Records a signature for a split version. Advances status and, once every
   * collaborator has signed, finalizes a zero-knowledge ownership proof that
   * external partners can verify via /api/raas/verify/:contractId without
   * ever seeing collaborator PII.
   */
  app.post(
    "/api/splits/:versionId/sign",
    isAuthenticated,
    signRateLimit,
    async (req: Request, res: Response): Promise<void> => {
      const userId        = (req as any).user?.claims?.sub;
      const { versionId } = req.params;

      const bodySchema = z.object({
        signerName:    z.string().min(2).max(200),
        signerEmail:   z.string().email(),
        signerTitle:   z.string().max(100).optional(),
        signatureData: z.string().min(100),   // base64 PNG
        mode:          z.enum(["draw", "type"]),
        kycLegalName:  z.string().max(200).optional(),
        kycIdType:     z.string().max(40).optional(),
        kycPhone:      z.string().max(20).optional(),
        kycVerifiedAt: z.string().datetime().optional(),
      });

      try {
        const body = bodySchema.parse(req.body);
        const ip   = (req as any).ip ?? "0.0.0.0";

        const sigHash = sha256(
          `${body.signatureData}${body.signerEmail}${new Date().toISOString()}`
        );
        const phoneHash = body.kycPhone ? sha256(body.kycPhone) : null;

        await db.execute(sql`
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

        const versionRow = await db.execute(sql`
          SELECT sv.id, sv.contract_id, sv.version_number, sv.content_hash, sv.prev_hash,
                 sv.total_pct, sv.collaborators,
                 COUNT(ss.id) AS sig_count
          FROM split_versions sv
          LEFT JOIN split_signatures ss ON ss.split_version_id = sv.id
          WHERE sv.id = ${versionId}::uuid
          GROUP BY sv.id
        `);
        const v = versionRow.rows[0] as any;
        const requiredSigs = (v?.collaborators as Collaborator[])?.length ?? 0;
        const actualSigs   = Number(v?.sig_count ?? 0);
        const allSigned    = actualSigs >= requiredSigs && requiredSigs > 0;

        if (allSigned) {
          const signedAt   = new Date();
          const lockExpiry = computeLockExpiry(signedAt);

          await db.execute(sql`
            UPDATE split_versions SET
              status          = 'signed',
              signed_at       = ${signedAt},
              lock_expires_at = ${lockExpiry}
            WHERE id = ${versionId}::uuid AND status IN ('draft','pending_signatures')
          `);

          // Finalize the zero-knowledge ownership proof for this version
          await db.execute(sql`
            INSERT INTO zk_ownership_proofs
              (contract_id, version_number, content_hash, prev_hash, status,
               total_pct, is_valid, is_finalized, signature_count, collaborator_count, signed_at)
            VALUES
              (${v.contract_id}, ${v.version_number}, ${v.content_hash}, ${v.prev_hash},
               'signed', ${v.total_pct}, TRUE, TRUE, ${actualSigs}, ${requiredSigs}, ${signedAt})
          `);

          // Lock the split 48 hours after signing (in production: a durable job queue)
          setTimeout(async () => {
            await db.execute(sql`
              UPDATE split_versions SET status = 'locked', locked_at = NOW()
              WHERE id = ${versionId}::uuid AND status = 'signed'
            `).catch(() => {});
            await db.execute(sql`
              UPDATE zk_ownership_proofs SET locked_at = NOW()
              WHERE contract_id = ${v.contract_id} AND version_number = ${v.version_number}
            `).catch(() => {});
          }, 48 * 60 * 60 * 1000);
        } else {
          await db.execute(sql`
            UPDATE split_versions SET status = 'pending_signatures'
            WHERE id = ${versionId}::uuid AND status = 'draft'
          `);
        }

        await auditLog({
          userId,
          action:       "split.sign",
          resourceType: "split_version",
          resourceId:   versionId,
          afterState:   { signerEmail: body.signerEmail, allSigned, sigHash },
          ipAddress:    ip,
          requestId:    (req as any).requestId,
        });

        if (userId) {
          await trackLoginEvent(userId, req, "sign_action").catch(() => {});
        }

        res.json({
          signed:   true,
          allSigned,
          status:   allSigned ? "signed" : "pending_signatures",
          message:  allSigned
            ? "All parties have signed. Contract will lock in 48 hours."
            : `${actualSigs}/${requiredSigs} signatures collected.`,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: "Invalid signature data", issues: err.errors });
        } else {
          console.error("[SIGN ERROR]", err);
          res.status(500).json({ error: "Failed to record signature" });
        }
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // DISPUTE ENDPOINTS
  // ══════════════════════════════════════════════════════════════════════════

  app.post("/api/disputes", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    try {
      const result = await openDispute(userId, req.body, req);
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid dispute data", issues: err.errors });
      } else {
        console.error("[DISPUTE OPEN ERROR]", err);
        res.status(500).json({ error: "Failed to open dispute" });
      }
    }
  });

  app.get("/api/disputes", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    const rows = await db.execute(sql`
      SELECT id, contract_id, dispute_type, status, description,
             freeze_payouts, created_at, updated_at
      FROM disputes
      WHERE raised_by = ${userId} OR assigned_to = ${userId}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  });

  app.patch("/api/disputes/:id/resolve", isAuthenticated, isAdmin, async (req: Request, res: Response): Promise<void> => {
    const adminId = (req as any).user?.claims?.sub;
    const schema  = z.object({
      resolution: z.enum(["accepted", "rejected"]),
      notes:      z.string().min(5).max(2000),
    });
    try {
      const { resolution, notes } = schema.parse(req.body);
      await resolveDispute(req.params.id, adminId, resolution, notes, req);
      res.json({ resolved: true, resolution });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid resolve data", issues: err.errors });
      } else {
        console.error("[DISPUTE RESOLVE ERROR]", err);
        res.status(500).json({ error: "Failed to resolve dispute" });
      }
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // API KEY MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  app.post("/api/api-keys", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    const schema = z.object({
      name:      z.string().min(1).max(100),
      scopes:    z.array(z.enum(["verify_ownership", "read_metadata", "write_splits", "*"])),
      expiresAt: z.string().datetime().optional(),
    });
    try {
      const body = schema.parse(req.body);
      const { raw, hash, prefix } = generateApiKey();

      // Build a proper Postgres array literal — passing a JS array directly
      // as a bound parameter serializes to a plain string, not `{a,b}`.
      const scopesLiteral = `{${body.scopes.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(",")}}`;

      await db.execute(sql`
        INSERT INTO api_keys (owner_id, key_hash, key_prefix, name, scopes, expires_at)
        VALUES (${userId}, ${hash}, ${prefix}, ${body.name},
                ${scopesLiteral}::text[], ${body.expiresAt ?? null}::timestamptz)
      `);

      await auditLog({
        userId,
        action:       "api_key.create",
        resourceType: "api_key",
        resourceId:   prefix,
        afterState:   { name: body.name, scopes: body.scopes },
        ipAddress:    (req as any).ip,
        requestId:    (req as any).requestId,
      });

      res.status(201).json({
        key:     raw,
        prefix,
        name:    body.name,
        scopes:  body.scopes,
        warning: "Store this key securely. It will not be shown again.",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid API key config", issues: err.errors });
      } else {
        console.error("[API KEY CREATE ERROR]", err);
        res.status(500).json({ error: "Failed to create API key" });
      }
    }
  });

  app.get("/api/api-keys", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    const rows = await db.execute(sql`
      SELECT id, key_prefix, name, scopes, rate_limit, is_active,
             last_used_at, expires_at, created_at
      FROM api_keys WHERE owner_id = ${userId}
      ORDER BY created_at DESC
    `);
    res.json(rows.rows);  // key_hash NEVER returned
  });

  app.delete("/api/api-keys/:id", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    await db.execute(sql`
      UPDATE api_keys SET is_active = FALSE
      WHERE id = ${req.params.id}::uuid AND owner_id = ${userId}
    `);
    res.json({ revoked: true });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RaaS LAYER — Zero-Knowledge verification
  // ══════════════════════════════════════════════════════════════════════════

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
    async (req: Request, res: Response): Promise<void> => {
      const { verifyHashChain } = await import("./security");
      const result = await verifyHashChain(req.params.contractId);
      res.json(result);
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // FRAUD + RISK (ADMIN) + SPLIT HISTORY
  // ══════════════════════════════════════════════════════════════════════════

  app.get("/api/admin/fraud-events", isAuthenticated, isAdmin, async (_req: Request, res: Response): Promise<void> => {
    const rows = await db.execute(sql`
      SELECT fe.*, crp.current_score, crp.freeze_active
      FROM fraud_events fe
      LEFT JOIN contract_risk_profiles crp ON crp.contract_id = fe.contract_id
      WHERE fe.resolved = FALSE
      ORDER BY fe.created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  });

  app.get("/api/splits/:contractId/history", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    const rows = await db.execute(sql`
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

  // ══════════════════════════════════════════════════════════════════════════
  // AUDIT LOG (self-view)
  // ══════════════════════════════════════════════════════════════════════════

  app.get("/api/audit-log", isAuthenticated, async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.claims?.sub;
    const limit  = Math.min(Number(req.query.limit ?? 50), 200);
    const rows = await db.execute(sql`
      SELECT id, action, resource_type, resource_id, ip_address, created_at
      FROM audit_log
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    res.json(rows.rows);
  });
}
