import { describe, it, expect } from "vitest";
import { validateSplits, toHundredths, SPLIT_TOTAL_HUNDREDTHS } from "@shared/split-validation";
import {
  assertTransition,
  canTransition,
  deriveRightsState,
  workflowSteps,
  type WorkflowSnapshot,
} from "@shared/rights-state";
import { evaluateConfirmationToken } from "../confirmation-token-policy";
import { resourceBelongsToOrg } from "../authz-helpers";
import {
  authorizeOperatorAccess,
  evaluateEvent,
  rightsLedgerAlreadySynced,
} from "../rights-state-engine";
import {
  accessMethodFromRequest,
  generateConfirmationToken,
  opaqueConfirmPath,
  opaqueConfirmUrl,
} from "../confirmation-url";
import { LEGAL_DISCLAIMER } from "@shared/agreement-catalog";

const validValidation = { valid: true, errors: [], warnings: [] };

function snap(partial: Partial<WorkflowSnapshot>): WorkflowSnapshot {
  return {
    contractStatus: "draft",
    createdBy: "op-1",
    organizationId: "org-a",
    hasCollaborators: true,
    splitsValid: true,
    validation: validValidation,
    confirmations: [],
    rightsLedgerSynced: false,
    now: new Date("2026-08-28T12:00:00Z"),
    ...partial,
  };
}

