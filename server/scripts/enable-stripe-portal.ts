import "../loadEnv";
import Stripe from "stripe";
import { ensureBillingPortalConfiguration } from "../stripe-billing-portal";

const key = process.env.STRIPE_SECRET_KEY || process.env.TESTING_STRIPE_SECRET_KEY;
if (!key?.startsWith("sk_")) {
  console.error("No Stripe secret key in environment.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
const mode = key.startsWith("sk_live_") ? "live" : "test";
const id = await ensureBillingPortalConfiguration(stripe);
console.log(`Stripe Customer Portal enabled (${mode}) configuration=${id}`);
