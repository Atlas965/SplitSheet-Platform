/**
 * server/payment-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Add to server/routes.ts at the bottom of registerRoutes():
 *
 *   import { registerPaymentRoutes } from "./payment-routes";
 *   registerPaymentRoutes(app);
 *
 * Endpoints registered here:
 *   POST /api/connect-account
 *   GET  /api/connect-status
 *   GET  /api/connect-dashboard
 *   POST /api/payments/intent
 *   POST /api/payments/execute-splits
 *   GET  /api/payments/transactions
 *   GET  /api/payments/balance
 *   POST /api/payments/refund
 *   POST /api/stripe/connect-webhook  (separate from subscription webhook)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { Express, Request, Response } from "express";
import express from "express";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import {
  createConnectAccount,
  getConnectStatus,
  getConnectDashboardLink,
} from "./stripe-connect";
import {
  toCents,
  fromCents,
  enforceAgreement,
  resolvePayees,
  createSplitPaymentIntent,
  executeSplits,
} from "./payment-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
});

// ── Input validators ──────────────────────────────────────────────────────────

const createPaymentSchema = z.object({
  contractId:  z.string().uuid(),
  assetId:     z.string().uuid(),
  source:      z.enum(["streaming", "sync", "performance", "mechanical", "other"]),
  grossAmount: z.number().positive().max(10_000_000),
  currency:    z.string().length(3).default("CAD"),
  description: z.string().min(3).max(500),
});

const executeSplitsSchema = z.object({
  revenueEventId:  z.string().uuid(),
  contractId:      z.string().uuid(),
  paymentIntentId: z.string().min(1),
  grossAmount:     z.number().positive(),
  currency:        z.string().length(3).default("CAD"),
});

const refundSchema = z.object({
  revenueEventId: z.string().uuid(),
  reason:         z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
});

// ── Helper: get request user id ───────────────────────────────────────────────
function uid(req: Request): string {
  return (req as any).user?.claims?.sub ?? "";
}

// ── Register all payment routes ───────────────────────────────────────────────
export function registerPaymentRoutes(app: Express): void {

  // ── STRIPE CONNECT ──────────────────────────────────────────────────────────

  /**
   * POST /api/connect-account
   * Creates Stripe Express account + returns onboarding URL.
   * Safe to call multiple times — idempotent.
   */
  app.post("/api/connect-account", isAuthenticated, async (req, res) => {
    try {
      await createConnectAccount(req, res);
    } catch (err: any) {
      console.error("[CONNECT ACCOUNT]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/connect-status
   * Returns live Stripe account status: onboarded, chargesEnabled, payoutsEnabled.
   */
  app.get("/api/connect-status", isAuthenticated, async (req, res) => {
    try {
      await getConnectStatus(req, res);
    } catch (err: any) {
      console.error("[CONNECT STATUS]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/connect-dashboard
   * Returns a time-limited Stripe Express dashboard login URL.
   */
  app.get("/api/connect-dashboard", isAuthenticated, async (req, res) => {
    try {
      await getConnectDashboardLink(req, res);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── PAYMENT FLOW ────────────────────────────────────────────────────────────

  /**
   * POST /api/payments/intent
   * Step 1: Creates a Stripe PaymentIntent for a revenue event.
   * Client uses the returned clientSecret to complete payment (Stripe Elements).
   *
   * Body: { contractId, assetId, source, grossAmount, currency, description }
   * Returns: { paymentIntentId, clientSecret, netCents, feeCents, revenueEventId }
   */
  app.post("/api/payments/intent", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    try {
      const body = createPaymentSchema.parse(req.body);

      // Pre-flight: check agreement before charging
      const enforcement = await enforceAgreement(body.contractId);
      if (!enforcement.allowed) {
        return res.status(403).json({ error: enforcement.reason });
      }

      // Pre-flight: check all payees have connected Stripe accounts
      await resolvePayees(body.contractId);

      const result = await createSplitPaymentIntent({
        contractId:  body.contractId,
        assetId:     body.assetId,
        source:      body.source,
        grossCents:  toCents(body.grossAmount),
        currency:    body.currency,
        description: body.description,
        requesterId: userId,
      });

      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", issues: err.errors });
      }
      console.error("[PAYMENT INTENT]", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  /**
   * POST /api/payments/execute-splits
   * Step 2: Called after PaymentIntent succeeds (client confirms payment).
   * Executes all Stripe transfers to collaborators.
   *
   * Body: { revenueEventId, contractId, paymentIntentId, grossAmount, currency }
   * Returns: { success, totalPaid, failedPayees, payouts }
   *
   * NOTE: In production this is also triggered by the webhook
   * payment_intent.succeeded event for reliability. Calling both
   * is safe — idempotency keys prevent double-transfers.
   */
  app.post("/api/payments/execute-splits", isAuthenticated, async (req, res) => {
    try {
      const body = executeSplitsSchema.parse(req.body);

      // Verify the PaymentIntent actually succeeded before executing splits
      const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
      if (intent.status !== "succeeded") {
        return res.status(400).json({
          error: `PaymentIntent status is '${intent.status}'. Must be 'succeeded'.`,
        });
      }

      // Verify this intent belongs to this revenue event (prevents spoofing)
      if (intent.metadata?.revenueEventId !== body.revenueEventId) {
        return res.status(403).json({ error: "PaymentIntent does not match revenue event" });
      }

      const result = await executeSplits({
        revenueEventId:  body.revenueEventId,
        contractId:      body.contractId,
        paymentIntentId: body.paymentIntentId,
        grossCents:      toCents(body.grossAmount),
        currency:        body.currency,
      });

      res.json(result);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", issues: err.errors });
      }
      console.error("[EXECUTE SPLITS]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/payments/transactions
   * Returns full revenue event + payout history for the authenticated user.
   * Includes both earnings (as collaborator) and initiated payments (as creator).
   */
  app.get("/api/payments/transactions", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    const limit  = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    const rows = await db.execute(sql`
      SELECT
        pr.id                  AS payout_id,
        pr.amount,
        pr.currency,
        pr.status,
        pr.ownership_percentage,
        pr.stripe_transfer_id,
        pr.processed_at,
        pr.created_at,
        re.source              AS revenue_source,
        re.description,
        re.period_start,
        re.period_end,
        sa.title               AS song_title,
        sa.artist_name
      FROM payout_records pr
      JOIN revenue_events re ON re.id = pr.revenue_event_id
      JOIN song_assets sa     ON sa.id = pr.asset_id
      WHERE pr.user_id = ${userId}
      ORDER BY pr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Also get transactions initiated by this user
    const initiated = await db.execute(sql`
      SELECT
        re.id,
        re.source,
        re.amount,
        re.currency,
        re.description,
        re.created_at,
        sa.title AS song_title,
        COUNT(pr.id) AS payout_count,
        SUM(CASE WHEN pr.status = 'completed' THEN pr.amount ELSE 0 END) AS total_distributed
      FROM revenue_events re
      JOIN song_assets sa    ON sa.id = re.asset_id
      LEFT JOIN payout_records pr ON pr.revenue_event_id = re.id
      WHERE re.metadata->>'requesterId' = ${userId}
      GROUP BY re.id, sa.title
      ORDER BY re.created_at DESC
      LIMIT ${limit}
    `);

    res.json({
      received:  rows.rows,
      initiated: initiated.rows,
    });
  });

  /**
   * GET /api/payments/balance
   * Returns user's current balance, total earned, total paid, pending.
   */
  app.get("/api/payments/balance", isAuthenticated, async (req, res) => {
    const userId = uid(req);

    const rows = await db.execute(sql`
      SELECT
        ub.total_earned,
        ub.total_paid,
        ub.pending_balance,
        ub.currency,
        ub.updated_at,
        -- Live pending count from payout_records
        COUNT(pr.id) FILTER (WHERE pr.status = 'pending') AS pending_transfers,
        SUM(pr.amount) FILTER (WHERE pr.status = 'pending') AS pending_amount
      FROM user_balances ub
      LEFT JOIN payout_records pr ON pr.user_id = ub.user_id
      WHERE ub.user_id = ${userId}
      GROUP BY ub.user_id, ub.total_earned, ub.total_paid,
               ub.pending_balance, ub.currency, ub.updated_at
    `);

    if (!rows.rows.length) {
      // User has no transactions yet
      return res.json({
        totalEarned:      "0.00",
        totalPaid:        "0.00",
        pendingBalance:   "0.00",
        pendingTransfers: 0,
        currency:         "CAD",
      });
    }

    const bal = rows.rows[0] as any;
    res.json({
      totalEarned:      bal.total_earned,
      totalPaid:        bal.total_paid,
      pendingBalance:   bal.pending_balance,
      pendingTransfers: Number(bal.pending_transfers ?? 0),
      pendingAmount:    bal.pending_amount ?? "0.00",
      currency:         bal.currency,
      updatedAt:        bal.updated_at,
    });
  });

  /**
   * POST /api/payments/refund
   * Initiates a full refund for a revenue event.
   * Reverses all Stripe transfers before refunding the original charge.
   *
   * Body: { revenueEventId, reason }
   */
  app.post("/api/payments/refund", isAuthenticated, async (req, res) => {
    const userId = uid(req);
    try {
      const { revenueEventId, reason } = refundSchema.parse(req.body);

      // Fetch the revenue event + its Stripe PaymentIntent id
      const reRows = await db.execute(sql`
        SELECT re.*, re.metadata->>'stripePaymentIntentId' AS payment_intent_id
        FROM revenue_events re
        WHERE re.id = ${revenueEventId}
          AND re.metadata->>'requesterId' = ${userId}
        LIMIT 1
      `);
      const event = reRows.rows[0] as any;
      if (!event) {
        return res.status(404).json({ error: "Revenue event not found or not owned by you" });
      }
      if (!event.payment_intent_id) {
        return res.status(400).json({ error: "No Stripe PaymentIntent found for this event" });
      }

      // Step 1: Reverse all completed transfers FIRST
      const payoutRows = await db.execute(sql`
        SELECT stripe_transfer_id, user_id, amount
        FROM payout_records
        WHERE revenue_event_id = ${revenueEventId}
          AND status = 'completed'
          AND stripe_transfer_id IS NOT NULL
      `);

      const reversals: string[] = [];
      for (const payout of payoutRows.rows as any[]) {
        try {
          const reversal = await stripe.transfers.createReversal(
            payout.stripe_transfer_id,
            {
              metadata: { revenueEventId, reason: reason ?? "requested_by_customer" },
            }
          );
          reversals.push(reversal.id);

          // Update payout record
          await db.execute(sql`
            UPDATE payout_records SET status = 'refunded'
            WHERE stripe_transfer_id = ${payout.stripe_transfer_id}
          `);

          // Deduct from user balance
          await db.execute(sql`
            UPDATE user_balances SET
              total_earned = total_earned - ${payout.amount}::decimal,
              total_paid   = total_paid   - ${payout.amount}::decimal,
              updated_at   = NOW()
            WHERE user_id = ${payout.user_id}
          `);
        } catch (err: any) {
          console.error("[REVERSAL FAILED]", payout.stripe_transfer_id, err.message);
        }
      }

      // Step 2: Refund the original PaymentIntent
      const intent  = await stripe.paymentIntents.retrieve(event.payment_intent_id);
      const chargeId = typeof intent.latest_charge === "string"
        ? intent.latest_charge
        : (intent.latest_charge as any)?.id;

      let refundId: string | null = null;
      if (chargeId) {
        const refund = await stripe.refunds.create({
          charge: chargeId,
          reason: reason ?? "requested_by_customer",
          metadata: { revenueEventId, requestedBy: userId },
        });
        refundId = refund.id;
      }

      res.json({
        refunded:   true,
        refundId,
        reversals,
        message:    `Refunded ${reversals.length} transfers + original charge`,
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: "Validation failed", issues: err.errors });
      }
      console.error("[REFUND ERROR]", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── STRIPE CONNECT WEBHOOK ──────────────────────────────────────────────────

  /**
   * POST /api/stripe/connect-webhook
   * Handles Connect-specific events (separate endpoint from subscription webhook).
   * Register in Stripe Dashboard → Webhooks → Listen to Connect events.
   *
   * Handles:
   *  - payment_intent.succeeded     → auto-execute splits
   *  - transfer.created             → log
   *  - transfer.failed              → mark payout failed
   *  - payout.paid                  → mark payout completed
   *  - payout.failed                → mark payout failed
   *  - account.updated              → sync Connect account status
   */
  app.post(
    "/api/stripe/connect-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig     = req.headers["stripe-signature"] as string;
      const secret  = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;

      let event: Stripe.Event;
      try {
        if (secret) {
          event = stripe.webhooks.constructEvent(req.body, sig, secret);
        } else {
          // Dev fallback — NEVER in production
          event = JSON.parse(req.body.toString());
          console.warn("[WEBHOOK] Signature verification skipped — dev mode");
        }
      } catch (err: any) {
        console.error("[WEBHOOK] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Idempotency: check if this event was already processed
      const idempotencyRows = await db.execute(sql`
        SELECT 1 FROM payment_events
        WHERE stripe_event_id = ${event.id} LIMIT 1
      `).catch(() => ({ rows: [] }));

      const alreadyProcessed = (idempotencyRows.rows?.length ?? 0) > 0;

      // Record the event (even if we skip processing)
      await db.execute(sql`
        INSERT INTO payment_events
          (stripe_event_id, event_type, payload, processed)
        VALUES
          (${event.id}, ${event.type}, ${JSON.stringify(event.data.object)}::jsonb,
           ${alreadyProcessed})
        ON CONFLICT (stripe_event_id) DO NOTHING
      `).catch(() => {});

      if (alreadyProcessed) {
        console.log(`[WEBHOOK] Skipping duplicate event ${event.id}`);
        return res.json({ received: true, duplicate: true });
      }

      try {
        switch (event.type) {

          // ── Payment succeeded → auto-trigger splits ──────────────────────
          case "payment_intent.succeeded": {
            const intent = event.data.object as Stripe.PaymentIntent;
            const { revenueEventId, contractId } = intent.metadata ?? {};

            if (revenueEventId && contractId) {
              console.log(`[WEBHOOK] Auto-executing splits for ${revenueEventId}`);
              await executeSplits({
                revenueEventId,
                contractId,
                paymentIntentId: intent.id,
                grossCents:      intent.amount,
                currency:        intent.currency.toUpperCase(),
              });
            }
            break;
          }

          // ── Transfer created → log ───────────────────────────────────────
          case "transfer.created": {
            const transfer = event.data.object as Stripe.Transfer;
            console.log(`[WEBHOOK] Transfer created: ${transfer.id} → ${transfer.destination}`);
            await db.execute(sql`
              UPDATE payout_records SET status = 'processing'
              WHERE stripe_transfer_id = ${transfer.id}
            `).catch(() => {});
            break;
          }

          // ── Transfer failed → mark failed ────────────────────────────────
          case "transfer.failed": {
            const transfer = event.data.object as any;
            console.error(`[WEBHOOK] Transfer failed: ${transfer.id}`);
            await db.execute(sql`
              UPDATE payout_records SET status = 'failed'
              WHERE stripe_transfer_id = ${transfer.id}
            `).catch(() => {});
            break;
          }

          // ── Payout paid to bank → mark completed ─────────────────────────
          case "payout.paid": {
            const payout = event.data.object as Stripe.Payout;
            console.log(`[WEBHOOK] Payout paid: ${payout.id}`);
            await db.execute(sql`
              UPDATE payout_records SET status = 'completed', processed_at = NOW()
              WHERE stripe_transfer_id = ${payout.id}
                 OR stripe_transfer_id IN (
                   SELECT stripe_transfer_id FROM payout_records
                   WHERE status = 'processing'
                     AND stripe_transfer_id IS NOT NULL
                 )
            `).catch(() => {});
            break;
          }

          // ── Payout failed → alert ────────────────────────────────────────
          case "payout.failed": {
            const payout = event.data.object as Stripe.Payout;
            console.error(`[WEBHOOK] Payout failed: ${payout.id} — ${(payout as any).failure_message}`);
            await db.execute(sql`
              UPDATE payout_records SET status = 'failed'
              WHERE stripe_transfer_id = ${payout.id}
            `).catch(() => {});
            break;
          }

          // ── Account updated → sync onboarding status ─────────────────────
          case "account.updated": {
            const account = event.data.object as Stripe.Account;
            await db.execute(sql`
              UPDATE users SET
                stripe_connect_onboarded        = ${account.details_submitted},
                stripe_connect_charges_enabled  = ${account.charges_enabled},
                stripe_connect_payouts_enabled  = ${account.payouts_enabled}
              WHERE stripe_connect_account_id = ${account.id}
            `).catch(() => {});
            console.log(`[WEBHOOK] Account updated: ${account.id} — charges: ${account.charges_enabled}`);
            break;
          }

          default:
            console.log(`[WEBHOOK] Unhandled event: ${event.type}`);
        }

        // Mark event as processed
        await db.execute(sql`
          UPDATE payment_events SET processed = TRUE
          WHERE stripe_event_id = ${event.id}
        `).catch(() => {});

        res.json({ received: true });
      } catch (err: any) {
        console.error("[WEBHOOK] Processing error:", err.message);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );
}