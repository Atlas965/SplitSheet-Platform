/**
 * Sends confirmation emails through the existing SMTP helper.
 * Creates or refreshes opaque tokens; never writes confirmed evidence.
 */
import type { Request } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { sendEmail, confirmationLinkEmail, emailDeliveryMode } from "./email-service";
import { logger } from "./logger";
import { confirmationExpiresAt, generateConfirmationToken, opaqueConfirmUrl } from "./confirmation-url";
import { validateSplits } from "@shared/split-validation";
import {
  classifyRecipientSkip,
  isContractSendable,
  MAX_EMAILS_PER_REQUEST,
  SEND_TIME_BUDGET_MS,
  type ConfirmationSendMode,
  type ConfirmationSkipCode,
} from "@shared/confirmation-send";
import {
  evaluateEvent,
  loadWorkflowSnapshot,
  recordWorkflowEvent,
  RSEE_ACTIONS,
} from "./rights-state-engine";
import type { Contract } from "@shared/schema";

export type RecipientSendResult = {
  projectId: string;
  contributorId: string;
  name: string;
  ok: boolean;
  status: "sent" | "logged" | "failed" | "skipped";
  code?: ConfirmationSkipCode | "send_failed";
  message: string;
};

export type ProjectSendResult = {
  projectId: string;
  title: string;
  ok: boolean;
  skipped?: boolean;
  code?: ConfirmationSkipCode;
  message?: string;
  recipients: RecipientSendResult[];
};

type DispatchOptions = {
  mode: ConfirmationSendMode;
  contract: Contract;
  userId: string;
  req: Request;
  remainingEmails: { value: number };
  startedAt: number;
};

function requestBaseUrl(req: Request): string {
  return process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
}

function skipResult(
  projectId: string,
  contributorId: string,
  name: string,
  code: ConfirmationSkipCode,
  message: string,
): RecipientSendResult {
  return { projectId, contributorId, name, ok: true, status: "skipped", code, message };
}

async function ensureConfirmationRow(
  contractId: string,
  collaboratorId: string,
  mode: ConfirmationSendMode,
): Promise<{ id: string; token: string; status: string; sentAt: Date | null; revokedAt: Date | null }> {
  const existing = await db.execute(sql`
    SELECT id, token, status, sent_at, revoked_at
    FROM split_confirmations
    WHERE contract_id = ${contractId} AND collaborator_id = ${collaboratorId}
    LIMIT 1
  `);
  const expires = confirmationExpiresAt();
  if (existing.rows.length > 0) {
    const row = existing.rows[0] as Record<string, unknown>;
    if (mode === "resend" && String(row.status) === "revoked") {
      await db.execute(sql`
        UPDATE split_confirmations
        SET expires_at = ${expires}, revoked_at = NULL, consumed_at = NULL,
            status = 'not_sent', updated_at = NOW()
        WHERE id = ${row.id} AND status = 'revoked'
      `);
      return {
        id: String(row.id),
        token: String(row.token),
        status: "not_sent",
        sentAt: null,
        revokedAt: null,
      };
    }
    await db.execute(sql`
      UPDATE split_confirmations
      SET expires_at = ${expires}, updated_at = NOW()
      WHERE id = ${row.id} AND status != 'confirmed'
    `);
    return {
      id: String(row.id),
      token: String(row.token),
      status: String(row.status ?? "not_sent"),
      sentAt: row.sent_at ? new Date(String(row.sent_at)) : null,
      revokedAt: row.revoked_at ? new Date(String(row.revoked_at)) : null,
    };
  }
  const token = generateConfirmationToken();
  const inserted = await db.execute(sql`
    INSERT INTO split_confirmations (contract_id, collaborator_id, token, status, expires_at)
    VALUES (${contractId}, ${collaboratorId}, ${token}, 'not_sent', ${expires})
    RETURNING id, token, status, sent_at, revoked_at
  `);
  const row = inserted.rows[0] as Record<string, unknown>;
  return {
    id: String(row.id),
    token: String(row.token),
    status: String(row.status ?? "not_sent"),
    sentAt: null,
    revokedAt: null,
  };
}