describe("RSEE split validation", () => {
  it("passes when percentages total 100%", () => {
    const r = validateSplits([
      { name: "A", role: "writer", ownershipPercentage: 50 },
      { name: "B", role: "producer", ownershipPercentage: 25 },
      { name: "C", role: "artist", ownershipPercentage: 25 },
    ]);
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("treats 33.33 + 33.33 + 33.34 as 100% using integer hundredths", () => {
    expect(toHundredths(33.33)! + toHundredths(33.33)! + toHundredths(33.34)!).toBe(SPLIT_TOTAL_HUNDREDTHS);
    const r = validateSplits([
      { name: "A", role: "writer", ownershipPercentage: "33.33" },
      { name: "B", role: "writer", ownershipPercentage: "33.33" },
      { name: "C", role: "writer", ownershipPercentage: "33.34" },
    ]);
    expect(r.valid).toBe(true);
  });

  it("fails when percentages total 99%", () => {
    const r = validateSplits([
      { name: "A", role: "writer", ownershipPercentage: 50 },
      { name: "B", role: "producer", ownershipPercentage: 49 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "SPLIT_TOTAL_INVALID")).toBe(true);
    expect(r.errors[0].message).toMatch(/do not total 100%/);
    expect(r.errors[0].message).not.toMatch(/legally owns|copyright/i);
  });

  it("fails when percentages total 101%", () => {
    const r = validateSplits([
      { name: "A", role: "writer", ownershipPercentage: 50 },
      { name: "B", role: "producer", ownershipPercentage: 51 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "SPLIT_TOTAL_INVALID")).toBe(true);
  });

  it("fails on negative percentages", () => {
    const r = validateSplits([
      { name: "A", role: "writer", ownershipPercentage: -10 },
      { name: "B", role: "producer", ownershipPercentage: 110 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "INVALID_PERCENTAGE")).toBe(true);
  });

  it("reports duplicate contributor emails", () => {
    const r = validateSplits([
      { name: "A", email: "a@x.com", role: "writer", ownershipPercentage: 50 },
      { name: "A2", email: "a@x.com", role: "producer", ownershipPercentage: 50 },
    ]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "DUPLICATE_CONTRIBUTOR")).toBe(true);
  });

  it("requires at least one contributor", () => {
    const r = validateSplits([]);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.code === "REQUIRED_CONTRIBUTOR_MISSING")).toBe(true);
  });
});

describe("RSEE state machine", () => {
  it("allows DRAFT/AGREEMENT_READY → confirmation request after valid splits", () => {
    const s = snap({ contractStatus: "draft", hasCollaborators: true, splitsValid: true });
    expect(deriveRightsState(s)).toBe("AGREEMENT_READY");
    expect(canTransition("AGREEMENT_READY", "REQUEST_CONFIRMATIONS")).toBe(true);
    expect(evaluateEvent(s, "REQUEST_CONFIRMATIONS").ok).toBe(true);
  });

  it("rejects skipping confirmation and going straight to rights recording", () => {
    const s = snap({ confirmations: [] });
    expect(deriveRightsState(s)).toBe("AGREEMENT_READY");
    expect(canTransition("AGREEMENT_READY", "RECORD_RIGHTS")).toBe(false);
    expect(evaluateEvent(s, "RECORD_RIGHTS").ok).toBe(false);
    expect(() => assertTransition("DRAFT", "SUBMIT_CONFIRMATION")).toThrow(/Invalid state transition/);
  });

  it("rejects confirmation submit when links are expired", () => {
    const s = snap({
      contractStatus: "pending",
      confirmations: [
        { status: "sent", expiresAt: "2026-08-01T00:00:00Z" },
      ],
    });
    expect(deriveRightsState(s)).toBe("EXPIRED");
    expect(canTransition("EXPIRED", "SUBMIT_CONFIRMATION")).toBe(false);
    expect(evaluateEvent(s, "SUBMIT_CONFIRMATION").ok).toBe(false);
  });

  it("rejects confirmation submit when all links are revoked", () => {
    const s = snap({
      contractStatus: "pending",
      confirmations: [{ status: "revoked", revokedAt: "2026-08-28T00:00:00Z" }],
    });
    expect(deriveRightsState(s)).toBe("REVOKED");
    expect(canTransition("REVOKED", "SUBMIT_CONFIRMATION")).toBe(false);
  });

  it("rejects further confirmation after the project is finalized", () => {
    const s = snap({
      contractStatus: "signed",
      rightsLedgerSynced: true,
      confirmations: [
        { status: "confirmed", confirmedAt: "2026-08-28T00:00:00Z", ipAddress: "1.1.1.1" },
      ],
    });
    expect(deriveRightsState(s)).toBe("FINALIZED");
    expect(canTransition("FINALIZED", "SUBMIT_CONFIRMATION")).toBe(false);
    expect(canTransition("FINALIZED", "REVOKE_TOKEN")).toBe(false);
    expect(evaluateEvent(s, "FINALIZE").ok).toBe(true);
  });

  it("walks requested → accessed → confirmed → evidence → rights", () => {
    expect(canTransition("CONFIRMATION_REQUESTED", "ACCESS_CONFIRMATION")).toBe(true);
    expect(canTransition("ACCESSED", "REVIEW_CONFIRMATION")).toBe(true);
    expect(canTransition("REVIEWED", "SUBMIT_CONFIRMATION")).toBe(true);
    expect(canTransition("CONFIRMED", "RECORD_EVIDENCE")).toBe(true);
    expect(canTransition("EVIDENCE_RECORDED", "RECORD_RIGHTS")).toBe(true);
    expect(canTransition("RIGHTS_RECORDED", "FINALIZE")).toBe(true);
  });

  it("derives ACCESSED when a contributor has opened the link", () => {
    const s = snap({
      contractStatus: "pending",
      confirmations: [{ status: "sent", firstAccessedAt: "2026-08-28T11:00:00Z" }],
    });
    expect(deriveRightsState(s)).toBe("ACCESSED");
    expect(evaluateEvent(s, "SUBMIT_CONFIRMATION").ok).toBe(true);
  });

  it("blocks sending confirmations when splits are invalid", () => {
    const s = snap({
      splitsValid: false,
      validation: {
        valid: false,
        errors: [{ code: "SPLIT_TOTAL_INVALID", field: "ownershipPercentage", message: "The entered composition percentages do not total 100%." }],
        warnings: [],
      },
    });
    expect(deriveRightsState(s)).toBe("INVALID");
    const result = evaluateEvent(s, "REQUEST_CONFIRMATIONS");
    expect(result.ok).toBe(false);
    expect(result.code).toBe("SPLIT_TOTAL_INVALID");
  });
});

describe("RSEE authorization isolation", () => {
  it("allows an operator in the same organization", () => {
    expect(
      authorizeOperatorAccess({
        organizationId: "org-a",
        createdBy: "user-1",
        actorOrgId: "org-a",
        actorUserId: "user-2",
      }),
    ).toBe(true);
    expect(
      resourceBelongsToOrg({ organizationId: "org-a", createdBy: "user-1" }, "org-a", "user-2"),
    ).toBe(true);
  });

  it("denies an operator from a different organization", () => {
    expect(
      authorizeOperatorAccess({
        organizationId: "org-a",
        createdBy: "user-1",
        actorOrgId: "org-b",
        actorUserId: "user-1",
      }),
    ).toBe(false);
  });
});

describe("RSEE confirmation token gate", () => {
  it("allows a valid unexpired token", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(r.ok).toBe(true);
  });

  it("denies expired tokens", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      expires_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("expired");
  });

  it("denies revoked tokens", () => {
    const r = evaluateConfirmationToken({
      status: "sent",
      revoked_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("revoked");
  });

  it("denies invalid missing rows via caller 404; treats revoked status as revoked", () => {
    const r = evaluateConfirmationToken({ status: "revoked" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("revoked");
  });

  it("treats already-completed confirm as idempotent on submit", () => {
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

describe("RSEE evidence + rights ledger versioning", () => {
  it("does not treat an empty sync marker as a completed rights record", () => {
    expect(rightsLedgerAlreadySynced(null)).toBe(false);
    expect(rightsLedgerAlreadySynced({})).toBe(false);
    expect(rightsLedgerAlreadySynced({ rightsLedgerSync: { at: "2026-08-28" } })).toBe(false);
  });

  it("treats an existing ownership version as already recorded (no overwrite)", () => {
    expect(
      rightsLedgerAlreadySynced({
        rightsLedgerSync: { ownershipVersion: 1, assetId: "asset-1" },
      }),
    ).toBe(true);
  });

  it("marks rights-record step complete only after ledger sync", () => {
    const before = snap({
      contractStatus: "signed",
      rightsLedgerSynced: false,
      confirmations: [
        { status: "confirmed", confirmedAt: "2026-08-28T00:00:00Z", ipAddress: "1.1.1.1" },
      ],
    });
    expect(deriveRightsState(before)).toBe("EVIDENCE_RECORDED");
    const after = { ...before, rightsLedgerSynced: true };
    expect(deriveRightsState(after)).toBe("FINALIZED");
    const steps = workflowSteps(after, "FINALIZED");
    expect(steps.find((s) => s.id === "ledger")?.done).toBe(true);
    expect(steps.find((s) => s.id === "evidence")?.done).toBe(true);
  });
});

describe("RSEE QR uses the same confirmation token workflow", () => {
  it("encodes only the opaque /confirm/:token path for both link and QR", () => {
    const token = generateConfirmationToken();
    expect(opaqueConfirmPath(token)).toBe(`/confirm/${token}`);
    expect(opaqueConfirmPath(token, true)).toBe(`/confirm/${token}?via=qr`);
    const link = opaqueConfirmUrl("https://splitsheet.ca", token);
    const qr = opaqueConfirmUrl("https://splitsheet.ca", token, true);
    expect(link).toBe(`https://splitsheet.ca/confirm/${token}`);
    expect(qr).toBe(`https://splitsheet.ca/confirm/${token}?via=qr`);
    expect(qr).not.toMatch(/ownership|percentage|email=/i);
    expect(accessMethodFromRequest("qr")).toBe("qr");
    expect(accessMethodFromRequest(undefined)).toBe("link");
  });

  it("allows QR generation only after confirmation has been requested", () => {
    expect(canTransition("DRAFT", "GENERATE_QR")).toBe(false);
    expect(canTransition("AGREEMENT_READY", "GENERATE_QR")).toBe(false);
    expect(canTransition("CONFIRMATION_REQUESTED", "GENERATE_QR")).toBe(true);
    expect(canTransition("ACCESSED", "GENERATE_QR")).toBe(true);
  });
});

describe("RSEE legal positioning", () => {
  it("keeps the existing product disclaimer", () => {
    expect(LEGAL_DISCLAIMER).toMatch(/not a law firm/i);
    expect(LEGAL_DISCLAIMER).toMatch(/does not provide legal advice/i);
  });
});
