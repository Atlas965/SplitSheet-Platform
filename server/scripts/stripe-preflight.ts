/**
 * server/scripts/stripe-preflight.ts — Priority 3.3 live-mode readiness checks.
 */
import Stripe from "stripe";

export interface StripePreflightResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function runStripePreflight(): Promise<StripePreflightResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    errors.push("STRIPE_SECRET_KEY is not set");
    return { ok: false, errors, warnings };
  }

  if (!process.env.PLATFORM_FEE_BPS) {
    errors.push("PLATFORM_FEE_BPS is not set");
  }

  const proPrice = process.env.STRIPE_PRO_PRICE_ID;
  const labelPrice = process.env.STRIPE_LABEL_PRICE_ID;
  if (!proPrice) errors.push("STRIPE_PRO_PRICE_ID is not set");
  if (!labelPrice) errors.push("STRIPE_LABEL_PRICE_ID is not set");

  if (!process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    warnings.push("Neither STRIPE_WEBHOOK_SECRET nor STRIPE_CONNECT_WEBHOOK_SECRET is set");
  }

  try {
    const stripe = new Stripe(secret, { apiVersion: "2025-08-27.basil" as any });

    if (proPrice) {
      try {
        await stripe.prices.retrieve(proPrice);
      } catch {
        errors.push(`STRIPE_PRO_PRICE_ID not found in this Stripe account: ${proPrice}`);
      }
    }
    if (labelPrice) {
      try {
        await stripe.prices.retrieve(labelPrice);
      } catch {
        errors.push(`STRIPE_LABEL_PRICE_ID not found in this Stripe account: ${labelPrice}`);
      }
    }

    try {
      // Connect capability probe — list connected accounts (empty ok)
      await stripe.accounts.list({ limit: 1 });
    } catch (err: any) {
      errors.push(`Stripe Connect may not be enabled: ${err?.message ?? err}`);
    }

    try {
      const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });
      if (endpoints.data.length === 0) {
        warnings.push("No Stripe webhook endpoints registered on this account");
      }
    } catch {
      warnings.push("Could not list webhook endpoints (permissions?)");
    }
  } catch (err: any) {
    errors.push(`Stripe API unreachable: ${err?.message ?? err}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** CLI entry: npx tsx server/scripts/stripe-preflight.ts */
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("stripe-preflight.ts")) {
  runStripePreflight().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  });
}
