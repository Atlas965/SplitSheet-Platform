import type { Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { evaluateConfirmationToken } from "./confirmation-token-policy";
import { logAuthEvent, AUTH_EVENTS } from "./auth-events";
import { accessMethodFromRequest } from "./confirmation-url";
import {
  completeConfirmedProject,
  deriveRightsState,
  evaluateEvent,
  loadWorkflowSnapshot,
  recordWorkflowEvent,
  RSEE_ACTIONS,
} from "./rights-state-engine";

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown"
  );
}

export async function lookupConfirmation(token: string, contractId?: string) {
  if (contractId) {
    return db.execute(sql`
      SELECT
        sc.id, sc.status, sc.expires_at, sc.revoked_at, sc.consumed_at, sc.confirmed_at,
        sc.collaborator_id, sc.contract_id,
        cc.name AS collaborator_name, cc.email AS collaborator_email, cc.role, cc.ownership_percentage,
        c.title AS contract_title
      FROM split_confirmations sc
      JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
      JOIN contracts c ON c.id = sc.contract_id
      WHERE sc.token = ${token}
        AND sc.contract_id = ${contractId}
      LIMIT 1
    `);
  }
  return db.execute(sql`
    SELECT
      sc.id, sc.status, sc.expires_at, sc.revoked_at, sc.consumed_at, sc.confirmed_at,
      sc.collaborator_id, sc.contract_id,
      cc.name AS collaborator_name, cc.email AS collaborator_email, cc.role, cc.ownership_percentage,
      c.title AS contract_title
    FROM split_confirmations sc
    JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
    JOIN contracts c ON c.id = sc.contract_id
    WHERE sc.token = ${token}
    LIMIT 1
  `);
}

async function recordConfirmationAccess(
  req: Request,
  row: { id: string; contract_id: string },
  method: "qr" | "link",
) {
  await db.execute(sql`
    UPDATE split_confirmations SET
      first_accessed_at = COALESCE(first_accessed_at, NOW()),
      last_accessed_at = NOW(),
      access_count = COALESCE(access_count, 0) + 1,
      access_method = CASE
        WHEN ${method} = 'qr' THEN 'qr'
        ELSE COALESCE(access_method, 'link')
      END,
      updated_at = NOW()
    WHERE id = ${row.id}
  `);
  if (method === "qr") {
    await logAuthEvent({
      action: AUTH_EVENTS.QR_ACCESSED,
      resourceType: "split_confirmation",
      resourceId: row.id,
      afterState: { contractId: row.contract_id, accessMethod: "qr" },
      req,
    });
  } else {
    await logAuthEvent({
      action: AUTH_EVENTS.CONFIRM_VIEW,
      resourceType: "split_confirmation",
      resourceId: row.id,
      afterState: { contractId: row.contract_id, accessMethod: "link" },
      req,
    });
  }
  const snap = await loadWorkflowSnapshot(row.contract_id);
  const previous = snap ? deriveRightsState(snap) : "CONFIRMATION_REQUESTED";
  await recordWorkflowEvent({
    action: RSEE_ACTIONS.CONFIRMATION_ACCESSED,
    projectId: row.contract_id,
    previousState: previous,
    newState: "ACCESSED",
    actorType: "contributor",
    entityType: "split_confirmation",
    entityId: row.id,
    accessMethod: method,
    req,
  });
  await recordWorkflowEvent({
    action: RSEE_ACTIONS.CONFIRMATION_REVIEWED,
    projectId: row.contract_id,
    previousState: "ACCESSED",
    newState: "REVIEWED",
    actorType: "contributor",
    entityType: "split_confirmation",
    entityId: row.id,
    accessMethod: method,
    req,
  });
}

