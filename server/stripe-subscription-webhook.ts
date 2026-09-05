/**
 * SplitSheet subscription webhook — Stripe → signature → idempotency → DB entitlements.
 * Route: POST /api/stripe/webhook
 *
 * Connect payouts use a separate endpoint: POST /api/stripe/connect-webhook
 */
import type { Request, Response } from "express";
import type Stripe from "stripe";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { isVercelRuntime } from "./runtime";

const SUBSCRIPTION_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
]);

function isProductionLike(): boolean {
  return (
    isVercelRuntime() ||
    process.env.NODE_ENV === "production" ||
    process.env.LOCAL_DEV === "false"
  );
}

/** Exported for unit tests — production must refuse unsigned webhooks. */
export function webhookRequiresSignature(): boolean {
  return isProductionLike();
}

export const STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
] as const;

async function alreadyProcessed(eventId: string): Promise<boolean> {
  try {
    const rows = await db.execute(sql`
      SELECT 1 FROM payment_events
      WHERE stripe_event_id = ${eventId}
      LIMIT 1
    `);
    return (rows.rows?.length ?? 0) > 0;
  } catch (err) {
    console.error("[stripe/webhook] idempotency lookup failed:", err);
    return false;
  }
}

async function recordEvent(event: Stripe.Event, processed: boolean): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO payment_events
        (stripe_event_id, event_type, payload, processed)
      VALUES
        (${event.id}, ${event.type}, ${JSON.stringify(event.data.object)}::jsonb, ${processed})
      ON CONFLICT (stripe_event_id) DO NOTHING
    `);
  } catch (err) {
    console.error("[stripe/webhook] failed to record payment_events row:", err);
  }
}

async function markProcessed(eventId: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE payment_events
      SET processed = TRUE
      WHERE stripe_event_id = ${eventId}
    `);
  } catch (err) {
    console.error("[stripe/webhook] failed to mark processed:", err);
  }
}

async function syncSubscriptionToUser(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) {
    console.warn("[stripe/webhook] subscription missing customer", subscription.id);
    return;
  }

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[stripe/webhook] no user for Stripe customer ${customerId}`);
    return;
  }

  const tier = (subscription.metadata?.tier as string) || "pro";
  const active = ["active", "trialing"].includes(subscription.status);

  await storage.updateUser(user.id, {
    subscriptionStatus: subscription.status,
    subscriptionTier: active ? tier : "free",
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
  });
  if (active) {
    const { markReferralConverted } = await import("./referral-routes");
    await markReferralConverted(user.id);
  }

  console.log(
    `[stripe/webhook] user=${user.id} sub=${subscription.id} status=${subscription.status} tier=${active ? tier : "free"}`,
  );
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const userId = session.metadata?.userId || session.client_reference_id;

  if (userId && customerId) {
    await storage.updateUserStripeInfo(userId, customerId, subscriptionId || "");
    console.log(
      `[stripe/webhook] checkout linked user=${userId} customer=${customerId} sub=${subscriptionId || "n/a"}`,
    );
  } else if (customerId && subscriptionId) {
    const user = await storage.getUserByStripeCustomerId(customerId);
    if (user) {
      await storage.updateUser(user.id, {
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: "active",
      });
    } else {
      console.warn(
        `[stripe/webhook] checkout.session.completed unmatched customer=${customerId}`,
      );
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[stripe/webhook] payment_failed unmatched customer=${customerId}`);
    return;
  }

  await storage.updateUser(user.id, {
    subscriptionStatus: "past_due",
  });
  console.log(
    `[stripe/webhook] payment_failed user=${user.id} invoice=${invoice.id} → past_due`,
  );
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const user = await storage.getUserByStripeCustomerId(customerId);
  if (!user) return;

  const tier =
    user.subscriptionTier && user.subscriptionTier !== "free"
      ? user.subscriptionTier
      : "pro";

  await storage.updateUser(user.id, {
    subscriptionStatus: "active",
    subscriptionTier: tier,
  });
  console.log(`[stripe/webhook] invoice paid user=${user.id} invoice=${invoice.id}`);
}

export async function handleSubscriptionWebhook(
  stripe: Stripe,
  req: Request,
  res: Response,
): Promise<void> {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";

  if (!webhookSecret && isProductionLike()) {
    console.error(
      "[stripe/webhook] STRIPE_WEBHOOK_SECRET is required in production. Refusing unsigned events.",
    );
    res.status(503).json({
      error: "Webhook not configured",
      message: "Set STRIPE_WEBHOOK_SECRET in the production environment.",
    });
    return;
  }

  let event: Stripe.Event;
  try {
    if (webhookSecret) {
      if (!sig) {
        res.status(400).json({ error: "Missing Stripe-Signature header" });
        return;
      }
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      const raw = Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body);
      event = JSON.parse(raw) as Stripe.Event;
      console.warn(
        "[stripe/webhook] signature verification skipped (dev only — set STRIPE_WEBHOOK_SECRET)",
      );
    }
  } catch (err: any) {
    console.error("[stripe/webhook] signature verification failed:", err?.message || err);
    res.status(400).send(`Webhook Error: ${err?.message || "invalid signature"}`);
    return;
  }

  console.log(
    `[stripe/webhook] received id=${event.id} type=${event.type} livemode=${event.livemode}`,
  );

  if (await alreadyProcessed(event.id)) {
    console.log(`[stripe/webhook] duplicate ignored id=${event.id}`);
    res.json({ received: true, duplicate: true });
    return;
  }

  await recordEvent(event, false);

  try {
    if (!SUBSCRIPTION_EVENTS.has(event.type)) {
      console.log(`[stripe/webhook] ignored unhandled type=${event.type}`);
      await markProcessed(event.id);
      res.json({ received: true, ignored: true });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscriptionToUser(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted": {
        const deleted = event.data.object as Stripe.Subscription;
        const customerId =
          typeof deleted.customer === "string" ? deleted.customer : deleted.customer?.id;
        if (customerId) {
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            await storage.updateUser(user.id, {
              subscriptionStatus: "cancelled",
              subscriptionTier: "free",
              stripeSubscriptionId: null,
            });
            console.log(`[stripe/webhook] cancelled user=${user.id} sub=${deleted.id}`);
          }
        }
        break;
      }

      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        break;
    }

    await markProcessed(event.id);
    res.json({ received: true });
  } catch (error: any) {
    console.error("[stripe/webhook] processing failed:", {
      eventId: event.id,
      type: event.type,
      message: error?.message,
    });
    // 500 so Stripe retries; idempotency prevents double apply once it succeeds
    res.status(500).json({ error: "Webhook processing failed" });
  }
}
