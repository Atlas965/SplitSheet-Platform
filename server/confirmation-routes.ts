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
 *   GET  /api/confirm/:contractId/:token             — PUBLIC: load confirmation page data
 *   POST /api/confirm/:contractId/:token             — PUBLIC: submit confirmation
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail, confirmationLinkEmail } from "./email-service";
import { storage } from "./storage";
import { createPgRateLimiter } from "./security";
import { requireOwnedContract } from "./authz-helpers";
import { requireActivePermission } from "./rbac-middleware";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** 64-char hex token — cryptographically random, unguessable */
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** 72 hours from now */
function expiresAt72h(): Date {
  return new Date(Date.now() + 72 * 60 * 60 * 1000);
}

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

// ── Register routes ───────────────────────────────────────────────────────────

export function registerConfirmationRoutes(app: Express): void {
  const confirmPublicLimiter = createPgRateLimiter(40, 60_000, "confirm-public");
  app.use("/api/confirm", confirmPublicLimiter);

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
              SET expires_at = ${expires}, updated_at = NOW()
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

        const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
        const operator = await storage.getUser(userId).catch(() => undefined);
        const operatorName = operator ? `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() : undefined;

        const confirmations = await Promise.all(
          results.map(async (r) => {
            const link = `${baseUrl}/confirm/${contractId}/${r.token}`;
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
        const confirmations = (rows.rows as any[]).map((r) => ({
          id:               r.id,
          token:            r.token,
          status:           r.status,
          sentAt:           r.sent_at,
          confirmedAt:      r.confirmed_at,
          expiresAt:        r.expires_at,
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
          link:      `${baseUrl}/confirm/${contractId}/${r.token}`,
          whatsapp:  `https://wa.me/?text=${encodeURIComponent(
            `Hey ${r.collaborator_name} — confirm your split for "${contract.title}": ${baseUrl}/confirm/${contractId}/${r.token}`
          )}`,
          sms: `sms:?body=${encodeURIComponent(
            `Hey ${r.collaborator_name} — confirm your split for "${contract.title}": ${baseUrl}/confirm/${contractId}/${r.token}`
          )}`,
        }));

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

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Load confirmation page data (NO LOGIN REQUIRED)
  // GET /api/confirm/:contractId/:token
  // ══════════════════════════════════════════════════════════════════════════
  app.get(
    "/api/confirm/:contractId/:token",
    async (req: Request, res: Response): Promise<void> => {
      const { contractId, token } = req.params;

      try {
        // Look up the confirmation record
        const rows = await db.execute(sql`
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

        const row = rows.rows[0] as any;

        // Check expiry
        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          res.status(410).json({ error: "This confirmation link has expired. Ask the operator to resend." });
          return;
        }

        // Already confirmed — show success state to the user
        if (row.status === "confirmed") {
          res.json({
            alreadyConfirmed: true,
            confirmedAt:      row.confirmed_at,
            collaboratorName: row.collaborator_name,
            contractTitle:    row.contract_title,
          });
          return;
        }

        // Get all collaborators on this contract to show the full split
        const allCollabs = await db.execute(sql`
          SELECT name, role, ownership_percentage
          FROM contract_collaborators
          WHERE contract_id = ${contractId}
          ORDER BY created_at ASC
        `);

        res.json({
          alreadyConfirmed:    false,
          confirmationId:      row.id,
          contractTitle:       row.contract_title,
          collaboratorName:    row.collaborator_name,
          collaboratorEmail:   row.collaborator_email,
          collaboratorRole:    row.role,
          ownershipPercentage: Number(row.ownership_percentage),
          expiresAt:           row.expires_at,
          allCollaborators:    (allCollabs.rows as any[]).map((c) => ({
            name:               c.name,
            role:               c.role,
            ownershipPercentage: Number(c.ownership_percentage),
          })),
        });
      } catch (err: any) {
        console.error("[PUBLIC-CONFIRM-GET]", err.message);
        res.status(500).json({ error: "Could not load confirmation. Please try again." });
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // PUBLIC: Submit confirmation (NO LOGIN REQUIRED)
  // POST /api/confirm/:contractId/:token
  // Body: { action: "confirm"|"request_change", name?, email?, note? }
  // ══════════════════════════════════════════════════════════════════════════
  app.post(
    "/api/confirm/:contractId/:token",
    async (req: Request, res: Response): Promise<void> => {
      const { contractId, token } = req.params;
      const { action, name, email, note } = req.body ?? {};

      if (!["confirm", "request_change"].includes(action)) {
        res.status(400).json({ error: "action must be 'confirm' or 'request_change'" });
        return;
      }

      try {
        // Look up and validate token
        const rows = await db.execute(sql`
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

        const row = rows.rows[0] as any;

        if (row.expires_at && new Date(row.expires_at) < new Date()) {
          res.status(410).json({ error: "This link has expired. Ask the operator to resend." });
          return;
        }

        // Idempotent: already confirmed is fine — return success, don't double-write
        if (row.status === "confirmed" && action === "confirm") {
          res.json({ success: true, alreadyConfirmed: true, message: "Already confirmed." });
          return;
        }

        const newStatus = action === "confirm" ? "confirmed" : "change_requested";
        const ip = getIp(req);
        const ua = req.headers["user-agent"] ?? null;

        await db.execute(sql`
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

        // If all confirmed → update contract status to 'signed'
        if (action === "confirm") {
          const pendingRows = await db.execute(sql`
            SELECT COUNT(*) AS cnt
            FROM split_confirmations
            WHERE contract_id = ${contractId}
              AND status != 'confirmed'
          `);
          const remaining = Number((pendingRows.rows[0] as any)?.cnt ?? 1);
          if (remaining === 0) {
            await db.execute(sql`
              UPDATE contracts SET status = 'signed', updated_at = NOW()
              WHERE id = ${contractId}
            `);
          }
        }

        res.json({
          success: true,
          action:  newStatus,
          message: action === "confirm"
            ? `Thank you${name ? ` ${name}` : ""}! Your confirmation for "${row.contract_title}" has been recorded.`
            : "Your change request has been recorded. The operator will follow up.",
        });
      } catch (err: any) {
        console.error("[PUBLIC-CONFIRM-POST]", err.message);
        res.status(500).json({ error: "Could not submit confirmation. Please try again." });
      }
    }
  );
}