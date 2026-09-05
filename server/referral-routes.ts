import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { generateReferralCode } from "@shared/feature-policy";
import { ensureProductionFeatureSchema } from "./feature-schema";
import { logger } from "./logger";

const REFERRAL_TTL_MS = 90 * 24 * 60 * 60 * 1000;

async function ensureUserCode(userId: string): Promise<string> {
  await ensureProductionFeatureSchema();
  const user = await storage.getUser(userId);
  const existing = (user as any)?.referralCode;
  if (existing) return existing;
  const code = generateReferralCode(`${userId}-${user?.email ?? "studio"}`);
  await db.execute(sql`
    UPDATE users SET referral_code = ${code} WHERE id = ${userId} AND referral_code IS NULL
  `);
  const again = await storage.getUser(userId);
  return (again as any)?.referralCode || code;
}

export function registerReferralRoutes(app: Express): void {
  app.get("/api/referrals", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const code = await ensureUserCode(userId);
      await db.execute(sql`
        UPDATE referrals SET status = 'EXPIRED', updated_at = now()
        WHERE referrer_id = ${userId} AND status = 'PENDING' AND expires_at IS NOT NULL AND expires_at < now()
      `);
      const rows = await db.execute(sql`
        SELECT status, COUNT(*)::int AS count
        FROM referrals
        WHERE referrer_id = ${userId}
        GROUP BY status
      `);
      const counts: Record<string, number> = {};
      for (const row of rows.rows as any[]) counts[row.status] = Number(row.count);
      const base = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      res.json({
        code,
        link: `${base.replace(/\/$/, "")}/login?ref=${encodeURIComponent(code)}`,
        stats: {
          pending: counts.PENDING ?? 0,
          signedUp: counts.SIGNED_UP ?? 0,
          converted: counts.CONVERTED ?? 0,
          expired: counts.EXPIRED ?? 0,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load referrals" });
    }
  });

  app.post("/api/referrals/claim", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const code = String(req.body?.code ?? "").trim().toUpperCase();
      if (!code) {
        res.status(400).json({ message: "Referral code is required." });
        return;
      }
      await ensureProductionFeatureSchema();
      const mine = await ensureUserCode(userId);
      if (mine === code) {
        res.status(400).json({ message: "You cannot use your own referral code." });
        return;
      }
      const referrer = await db.execute(sql`
        SELECT id FROM users WHERE referral_code = ${code} LIMIT 1
      `);
      if (!referrer.rows.length) {
        res.status(404).json({ message: "Referral code not found." });
        return;
      }
      const referrerId = String((referrer.rows[0] as any).id);
      const already = await db.execute(sql`
        SELECT id FROM referrals WHERE referred_user_id = ${userId} LIMIT 1
      `);
      if (already.rows.length) {
        res.json({ claimed: false, reason: "already_attributed" });
        return;
      }
      const expires = new Date(Date.now() + REFERRAL_TTL_MS);
      await db.execute(sql`
        INSERT INTO referrals (referrer_id, referral_code, referred_user_id, status, expires_at)
        VALUES (${referrerId}, ${code}, ${userId}, 'SIGNED_UP', ${expires})
      `);
      logger.info("referral.signup", { referrerId, referredUserId: userId });
      res.status(201).json({ claimed: true, status: "SIGNED_UP" });
    } catch (error) {
      res.status(500).json({ message: "Failed to claim referral" });
    }
  });
}

export async function markReferralConverted(userId: string): Promise<void> {
  try {
    await ensureProductionFeatureSchema();
    await db.execute(sql`
      UPDATE referrals
      SET status = 'CONVERTED', converted_at = now(), updated_at = now()
      WHERE referred_user_id = ${userId} AND status = 'SIGNED_UP'
    `);
    logger.info("referral.conversion", { referredUserId: userId });
  } catch {
    /* conversion tracking is best-effort */
  }
}