export async function dispatchPendingConfirmations(opts: DispatchOptions): Promise<ProjectSendResult> {
  const { contract, userId, req, mode, remainingEmails, startedAt } = opts;
  const title = contract.title;
  const sessionGate = isContractSendable(contract.status);
  if (!sessionGate.ok) {
    return {
      projectId: contract.id,
      title,
      ok: true,
      skipped: true,
      code: sessionGate.code,
      message: sessionGate.code === "session_cancelled"
        ? "Project is cancelled."
        : "Project is already completed.",
      recipients: [],
    };
  }

  const collabs = await storage.getContractCollaborators(contract.id);
  if (!collabs.length) {
    return {
      projectId: contract.id,
      title,
      ok: true,
      skipped: true,
      code: "not_pending",
      message: "No contributors on this project.",
      recipients: [],
    };
  }

  const validation = validateSplits(
    collabs.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      ownershipPercentage: c.ownershipPercentage,
    })),
  );
  if (!validation.valid) {
    return {
      projectId: contract.id,
      title,
      ok: false,
      skipped: true,
      code: "invalid_splits",
      message: validation.errors[0]?.message ?? "Splits must total 100% before sending.",
      recipients: [],
    };
  }

  const snapshot = await loadWorkflowSnapshot(contract.id);
  if (snapshot) {
    const allowed = evaluateEvent(snapshot, "REQUEST_CONFIRMATIONS");
    if (!allowed.ok) {
      return {
        projectId: contract.id,
        title,
        ok: false,
        skipped: true,
        code: "not_pending",
        message: allowed.error,
        recipients: [],
      };
    }
  }

  const operator = await storage.getUser(userId).catch(() => undefined);
  const operatorName = operator
    ? `${operator.firstName ?? ""} ${operator.lastName ?? ""}`.trim() || undefined
    : undefined;
  const baseUrl = requestBaseUrl(req);
  const recipients: RecipientSendResult[] = [];
  let sentAny = false;

  for (const collab of collabs) {
    if (Date.now() - startedAt > SEND_TIME_BUDGET_MS || remainingEmails.value <= 0) {
      recipients.push(skipResult(
        contract.id,
        collab.id,
        collab.name,
        "deferred",
        "Send budget reached. Retry to continue with remaining contributors.",
      ));
      continue;
    }

    const existing = await db.execute(sql`
      SELECT id, token, status, sent_at, revoked_at
      FROM split_confirmations
      WHERE contract_id = ${contract.id} AND collaborator_id = ${collab.id}
      LIMIT 1
    `);
    const row = existing.rows[0] as Record<string, unknown> | undefined;
    const classified = classifyRecipientSkip({
      mode,
      confirmationStatus: row ? String(row.status) : "not_sent",
      collaboratorStatus: collab.status,
      email: collab.email,
      sentAt: row?.sent_at ? new Date(String(row.sent_at)) : null,
    });
    if (classified.skip) {
      recipients.push(skipResult(
        contract.id,
        collab.id,
        collab.name,
        classified.code,
        skipMessage(classified.code),
      ));
      continue;
    }

    remainingEmails.value -= 1;
    const confirmation = await ensureConfirmationRow(contract.id, collab.id, mode);
    const confirmUrl = opaqueConfirmUrl(baseUrl, confirmation.token);
    const template = confirmationLinkEmail({
      contributorName: collab.name,
      songTitle: title,
      operatorName,
      confirmUrl,
    });
    const delivery = await sendEmail({ to: String(collab.email), ...template });

    if (delivery.delivered || delivery.mode === "log") {
      await db.execute(sql`
        UPDATE split_confirmations
        SET status = 'sent', sent_at = NOW(), updated_at = NOW()
        WHERE id = ${confirmation.id} AND status IN ('not_sent', 'sent', 'change_requested')
      `);
      sentAny = true;
      const logged = !delivery.delivered && delivery.mode === "log";
      logger.info(mode === "resend" ? "confirmation.resent" : "confirmation.sent", {
        userId,
        projectId: contract.id,
        contributorId: collab.id,
        mode: delivery.mode,
      });
      recipients.push({
        projectId: contract.id,
        contributorId: collab.id,
        name: collab.name,
        ok: true,
        status: logged ? "logged" : "sent",
        message: logged
          ? "Recorded in log mode (SMTP is not configured)."
          : "Confirmation email sent.",
      });
    } else {
      logger.error("confirmation.send_failed", {
        userId,
        projectId: contract.id,
        contributorId: collab.id,
      });
      recipients.push({
        projectId: contract.id,
        contributorId: collab.id,
        name: collab.name,
        ok: false,
        status: "failed",
        code: "send_failed",
        message: "Email delivery failed. You can retry this recipient.",
      });
    }
  }

  if (sentAny) {
    if (contract.status === "draft") {
      await storage.updateContract(contract.id, { status: "pending" });
    }
    await recordWorkflowEvent({
      action: RSEE_ACTIONS.CONFIRMATION_REQUESTED,
      projectId: contract.id,
      previousState: snapshot ? snapshot.contractStatus : "AGREEMENT_READY",
      newState: "CONFIRMATION_REQUESTED",
      actorType: "operator",
      actorId: userId,
      req,
    });
  }

  return {
    projectId: contract.id,
    title,
    ok: recipients.every((r) => r.ok),
    recipients,
  };
}

export function summarizeDispatch(projects: ProjectSendResult[]) {
  const recipients = projects.flatMap((p) => p.recipients);
  return {
    projects,
    sent: recipients.filter((r) => r.status === "sent" || r.status === "logged").length,
    failed: recipients.filter((r) => r.status === "failed").length,
    skipped: recipients.filter((r) => r.status === "skipped").length + projects.filter((p) => p.skipped).length,
    truncated: recipients.some((r) => r.code === "deferred"),
    emailBudget: MAX_EMAILS_PER_REQUEST,
    deliveryMode: emailDeliveryMode,
  };
}

function skipMessage(code: ConfirmationSkipCode): string {
  switch (code) {
    case "already_confirmed":
      return "Already confirmed.";
    case "already_sent":
      return "Already sent recently. Retry later or use resend.";
    case "session_completed":
      return "Project is already completed.";
    case "session_cancelled":
      return "Project is cancelled.";
    case "revoked":
      return "Confirmation link is revoked.";
    case "no_email":
      return "No email address on this contributor.";
    case "invalid_splits":
      return "Splits must total 100%.";
    case "not_yet_sent":
      return "No initial confirmation has been sent yet.";
    case "deferred":
      return "Deferred for a later retry.";
    case "unauthorized":
      return "Not authorized for this project.";
    case "not_found":
      return "Project not found.";
    default:
      return "Not pending.";
  }
}
