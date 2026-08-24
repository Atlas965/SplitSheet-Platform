import { describe, expect, it } from "vitest";
import { STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS } from "../stripe-subscription-webhook";

describe("Stripe subscription webhook contract", () => {
  it("exposes the production endpoint path as documentation constant via events list", () => {
    expect(STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS).toContain("checkout.session.completed");
    expect(STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS).toContain("customer.subscription.updated");
    expect(STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS).toContain("customer.subscription.deleted");
    expect(STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS).toContain("invoice.payment_failed");
    expect(STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS).toContain("invoice.paid");
  });
});
