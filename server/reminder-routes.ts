import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { sendEmail, reminderLinkEmail } from "./email-service";
import { opaqueConfirmUrl } from "./confirmation-url";
import { dueReminderStage } from "@shared/feature-policy";
import { MAX_EMAILS_PER_REQUEST } from "@shared/confirmation-send";
import { isContractSendable } from "@shared/confirmation-send";
import { logger } from "./logger";
import { ensureProductionFeatureSchema } from "./feature-schema";

function cronAuthorized(req: Request): boolean {
  const secret = (process.env.CRON_SECRET ?? "").trim();
  if (!secret) return process.env.NODE_ENV !== "production";
  const header = req.headers["authorization"]?.toString() ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const alt = req.headers["x-cron-secret"]?.toString() ?? "";
  return bearer === secret || alt === secret;
}

export function registerReminderRoutes(app: Express): void {
  app.get("/api/cron/reminders", handleReminderCron);
  app.post("/api/cron/reminders", handleReminderCron);
}

async function handleReminderCron(req: Request, res: Response): Promise<void> {
  if (!cronAuthorized(req)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    await ensureProductionFeatureSchema();
    const pending = await db.execute(sql`
      SELECT
        sc.id, sc.token, sc.status, sc.sent_at, sc.expires_at, sc.revoked_at,
        sc.contract_id, sc.collaborator_id,
        cc.name AS collaborator_name, cc.email AS collaborator_email, cc.status AS collaborator_status,
        c.title, c.status AS contract_status
      FROM split_confirmations sc
      JOIN contract_collaborators cc ON cc.id = sc.collaborator_id
      JOIN contracts c ON c.id = sc.contract_id
      WHERE sc.status = 'sent'
        AND sc.sent_at IS NOT NULL
        AND sc.revoked_at IS NULL
        AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
      ORDER BY sc.sent_at ASC
      LIMIT 80
    `);

    const sent: string[] = [];
    const skipped: string[] = [];
    let emails = 0;

    for (const row of pending.rows as Record<string, unknown>[]) {
      if (emails >= MAX_EMAILS_PER_REQUEST) break;
      const session = isContractSendable(String(row.contract_status));
      if (!session.ok) {
        skipped.push("session");
        continue;
      }
      if (row.collaborator_status === "signed" || !row.collaborator_email) {
        skipped.push("not_pending");
        continue;
      }
      const existing = await db.execute(sql`
        SELECT stage FROM confirmation_reminders WHERE confirmation_id = ${row.id}
      `);
      const stages = (existing.rows as { stage: string }[]).map((r) => r.stage);
      const due = dueReminderStage(String(row.sent_at), stages);
      if (!due) {
        skipped.push("not_due");
        continue;
      }

      const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      const confirmUrl = opaqueConfirmUrl(baseUrl, String(row.token));
      const template = reminderLinkEmail({
        contributorName: String(row.collaborator_name),
        songTitle: String(row.title),
        confirmUrl,
        stage: due,
      });
      const delivery = await sendEmail({ to: String(row.collaborator_email), ...template });
      const status = delivery.delivered || delivery.mode === "log" ? "sent" : "failed";
      await db.execute(sql`
        INSERT INTO confirmation_reminders (
          confirmation_id, contract_id, collaborator_id, stage, reminder_type, delivery_status
        ) VALUES (
          ${String(row.id)}, ${String(row.contract_id)}, ${String(row.collaborator_id)},
          ${due}, 'pending_confirmation', ${status}
        )
        ON CONFLICT (confirmation_id, stage) DO NOTHING
      `);
      emails += 1;
      if (status === "sent") {
        sent.push(String(row.id));
        logger.info("reminder.sent", { confirmationId: row.id, stage: due, projectId: row.contract_id });
      } else {
        logger.error("reminder.send_failed", { confirmationId: row.id, stage: due });
      }
    }

    res.json({ ok: true, sent: sent.length, skipped: skipped.length, processed: pending.rows.length });
  } catch (error) {
    logger.error("reminder.cron_failed", { error: (error as Error)?.message });
    res.status(500).json({ message: "Reminder job failed" });
  }
}
