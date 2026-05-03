/**
 * server/stripe-connect.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe Connect Express — account creation, onboarding, status management.
 * Extends the existing Stripe setup in routes.ts without touching subscription code.
 *
 * Tables this touches (ADD these columns via migration):
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id VARCHAR(100);
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_onboarded BOOLEAN DEFAULT FALSE;
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN DEFAULT FALSE;
 *   ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled BOOLEAN DEFAULT FALSE;
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";
import { db } from "./db";
import { sql } from "drizzle-orm";
import type { Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
});

const APP_URL = process.env.APP_URL ?? "https://splitsheet.ca";

// ── Create or return existing Stripe Connect Express account ─────────────────
export async function createConnectAccount(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.claims?.sub;

  const rows = await db.execute(sql`
    SELECT id, email, first_name, last_name,
           stripe_connect_account_id,
           stripe_connect_onboarded
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = rows.rows[0] as any;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // If already connected, just return the account id
  if (user.stripe_connect_account_id && user.stripe_connect_onboarded) {
    res.json({
      accountId:  user.stripe_connect_account_id,
      onboarded:  true,
      message:    "Stripe Connect account already active",
    });
    return;
  }

  let accountId = user.stripe_connect_account_id as string | null;

  // Create Express account if not yet created
  if (!accountId) {
    const account = await stripe.accounts.create({
      type:    "express",
      email:   user.email,
      country: "CA",  // Canadian-first
      capabilities: {
        card_payments: { requested: true },
        transfers:     { requested: true },
      },
      business_profile: {
        mcc:         "5815", // Digital goods — music
        url:         APP_URL,
        product_description: "Music royalty splits via SplitSheet",
      },
      metadata: { splitsheet_user_id: userId },
    });
    accountId = account.id;

    await db.execute(sql`
      UPDATE users
      SET stripe_connect_account_id = ${accountId},
          stripe_connect_onboarded  = FALSE
      WHERE id = ${userId}
    `);
  }

  // Generate onboarding link (fresh link every time — they expire)
  const link = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: `${APP_URL}/billing?connect=refresh`,
    return_url:  `${APP_URL}/billing?connect=success`,
    type:        "account_onboarding",
  });

  res.json({
    accountId,
    onboarded:      false,
    onboardingUrl:  link.url,
    expiresAt:      new Date(link.expires_at * 1000).toISOString(),
  });
}

// ── Check Connect account status ──────────────────────────────────────────────
export async function getConnectStatus(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.claims?.sub;

  const rows = await db.execute(sql`
    SELECT stripe_connect_account_id, stripe_connect_onboarded,
           stripe_connect_charges_enabled, stripe_connect_payouts_enabled
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = rows.rows[0] as any;
  if (!user?.stripe_connect_account_id) {
    res.json({ connected: false, onboarded: false });
    return;
  }

  // Fetch live status from Stripe (catches async onboarding completion)
  const account = await stripe.accounts.retrieve(user.stripe_connect_account_id);
  const onboarded       = account.details_submitted;
  const chargesEnabled  = account.charges_enabled;
  const payoutsEnabled  = account.payouts_enabled;

  // Sync to DB
  await db.execute(sql`
    UPDATE users SET
      stripe_connect_onboarded        = ${onboarded},
      stripe_connect_charges_enabled  = ${chargesEnabled},
      stripe_connect_payouts_enabled  = ${payoutsEnabled}
    WHERE id = ${userId}
  `);

  res.json({
    connected:       true,
    accountId:       account.id,
    onboarded,
    chargesEnabled,
    payoutsEnabled,
    requirements:    account.requirements?.currently_due ?? [],
    disabledReason:  account.requirements?.disabled_reason ?? null,
  });
}

// ── Generate login link for connected account dashboard ──────────────────────
export async function getConnectDashboardLink(req: Request, res: Response): Promise<void> {
  const userId = (req as any).user?.claims?.sub;

  const rows = await db.execute(sql`
    SELECT stripe_connect_account_id, stripe_connect_onboarded
    FROM users WHERE id = ${userId} LIMIT 1
  `);
  const user = rows.rows[0] as any;

  if (!user?.stripe_connect_account_id || !user.stripe_connect_onboarded) {
    res.status(400).json({ error: "Complete Stripe onboarding first" });
    return;
  }

  const loginLink = await stripe.accounts.createLoginLink(user.stripe_connect_account_id);
  res.json({ url: loginLink.url });
}

export { stripe };