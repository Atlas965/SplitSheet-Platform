/**
 * server/email-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Outbound email delivery for confirmation links, verification codes, and
 * account notices.
 *
 * Behavior:
 *  - If SMTP_HOST/SMTP_USER/SMTP_PASS are configured, sends real email via
 *    nodemailer.
 *  - Otherwise runs in "log mode": the email is fully rendered and written to
 *    the server log (and returned to the caller when explicitly requested),
 *    so every code path still works end-to-end in local/dev environments
 *    without requiring a paid SMTP provider.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.EMAIL_FROM ?? "SplitSheet <no-reply@splitsheet.ca>";

let transporter: Transporter | null = null;
export const emailDeliveryMode: "smtp" | "log" = SMTP_HOST && SMTP_USER && SMTP_PASS ? "smtp" : "log";

if (emailDeliveryMode === "smtp") {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  delivered: boolean;
  mode: "smtp" | "log";
  messageId?: string;
}

/** Send an email. Never throws — logs and returns delivered:false on failure
 *  so a missing/misconfigured mail provider never breaks a user-facing flow. */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (emailDeliveryMode === "log" || !transporter) {
    logger.info("email.log_mode_send", {
      to: opts.to,
      subject: opts.subject,
      preview: (opts.text ?? opts.html).slice(0, 300),
    });
    return { delivered: false, mode: "log" };
  }

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    logger.info("email.sent", { to: opts.to, subject: opts.subject, messageId: info.messageId });
    return { delivered: true, mode: "smtp", messageId: info.messageId };
  } catch (err: any) {
    logger.error("email.send_failed", { to: opts.to, subject: opts.subject, error: err?.message });
    return { delivered: false, mode: "smtp" };
  }
}

/** Standard confirmation-link email template. */
export function confirmationLinkEmail(params: {
  contributorName: string;
  songTitle: string;
  operatorName?: string;
  confirmUrl: string;
}): { subject: string; html: string; text: string } {
  const { contributorName, songTitle, operatorName, confirmUrl } = params;
  const subject = `Action needed: confirm your split for "${songTitle}"`;
  const text =
    `Hi ${contributorName},\n\n` +
    `${operatorName ?? "Your service provider"} has sent you a split sheet to confirm for "${songTitle}".\n\n` +
    `Review and confirm here: ${confirmUrl}\n\n` +
    `If you weren't expecting this, you can safely ignore this email.\n\n— SplitSheet`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2 style="margin-bottom:4px;">Confirm your split for "${songTitle}"</h2>
      <p>Hi ${contributorName},</p>
      <p>${operatorName ?? "Your service provider"} has sent you a split sheet to review and confirm.</p>
      <p style="margin:24px 0;">
        <a href="${confirmUrl}" style="background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Review &amp; Confirm Split
        </a>
      </p>
      <p style="font-size:12px;color:#666;">If the button doesn't work, copy this link: ${confirmUrl}</p>
      <p style="font-size:12px;color:#999;margin-top:32px;">SplitSheet · SoundLedger Technologies</p>
    </div>`;
  return { subject, html, text };
}

export function reminderLinkEmail(params: {
  contributorName: string;
  songTitle: string;
  confirmUrl: string;
  stage: string;
}): { subject: string; html: string; text: string } {
  const { contributorName, songTitle, confirmUrl, stage } = params;
  const subject = `Reminder: confirm your split for "${songTitle}"`;
  const text =
    `Hi ${contributorName},\n\n` +
    `This is a reminder to review and confirm your split for "${songTitle}".\n\n` +
    `Confirm here: ${confirmUrl}\n\n` +
    `If you already confirmed, you can ignore this email.\n\n— SplitSheet`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2>Reminder: confirm your split</h2>
      <p>Hi ${contributorName},</p>
      <p>Your confirmation for "${songTitle}" is still pending (${stage.replace("_", " ")}).</p>
      <p style="margin:24px 0;">
        <a href="${confirmUrl}" style="background:#111827;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Review &amp; Confirm Split
        </a>
      </p>
      <p style="font-size:12px;color:#999;">SplitSheet · SoundLedger Technologies</p>
    </div>`;
  return { subject, html, text };
}

/** Identity verification code email template. */
export function verificationCodeEmail(code: string): { subject: string; html: string; text: string } {
  const subject = "Your SplitSheet verification code";
  const text = `Your verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this email.`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;">
      <h2>Your verification code</h2>
      <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;">${code}</p>
      <p style="font-size:13px;color:#666;">This code expires in 10 minutes.</p>
    </div>`;
  return { subject, html, text };
}