export async function handlePublicConfirmGet(
  req: Request,
  res: Response,
  token: string,
  contractId?: string,
): Promise<void> {
  try {
    const rows = await lookupConfirmation(token, contractId);
    if (!rows.rows.length) {
      res.status(404).json({ error: "Confirmation link not found or invalid." });
      return;
    }

    const row = rows.rows[0] as any;
    const resolvedContractId = row.contract_id as string;
    const gate = evaluateConfirmationToken(row);
    if (!gate.ok) {
      res.status(gate.status).json({ error: gate.error, code: gate.code });
      return;
    }

    const method = accessMethodFromRequest(req.query.via);

    const snapshot = await loadWorkflowSnapshot(resolvedContractId);
    if (snapshot && deriveRightsState(snapshot) === "CANCELLED") {
      res.status(410).json({
        error: "This project is no longer accepting confirmations.",
        code: "cancelled",
      });
      return;
    }

    if (row.status === "confirmed") {
      res.json({
        alreadyConfirmed: true,
        confirmedAt: row.confirmed_at,
        collaboratorName: row.collaborator_name,
        contractTitle: row.contract_title,
      });
      return;
    }

    const allCollabs = await db.execute(sql`
      SELECT name, role, ownership_percentage
      FROM contract_collaborators
      WHERE contract_id = ${resolvedContractId}
      ORDER BY created_at ASC
    `);

    let contributorConsentVersion: string | null = null;
    try {
      const consent = await storage.getLatestLegalDocument("contributor_consent");
      contributorConsentVersion = consent?.version ?? null;
    } catch {
      /* optional */
    }

    await recordConfirmationAccess(req, { id: row.id, contract_id: resolvedContractId }, method);

    res.json({
      alreadyConfirmed: false,
      contractTitle: row.contract_title,
      collaboratorName: row.collaborator_name,
      collaboratorEmail: row.collaborator_email,
      collaboratorRole: row.role,
      ownershipPercentage: Number(row.ownership_percentage),
      expiresAt: row.expires_at,
      contributorConsentVersion,
      accessMethod: method,
      allCollaborators: (allCollabs.rows as any[]).map((c) => ({
        name: c.name,
        role: c.role,
        ownershipPercentage: Number(c.ownership_percentage),
      })),
    });
  } catch (err: any) {
    console.error("[PUBLIC-CONFIRM-GET]", err.message);
    res.status(500).json({ error: "Could not load confirmation. Please try again." });
  }
}

