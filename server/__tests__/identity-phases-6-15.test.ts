import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { evaluateConfirmationToken } from "../confirmation-token-policy";
import { sessionHasMfa, mfaEnforcementEnabled } from "../mfa-policy";
import { AUTH_EVENTS } from "../auth-events";
import {
  STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS,
  webhookRequiresSignature,
} from "../stripe-subscription-webhook";
import { resourceBelongsToOrg } from "../authz-helpers";

describe("Phase 6 confirmation token policy", () => {
  it("rejects revoked tokens", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      revoked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(410);
  });

  it("rejects expired tokens", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(r.ok).toBe(false);
  });

  it("allows active unrevoked tokens", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(r.ok).toBe(true);
  });
});

describe("Phase 8 MFA policy", () => {
  const keys = ["REQUIRE_MFA_FOR_ORG_ADMINS"] as const;
  const snap: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of keys) snap[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of keys) {
      if (snap[k] === undefined) delete process.env[k];
      else process.env[k] = snap[k];
    }
  });

  it("detects MFA from amr claim", () => {
    expect(sessionHasMfa({ user: { amr: ["pwd", "mfa"] } } as any)).toBe(true);
    expect(sessionHasMfa({ user: { amr: ["pwd"] } } as any)).toBe(false);
  });

  it("enforcement flag defaults off", () => {
    delete process.env.REQUIRE_MFA_FOR_ORG_ADMINS;
    expect(mfaEnforcementEnabled()).toBe(false);
    process.env.REQUIRE_MFA_FOR_ORG_ADMINS = "true";
    expect(mfaEnforcementEnabled()).toBe(true);
  });
});

describe("Phase 11 AUTH events catalog", () => {
  it("exposes login/logout/confirm actions without secrets in names", () => {
    expect(AUTH_EVENTS.LOGIN_SUCCESS).toBe("AUTH_LOGIN_SUCCESS");
    expect(AUTH_EVENTS.CONFIRM_REVOKE).toBe("AUTH_CONFIRM_REVOKE");
    expect(Object.values(AUTH_EVENTS).every((v) => v.startsWith("AUTH_"))).toBe(true);
  });
});

describe("Phase 12–13 Stripe webhook contract", () => {
  it("lists required subscription events", () => {
    expect(STRIPE_SUBSCRIPTION_WEBHOOK_EVENTS).toContain("invoice.payment_failed");
  });

  it("requires signature in production-like env", () => {
    const prev = {
      VERCEL: process.env.VERCEL,
      NODE_ENV: process.env.NODE_ENV,
      LOCAL_DEV: process.env.LOCAL_DEV,
    };
    process.env.VERCEL = "1";
    process.env.NODE_ENV = "production";
    delete process.env.LOCAL_DEV;
    expect(webhookRequiresSignature()).toBe(true);
    process.env.VERCEL = prev.VERCEL;
    process.env.NODE_ENV = prev.NODE_ENV;
    if (prev.LOCAL_DEV === undefined) delete process.env.LOCAL_DEV;
    else process.env.LOCAL_DEV = prev.LOCAL_DEV;
  });
});

describe("Phase 14–15 cross-tenant fail-closed (unit)", () => {
  it("denies other-org stamped contracts even for creator", () => {
    expect(
      resourceBelongsToOrg(
        { organizationId: "org-a", createdBy: "u1" },
        "org-b",
        "u1",
      ),
    ).toBe(false);
  });
});
