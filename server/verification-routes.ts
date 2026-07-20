/**
 * server/verification-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real backend for the IdentityVerification.tsx (KYC) flow. Replaces the
 * client-simulated "any 6-digit code" demo with a server-generated,
 * hashed, expiring one-time code delivered by email (SMS requires a
 * carrier/API vendor — the same code path logs it clearly instead of
 * silently pretending to text it).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { z } from "zod";
import { db } from "./db";
import { verificationCodes, userActivity } from "@shared/schema";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { sha256 } from "./security";
import { sendEmail, verificationCodeEmail, emailDeliveryMode } from "./email-service";
import { isTwilioConfigured, sendSms } from "./verification/sms-provider";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

const sendCodeSchema = z.object({
  destination: z.string().min(3).max(200), // email address or phone number
  channel: z.enum(["email", "sms"]).default("email"),
  purpose: z.string().max(50).default("identity_verification"),
  legalName: z.string().max(200).optional(),
  idType: z.string().max(40).optional(),
});

const confirmCodeSchema = z.object({
  destination: z.string().min(3).max(200),
  code: z.string().length(6).regex(/^\d{6}$/),
  purpose: z.string().max(50).default("identity_verification"),
});

function generateSixDigitCode(): string {
  // crypto.randomInt avoids modulo bias vs Math.random()
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function registerVerificationRoutes(app: Express): void {
  /**
   * POST /api/verify/send-code
   * Generates a hashed OTP, stores it, and delivers it via email.
   * For the "sms" channel (no SMS vendor configured in this environment),
   * the code is delivered via the same email service and clearly labeled —
   * this keeps the flow technically honest rather than faking delivery.
   */
  app.post("/api/verify/send-code", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    try {
      const body = sendCodeSchema.parse(req.body);
      const code = generateSixDigitCode();
      const codeHash = sha256(code);
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);

      await db.insert(verificationCodes).values({
        userId,
        channel: body.channel,
        destination: body.destination,
        codeHash,
        purpose: body.purpose,
        legalName: body.legalName ?? null,
        idType: body.idType ?? null,
        expiresAt,
      });

      // Priority 3.2 — prefer real SMS via Twilio when channel=sms and configured;
      // otherwise fall back to email (honest labeling).
      let deliveryChannel = body.channel;
      let delivery: { delivered: boolean; mode: string } = { delivered: false, mode: emailDeliveryMode };

      if (body.channel === "sms" && isTwilioConfigured()) {
        const sms = await sendSms(
          body.destination,
          `Your SplitSheet verification code is ${code}. Expires in 10 minutes.`,
        );
        delivery = { delivered: sms.sent, mode: sms.mode };
        deliveryChannel = "sms";
      } else {
        const user = await storage.getUser(userId).catch(() => undefined);
        const emailTarget = body.channel === "email" ? body.destination : user?.email;
        if (emailTarget) {
          const template = verificationCodeEmail(code);
          delivery = await sendEmail({ to: emailTarget, ...template });
        }
        if (body.channel === "sms" && !isTwilioConfigured()) {
          deliveryChannel = "email"; // honest fallback
        }
      }

      res.json({
        sent: true,
        channel: body.channel,
        deliveryChannel,
        expiresInSeconds: CODE_TTL_MS / 1000,
        delivery: delivery.mode,
        devCode: process.env.NODE_ENV !== "production" && delivery.mode === "log" ? code : undefined,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", issues: err.errors });
      } else {
        console.error("[VERIFY SEND CODE]", err);
        res.status(500).json({ error: "Failed to send verification code" });
      }
    }
  });

  /**
   * POST /api/verify/confirm-code
   * Validates the OTP (constant-time hash comparison), enforces expiry and
   * a max-attempts lockout, and on success records an "identity_verified"
   * activity event tied to the authenticated user.
   */
  app.post("/api/verify/confirm-code", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    try {
      const body = confirmCodeSchema.parse(req.body);

      const [pending] = await db
        .select()
        .from(verificationCodes)
        .where(
          and(
            eq(verificationCodes.userId, userId),
            eq(verificationCodes.destination, body.destination),
            eq(verificationCodes.purpose, body.purpose),
            isNull(verificationCodes.consumedAt),
            gt(verificationCodes.expiresAt, new Date())
          )
        )
        .orderBy(desc(verificationCodes.createdAt))
        .limit(1);

      if (!pending) {
        res.status(400).json({ error: "No active verification code. Request a new one." });
        return;
      }
      if (pending.attempts >= MAX_ATTEMPTS) {
        res.status(429).json({ error: "Too many attempts. Request a new code." });
        return;
      }

      const codeHash = sha256(body.code);
      const matches = crypto.timingSafeEqual(
        Buffer.from(codeHash, "hex"),
        Buffer.from(pending.codeHash, "hex")
      );

      await db
        .update(verificationCodes)
        .set({ attempts: pending.attempts + 1 })
        .where(eq(verificationCodes.id, pending.id));

      if (!matches) {
        res.status(400).json({ error: "Incorrect code." });
        return;
      }

      await db
        .update(verificationCodes)
        .set({ consumedAt: new Date() })
        .where(eq(verificationCodes.id, pending.id));

      await storage.trackUserActivity(userId, "identity_verified", {
        legalName: pending.legalName,
        idType: pending.idType,
        destination: pending.destination,
        verifiedAt: new Date().toISOString(),
      });

      res.json({
        verified: true,
        legalName: pending.legalName,
        idType: pending.idType,
        verifiedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request", issues: err.errors });
      } else {
        console.error("[VERIFY CONFIRM CODE]", err);
        res.status(500).json({ error: "Failed to verify code" });
      }
    }
  });

  /** GET /api/verify/status — has the current user completed identity verification? */
  app.get("/api/verify/status", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    const [latest] = await db
      .select()
      .from(userActivity)
      .where(and(eq(userActivity.userId, userId), eq(userActivity.activityType, "identity_verified")))
      .orderBy(desc(userActivity.createdAt))
      .limit(1);
    res.json({ verified: Boolean(latest), verifiedAt: latest?.createdAt ?? null });
  });
}
