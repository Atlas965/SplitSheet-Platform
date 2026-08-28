import { describe, it, expect } from "vitest";
import { evaluateConfirmationToken } from "../confirmation-token-policy";
import {
  accessMethodFromRequest,
  generateConfirmationToken,
  opaqueConfirmPath,
  opaqueConfirmUrl,
} from "../confirmation-url";
import { AUTH_EVENTS } from "../auth-events";

describe("QR Rights Capture URLs", () => {
  it("encodes only an opaque token path (no database ids)", () => {
    const token = generateConfirmationToken();
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    expect(opaqueConfirmPath(token)).toBe(`/confirm/${token}`);
    expect(opaqueConfirmPath(token, true)).toBe(`/confirm/${token}?via=qr`);
    expect(opaqueConfirmUrl("https://splitsheet.ca", token, true)).toBe(
      `https://splitsheet.ca/confirm/${token}?via=qr`,
    );
    expect(opaqueConfirmUrl("https://splitsheet.ca/", token)).not.toMatch(/\/confirm\/.+\/.+/);
  });

  it("maps via=qr to access method qr", () => {
    expect(accessMethodFromRequest("qr")).toBe("qr");
    expect(accessMethodFromRequest(undefined, "qr")).toBe("qr");
    expect(accessMethodFromRequest("link")).toBe("link");
  });
});

describe("confirmation token gate (QR shares existing policy)", () => {
  it("rejects revoked tokens with code revoked", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      revoked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(410);
      expect(r.code).toBe("revoked");
    }
  });

  it("rejects expired tokens with code expired", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("expired");
  });

  it("allows replay of already-confirmed submit (idempotent)", () => {
    const r = evaluateConfirmationToken(
      {
        status: "confirmed",
        consumed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
      { forSubmit: true },
    );
    expect(r.ok).toBe(true);
  });
});

describe("QR audit event names", () => {
  it("uses AUTH_ prefix and does not include secrets", () => {
    expect(AUTH_EVENTS.QR_GENERATED).toBe("AUTH_QR_GENERATED");
    expect(AUTH_EVENTS.QR_ACCESSED).toBe("AUTH_QR_ACCESSED");
    expect(AUTH_EVENTS.QR_REVOKED).toBe("AUTH_QR_REVOKED");
    expect(AUTH_EVENTS.QR_REGENERATED).toBe("AUTH_QR_REGENERATED");
    expect(Object.values(AUTH_EVENTS).every((v) => v.startsWith("AUTH_"))).toBe(true);
  });
});
