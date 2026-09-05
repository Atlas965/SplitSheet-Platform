/**
 * server/confirmation-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Add to server/routes.ts at bottom of registerRoutes():
 *   import { registerConfirmationRoutes } from "./confirmation-routes";
 *   registerConfirmationRoutes(app);
 *
 * Endpoints:
 *   POST /api/contracts/:id/generate-confirmations   — create tokens per collaborator
 *   GET  /api/contracts/:id/confirmations            — operator: get tracking status
 *   POST /api/contracts/:id/confirmations/resend     — mark as re-sent (new sentAt)
 *   POST /api/contracts/:id/confirmations/:confirmId/qr — generate/regenerate QR
 *   GET  /api/confirm/:token                         — PUBLIC: opaque token (QR)
 *   GET  /api/confirm/:contractId/:token             — PUBLIC: legacy two-segment links
 *   POST /api/confirm/:token                         — PUBLIC: submit via opaque token
 *   POST /api/confirm/:contractId/:token             — PUBLIC: submit confirmation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Express, Request, Response } from "express";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail, confirmationLinkEmail } from "./email-service";
import { storage } from "./storage";
import { createPgRateLimiter } from "./security";
import { requireOwnedContract } from "./authz-helpers";
import { requireActivePermission } from "./rbac-middleware";
import { ensureContributorTokenSchema } from "./confirmation-token-policy";
import { logAuthEvent, AUTH_EVENTS } from "./auth-events";
import { handlePublicConfirmGet, handlePublicConfirmPost } from "./confirmation-public";
import {
  confirmationExpiresAt,
  generateConfirmationToken,
  opaqueConfirmUrl,
} from "./confirmation-url";
import {
  evaluateEvent,
  getProjectWorkflow,
  loadWorkflowSnapshot,
  recordWorkflowEvent,
  RSEE_ACTIONS,
} from "./rights-state-engine";
import { dispatchPendingConfirmations, summarizeDispatch } from "./confirmation-dispatch";
import { MAX_EMAILS_PER_REQUEST } from "@shared/confirmation-send";

function generateToken(): string {
  return generateConfirmationToken();
}

function expiresAt72h(): Date {
  return confirmationExpiresAt();
}

function requestBaseUrl(req: Request): string {
  return process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
}

// ── Register routes ───────────────────────────────────────────────────────────

export function registerConfirmationRoutes(app: Express): void {
  const confirmPublicLimiter = createPgRateLimiter(40, 60_000, "confirm-public");
  app.use("/api/confirm", confirmPublicLimiter);
  void ensureContributorTokenSchema().catch((err) =>
    console.warn("[confirm] schema ensure skipped:", err),
  );

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATOR: Generate confirmation tokens for all collaborators on a contract
  // POST /api/contracts/:id/generate-confirmations
  // ══════════════════════════════════════════════════════════════════════════
  app.post(
    "/api/contracts/:id/generate-confirmations",
    ...requireActivePermission("agreement.send"),
    async (req: Request, res: Response): Promise<void> => {
      const contractId = req.params.id;
      const userId = (req as any).user?.claims?.sub;

      try {
        const owned = await requireOwnedContract(req, res, contractId);
        if (!owned) return;
        const contract = { title: owned.title, status: owned.status, created_by: owned.createdBy };

        const snapshot = await loadWorkflowSnapshot(contractId);
        if (snapshot) {
          const allowed = evaluateEvent(snapshot, "REQUEST_CONFIRMATIONS");
          if (!allowed.ok) {
            res.status(400).json({
              error: allowed.error,
              code: allowed.code,
              validation: allowed.validation,
            });
            return;
          }
        }

        // Get all collaborators
        const collabRows = await db.execute(sql`
          SELECT id, name, email, role, ownership_percentage
          FROM contract_collaborators
          WHERE contract_id = ${contractId}
          ORDER BY created_at ASC
        `);
        const collaborators = collabRows.rows as any[];
        if (!collaborators.length) {
          res.status(400).json({ error: "No collaborators on this contract" });
          return;
        }

        // Upsert one confirmation record per collaborator
        const results = [];
        const expires = expiresAt72h();

        for (const collab of collaborators) {
          // Check if a confirmation already exists
          const existing = await db.execute(sql`
            SELECT id, token, status FROM split_confirmations
            WHERE contract_id = ${contractId}
              AND collaborator_id = ${collab.id}
            LIMIT 1
          `);

          if (existing.rows.length > 0) {
            const row = existing.rows[0] as any;
            // Already exists — refresh expiry and mark as not_sent so operator can re-send
            await db.execute(sql`
              UPDATE split_confirmations
              SET expires_at = ${expires},
                  revoked_at = NULL,
                  consumed_at = NULL,
                  status = CASE WHEN status = 'revoked' THEN 'not_sent' ELSE status END,
                  updated_at = NOW()
              WHERE id = ${row.id}
            `);
            results.push({ collaboratorId: collab.id, name: collab.name, token: row.token, status: row.status, isNew: false });
          } else {
            const token = generateToken();
            await db.execute(sql`
              INSERT INTO split_confirmations
                (contract_id, collaborator_id, token, status, expires_at)
              VALUES
                (${contractId}, ${collab.id}, ${token}, 'not_sent', ${expires})
            `);
            results.push({ collaboratorId: collab.id, name: collab.name, token, status: "not_sent", isNew: true });
          }
        }

        const baseUrl = requestBaseUrl(req);
        const operator = await storage.getUser(userId).catch(() => undefined);
        const operatorName = operator ? `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() : undefined;

        const confirmations = await Promise.all(
          results.map(async (r) => {
            const link = opaqueConfirmUrl(baseUrl, r.token);
            const collab = collaborators.find((c: any) => c.id === r.collaboratorId);
            let emailSent = false;

            if (collab?.email) {
              const template = confirmationLinkEmail({
                contributorName: r.name,
                songTitle: contract.title,
                operatorName,
                confirmUrl: link,
              });
              const delivery = await sendEmail({ to: collab.email, ...template });
              emailSent = delivery.delivered;
              if (delivery.delivered) {
                await db.execute(sql`
                  UPDATE split_confirmations
                  SET status = 'sent', sent_at = NOW(), updated_at = NOW()
                  WHERE contract_id = ${contractId} AND collaborator_id = ${r.collaboratorId}
                    AND status IN ('not_sent', 'sent')
                `).catch(() => {});
              }
            }

            return {
              ...r,
              status: emailSent ? "sent" : r.status,
              emailSent,
              link,
              whatsapp: `https://wa.me/?text=${encodeURIComponent(
                `Hey ${r.name} — please review and confirm your split for "${contract.title}" here: ${link}`
              )}`,
              sms: `sms:?body=${encodeURIComponent(
                `Hey ${r.name} — confirm your split for "${contract.title}": ${link}`
              )}`,
            };
          })
        );

        await recordWorkflowEvent({
          action: RSEE_ACTIONS.CONFIRMATION_REQUESTED,
          projectId: contractId,
          previousState: snapshot ? snapshot.contractStatus : "AGREEMENT_READY",
          newState: "CONFIRMATION_REQUESTED",
          actorType: "operator",
          actorId: userId,
          req,
        });

        res.json({ contractId, contractTitle: contract.title, confirmations });
      } catch (err: any) {
        console.error("[GENERATE-CONFIRMATIONS]", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATOR: Get confirmation tracking status for a contract
  // GET /api/contracts/:id/confirmations
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/api/contracts/:id/confirmations",
    ...requireActivePermission("agreement.read"),
    async (req: Request, res: Response): Promise<void> => {
      const contractId = req.params.id;
      const userId = (req as any).user?.claims?.sub;

      try {
        const owned = await requireOwnedContract(req, res, contractId);
        if (!owned) return;
        const contract = { title: owned.title, status: owned.status };

        // Join confirmations with collaborators
        const rows = await db.execute(sql`
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
            sc.revoked_at,
            sc.qr_generated_at,
            sc.access_method,
            sc.access_count,
            sc.first_accessed_at,
            sc.last_accessed_at,
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

        const baseUrl = requestBaseUrl(req);
        const confirmations = (rows.rows as any[]).map((r) => {
          const link = opaqueConfirmUrl(baseUrl, r.token);
          return {
          id:               r.id,
          token:            r.token,
          status:           r.status,
          sentAt:           r.sent_at,
          confirmedAt:      r.confirmed_at,
          expiresAt:        r.expires_at,
          revokedAt:        r.revoked_at,
          qrGeneratedAt:    r.qr_generated_at,
          accessMethod:     r.access_method,
          accessCount:      Number(r.access_count ?? 0),
          firstAccessedAt:  r.first_accessed_at,
          lastAccessedAt:   r.last_accessed_at,
          confirmedName:    r.confirmed_name,
          confirmedEmail:   r.confirmed_email,
          confirmationNote: r.confirmation_note,
          collaborator: {
            id:                 r.collaborator_id,
            name:               r.collaborator_name,
            email:              r.collaborator_email,
            role:               r.role,
            ownershipPercentage: Number(r.ownership_percentage),
          },
          link,
          whatsapp:  `https://wa.me/?text=${encodeURIComponent(
            `Hey ${r.collaborator_name} — confirm your split for "${contract.title}": ${link}`
          )}`,
          sms: `sms:?body=${encodeURIComponent(
            `Hey ${r.collaborator_name} — confirm your split for "${contract.title}": ${link}`
          )}`,
        };
        });

        // Summary counts
        const total      = confirmations.length;
        const confirmed  = confirmations.filter((c) => c.status === "confirmed").length;
        const pending    = confirmations.filter((c) => c.status === "sent").length;
        const notSent    = confirmations.filter((c) => c.status === "not_sent").length;
        const changed    = confirmations.filter((c) => c.status === "change_requested").length;
        const allConfirmed = confirmed === total && total > 0;

        res.json({
          contractId,
          contractTitle: contract.title,
          contractStatus: contract.status,
          allConfirmed,
          summary: { total, confirmed, pending, notSent, changeRequested: changed },
          confirmations,
        });
      } catch (err: any) {
        console.error("[GET-CONFIRMATIONS]", err.message);
        res.status(500).json({ error: err.message });
      }
    }
  );

  app.get(
    "/api/contracts/:id/workflow",
    ...requireActivePermission("project.read"),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const owned = await requireOwnedContract(req, res, req.params.id);
        if (!owned) return;
        const workflow = await getProjectWorkflow(req.params.id);
        if (!workflow) {
          res.status(404).json({ error: "Project not found" });
          return;
        }
        res.json(workflow);
      } catch (err: any) {
        console.error("[GET-WORKFLOW]", err.message);
        res.status(500).json({ error: "Could not load workflow status." });
      }
    },
  );

  // OPERATOR: Resend pending confirmation emails (same tokens, skip confirmed)
  app.post(
    "/api/contracts/:id/confirmations/resend",
    ...requireActivePermission("agreement.send"),
    async (req: Request, res: Response): Promise<void> => {
      const contractId = req.params.id;
      const userId = (req as any).user?.claims?.sub;
      try {
        const owned = await requireOwnedContract(req, res, contractId);
        if (!owned) return;
        const project = await dispatchPendingConfirmations({
          mode: "resend",
          contract: owned,
          userId,
          req,
          remainingEmails: { value: MAX_EMAILS_PER_REQUEST },
          startedAt: Date.now(),
        });
        res.json(summarizeDispatch([project]));
      } catch (err: any) {
        res.status(500).json({ error: "Failed to resend confirmations" });
      }
    },
  );

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATOR: Mark a confirmation link as sent (updates sentAt + status)
  // POST /api/contracts/:id/confirmations/:confirmId/mark-sent
  // ══════════════════════════════════════════════════════════════════════════
  app.post(
    "/api/contracts/:id/confirmations/:confirmId/mark-sent",
    ...requireActivePermission("agreement.send"),
    async (req: Request, res: Response): Promise<void> => {
      const { id: contractId, confirmId } = req.params;
      try {
        const owned = await requireOwnedContract(req, res, contractId);
        if (!owned) return;

        const result = await db.execute(sql`
          UPDATE split_confirmations
          SET status = 'sent', sent_at = NOW(), updated_at = NOW()
          WHERE id = ${confirmId}
            AND contract_id = ${contractId}
            AND status IN ('not_sent', 'sent')
          RETURNING id
        `);
        if (!result.rows.length) {
          res.status(404).json({ error: "Confirmation not found for this contract" });
          return;
        }
        res.json({ success: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    }
  );

  // OPERATOR: Revoke a confirmation link (Phase 6)
  app.post(
    "/api/contracts/:id/confirmations/:confirmId/revoke",
    ...requireActivePermission("agreement.send"),
    async (req: Request, res: Response): Promise<void> => {
      const { id: contractId, confirmId } = req.params;
      const userId = (req as any).user?.claims?.sub;
      try {
        const owned = await requireOwnedContract(req, res, contractId);
        if (!owned) return;
        const snapshot = await loadWorkflowSnapshot(contractId);
        if (snapshot) {
          const allowed = evaluateEvent(snapshot, "REVOKE_TOKEN", { requireValidSplits: false });
          if (!allowed.ok) {
            res.status(409).json({ error: allowed.error, code: allowed.code });
            return;
          }
        }
        const result = await db.execute(sql`
          UPDATE split_confirmations
          SET status = 'revoked', revoked_at = NOW(), updated_at = NOW()
          WHERE id = ${confirmId}
            AND contract_id = ${contractId}
            AND status != 'confirmed'
          RETURNING id
        `);
        if (!result.rows.length) {
          res.status(404).json({
            error: "Confirmation not found or already confirmed (cannot revoke confirmed)",
          });
          return;
        }
        await logAuthEvent({
          action: AUTH_EVENTS.CONFIRM_REVOKE,
          userId,
          resourceType: "split_confirmation",
          resourceId: confirmId,
          afterState: { contractId },
          req,
        });
        await logAuthEvent({
          action: AUTH_EVENTS.QR_REVOKED,
          userId,
          resourceType: "split_confirmation",
          resourceId: confirmId,
          afterState: { contractId },
          req,
        });
        await recordWorkflowEvent({
          action: RSEE_ACTIONS.TOKEN_REVOKED,
          projectId: contractId,
          previousState: snapshot ? "CONFIRMATION_REQUESTED" : null,
          newState: "REVOKED",
          actorType: "operator",
          actorId: userId,
          entityType: "split_confirmation",
          entityId: confirmId,
          req,
        });
        res.json({ revoked: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  app.post(
    "/api/contracts/:id/confirmations/:confirmId/qr",
    ...requireActivePermission("agreement.send"),
    async (req: Request, res: Response): Promise<void> => {
      const { id: contractId, confirmId } = req.params;
      const userId = (req as any).user?.claims?.sub;
      const regenerate = Boolean((req.body ?? {}).regenerate);
      try {
        const owned = await requireOwnedContract(req, res, contractId);
        if (!owned) return;
        const snapshot = await loadWorkflowSnapshot(contractId);
        if (snapshot) {
          const allowed = evaluateEvent(snapshot, "GENERATE_QR", { requireValidSplits: false });
          if (!allowed.ok) {
            res.status(409).json({ error: allowed.error, code: allowed.code });
            return;
          }
        }
        const rows = await db.execute(sql`
          SELECT sc.id, sc.token, sc.status, sc.expires_at, sc.revoked_at,
                 cc.name AS collaborator_name
          FROM split_confirmations sc
          JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
          WHERE sc.id = ${confirmId} AND sc.contract_id = ${contractId}
          LIMIT 1
        `);
        if (!rows.rows.length) {
          res.status(404).json({ error: "Confirmation request not found for this project." });
          return;
        }
        const row = rows.rows[0] as any;
        if (row.status === "confirmed") {
          res.status(409).json({ error: "This confirmation is already complete. QR cannot be regenerated." });
          return;
        }
        const expired = row.expires_at && new Date(row.expires_at) < new Date();
        const rotate = regenerate || Boolean(row.revoked_at) || row.status === "revoked" || expired;
        const expires = expiresAt72h();
        let token = row.token as string;
        if (rotate) {
          token = generateToken();
          await db.execute(sql`
            UPDATE split_confirmations SET
              token = ${token},
              status = CASE WHEN status = 'revoked' THEN 'not_sent' ELSE status END,
              revoked_at = NULL,
              consumed_at = NULL,
              expires_at = ${expires},
              qr_generated_at = NOW(),
              updated_at = NOW()
            WHERE id = ${row.id} AND contract_id = ${contractId}
          `);
          await logAuthEvent({
            action: AUTH_EVENTS.QR_REGENERATED,
            userId,
            resourceType: "split_confirmation",
            resourceId: confirmId,
            afterState: { contractId },
            req,
          });
        } else {
          await db.execute(sql`
            UPDATE split_confirmations SET
              qr_generated_at = NOW(),
              expires_at = COALESCE(expires_at, ${expires}),
              updated_at = NOW()
            WHERE id = ${row.id} AND contract_id = ${contractId}
          `);
          await logAuthEvent({
            action: AUTH_EVENTS.QR_GENERATED,
            userId,
            resourceType: "split_confirmation",
            resourceId: confirmId,
            afterState: { contractId },
            req,
          });
        }
        await recordWorkflowEvent({
          action: RSEE_ACTIONS.QR_GENERATED,
          projectId: contractId,
          previousState: snapshot ? "CONFIRMATION_REQUESTED" : null,
          newState: "CONFIRMATION_REQUESTED",
          actorType: "operator",
          actorId: userId,
          entityType: "split_confirmation",
          entityId: confirmId,
          accessMethod: "qr",
          metadata: { rotated: rotate },
          req,
        });
        res.json({
          id: confirmId,
          status: rotate && row.status === "revoked" ? "not_sent" : row.status,
          expiresAt: expires,
          qrGeneratedAt: new Date().toISOString(),
          rotated: rotate,
          link: opaqueConfirmUrl(requestBaseUrl(req), token, true),
          contributorName: row.collaborator_name,
          projectName: owned.title,
        });
      } catch (err: any) {
        console.error("[QR-GENERATE]", err.message);
        res.status(500).json({ error: err.message });
      }
    },
  );

  // PUBLIC: opaque token (QR) and legacy two-segment links
  app.get("/api/confirm/:token", async (req, res) => {
    await handlePublicConfirmGet(req, res, req.params.token);
  });
  app.post("/api/confirm/:token", async (req, res) => {
    await handlePublicConfirmPost(req, res, req.params.token);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Load confirmation page data (NO LOGIN REQUIRED)
  // GET /api/confirm/:contractId/:token
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/api/confirm/:contractId/:token",
    async (req: Request, res: Response): Promise<void> => {
      await handlePublicConfirmGet(req, res, req.params.token, req.params.contractId);
    },
  );

  app.post(
    "/api/confirm/:contractId/:token",
    async (req: Request, res: Response): Promise<void> => {
      await handlePublicConfirmPost(req, res, req.params.token, req.params.contractId);
    },
  );
}





