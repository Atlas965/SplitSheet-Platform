import type Stripe from "stripe";

const APP_ORIGIN = "https://splitsheet.ca";

export function billingPortalConfigurationParams(): Stripe.BillingPortal.ConfigurationCreateParams {
  return {
    business_profile: {
      headline: "Manage your SplitSheet billing",
      privacy_policy_url: APP_ORIGIN,
      terms_of_service_url: APP_ORIGIN,
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
      },
    },
  };
}

/** Reuse an active portal config, or create one so Dashboard setup is not required. */
export async function ensureBillingPortalConfiguration(
  stripe: Stripe,
): Promise<string> {
  const existing = await stripe.billingPortal.configurations.list({
    limit: 10,
    active: true,
  });
  const ready = existing.data.find((c) => c.active);
  if (ready?.id) return ready.id;

  const created = await stripe.billingPortal.configurations.create(
    billingPortalConfigurationParams(),
  );
  return created.id;
}

export async function createBillingPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<Stripe.BillingPortal.Session> {
  const configuration = await ensureBillingPortalConfiguration(stripe);
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
    configuration,
  });
}
