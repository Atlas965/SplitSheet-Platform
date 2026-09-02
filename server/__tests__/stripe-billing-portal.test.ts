import { describe, it, expect, vi } from "vitest";
import {
  billingPortalConfigurationParams,
  createBillingPortalSession,
  ensureBillingPortalConfiguration,
} from "../stripe-billing-portal";

describe("stripe billing portal", () => {
  it("enables invoices, payment methods, and period-end cancel", () => {
    const params = billingPortalConfigurationParams();
    expect(params.features?.invoice_history?.enabled).toBe(true);
    expect(params.features?.payment_method_update?.enabled).toBe(true);
    expect(params.features?.subscription_cancel?.enabled).toBe(true);
    expect(params.features?.subscription_cancel?.mode).toBe("at_period_end");
    expect(params.business_profile?.privacy_policy_url).toMatch(/^https:\/\//);
  });

  it("reuses an active configuration instead of creating another", async () => {
    const stripe = {
      billingPortal: {
        configurations: {
          list: vi.fn().mockResolvedValue({ data: [{ id: "bpc_existing", active: true }] }),
          create: vi.fn(),
        },
      },
    } as any;
    await expect(ensureBillingPortalConfiguration(stripe)).resolves.toBe("bpc_existing");
    expect(stripe.billingPortal.configurations.create).not.toHaveBeenCalled();
  });

  it("creates a configuration when none is active", async () => {
    const stripe = {
      billingPortal: {
        configurations: {
          list: vi.fn().mockResolvedValue({ data: [] }),
          create: vi.fn().mockResolvedValue({ id: "bpc_new" }),
        },
      },
    } as any;
    await expect(ensureBillingPortalConfiguration(stripe)).resolves.toBe("bpc_new");
    expect(stripe.billingPortal.configurations.create).toHaveBeenCalledOnce();
  });

  it("opens a portal session with the resolved configuration", async () => {
    const stripe = {
      billingPortal: {
        configurations: {
          list: vi.fn().mockResolvedValue({ data: [{ id: "bpc_1", active: true }] }),
        },
        sessions: {
          create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/test" }),
        },
      },
    } as any;
    const session = await createBillingPortalSession(
      stripe,
      "cus_123",
      "https://splitsheet.ca/billing",
    );
    expect(session.url).toContain("billing.stripe.com");
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://splitsheet.ca/billing",
      configuration: "bpc_1",
    });
  });
});