export async function handlePublicConfirmPost(
  req: Request,
  res: Response,
  token: string,
  contractId?: string,
): Promise<void> {
  const { action, name, email, note, accessMethod: bodyMethod } = req.body ?? {};

  if (!["confirm", "request_change"].includes(action)) {
    res.status(400).json({ error: "action must be 'confirm' or 'request_change'" });
    return;
  }

  try {
    const rows = await lookupConfirmation(token, contractId);
    if (!rows.rows.length) {
      res.status(404).json({ error: "Confirmation link not found." });
      return;
    }

    const row = rows.rows[0] as any;
    const resolvedContractId = row.contract_id as string;
    const gate = evaluateConfirmationToken(row, { forSubmit: true });
    if (!gate.ok) {
      res.status(gate.status).json({ error: gate.error, code: gate.code });
      return;
    }

    if (action === "confirm" && !String(name ?? "").trim()) {
      res.status(400).json({ error: "Name is required to confirm." });
      return;
    }

    if (row.status === "confirmed" && action === "confirm") {
      res.json({ success: true, alreadyConfirmed: true, message: "Already confirmed." });
      return;
    }

    const snapshot = await loadWorkflowSnapshot(resolvedContractId);
    if (snapshot) {
      const projectState = deriveRightsState(snapshot);
      if (projectState === "CANCELLED") {
        res.status(410).json({
          error: "This project is no longer accepting confirmations.",
          code: "cancelled",
        });
        return;
      }
      const event = action === "confirm" ? "SUBMIT_CONFIRMATION" : "REQUEST_CHANGE";
      const allowed = evaluateEvent(snapshot, event);
      if (!allowed.ok) {
        res.status(409).json({ error: allowed.error, code: allowed.code });
        return;
      }
    }

    if (row.consumed_at && action === "request_change") {
      res.status(410).json({
        error: "This confirmation was already completed and cannot be changed via this link.",
        code: "consumed",
      });
      return;
    }

    const newStatus = action === "confirm" ? "confirmed" : "change_requested";
    const ip = getIp(req);
    const ua = req.headers["user-agent"] ?? null;
    const method = accessMethodFromRequest(req.query.via, bodyMethod);

    let consentVersions: Record<string, string> | null = null;
    try {
      const consent = await storage.getLatestLegalDocument("contributor_consent");
      if (consent?.version) {
        consentVersions = { contributor_consent: consent.version };
      }
    } catch {
      /* optional evidence */
    }
    const consentJson = consentVersions ? JSON.stringify(consentVersions) : null;
    const consumedAt = action === "confirm" ? new Date() : null;

    const updated = await db.execute(sql`
      UPDATE split_confirmations SET
        status            = ${newStatus},
        confirmed_name    = ${name ?? null},
        confirmed_email   = ${email ?? null},
        confirmation_note = ${note ?? null},
        ip_address        = ${ip},
        user_agent        = ${ua},
        access_method     = CASE
          WHEN ${method} = 'qr' THEN 'qr'
          ELSE COALESCE(access_method, 'link')
        END,
        confirmed_at      = NOW(),
        consumed_at       = COALESCE(${consumedAt}, consumed_at),
        consent_versions  = COALESCE(${consentJson}::jsonb, consent_versions),
        updated_at        = NOW()
      WHERE id = ${row.id}
        AND revoked_at IS NULL
        AND status IS DISTINCT FROM 'confirmed'
      RETURNING id
    `);

    if (!updated.rows.length) {
      const again = await lookupConfirmation(token, contractId);
      const latest = again.rows[0] as any;
      if (latest?.status === "confirmed" && action === "confirm") {
        res.json({ success: true, alreadyConfirmed: true, message: "Already confirmed." });
        return;
      }
      res.status(409).json({ error: "This confirmation can no longer be updated.", code: "conflict" });
      return;
    }

    if (action === "confirm") {
      await recordWorkflowEvent({
        action: RSEE_ACTIONS.CONFIRMATION_COMPLETED,
        projectId: resolvedContractId,
        previousState: snapshot ? deriveRightsState(snapshot) : "REVIEWED",
        newState: "CONFIRMED",
        actorType: "contributor",
        entityType: "split_confirmation",
        entityId: row.id,
        accessMethod: method,
        req,
      });
      const pendingRows = await db.execute(sql`
        SELECT COUNT(*) AS cnt
        FROM split_confirmations
        WHERE contract_id = ${resolvedContractId}
          AND status != 'confirmed'
          AND (revoked_at IS NULL)
      `);
      const remaining = Number((pendingRows.rows[0] as any)?.cnt ?? 1);
      if (remaining === 0) {
        await completeConfirmedProject({
          contractId: resolvedContractId,
          actorType: "contributor",
          accessMethod: method,
          req,
        });
      }
    } else {
      await recordWorkflowEvent({
        action: RSEE_ACTIONS.CHANGE_REQUESTED,
        projectId: resolvedContractId,
        previousState: snapshot ? deriveRightsState(snapshot) : "REVIEWED",
        newState: "CHANGE_REQUESTED",
        actorType: "contributor",
        entityType: "split_confirmation",
        entityId: row.id,
        accessMethod: method,
        req,
      });
    }

    await logAuthEvent({
      action: AUTH_EVENTS.CONFIRM_SUBMIT,
      resourceType: "split_confirmation",
      resourceId: row.id,
      afterState: {
        contractId: resolvedContractId,
        action: newStatus,
        accessMethod: method,
        hasConsentVersions: !!consentVersions,
      },
      req,
    });

    res.json({
      success: true,
      action: newStatus,
      message: action === "confirm"
        ? `Thank you${name ? ` ${name}` : ""}! Your confirmation for "${row.contract_title}" has been recorded.`
        : "Your change request has been recorded. The operator will follow up.",
    });
  } catch (err: any) {
    console.error("[PUBLIC-CONFIRM-POST]", err.message);
    res.status(500).json({ error: "Could not submit confirmation. Please try again." });
  }
}
