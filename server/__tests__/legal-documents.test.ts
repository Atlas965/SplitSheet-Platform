import { describe, it, expect } from "vitest";
import { isAcceptanceCurrent, GATED_DOC_TYPES } from "../compliance-routes";
import { LEGAL_DOC_TYPES } from "@shared/schema";

describe("legal documents: isAcceptanceCurrent", () => {
  it("is current when accepted version exactly matches the latest published version", () => {
    expect(isAcceptanceCurrent("2026-07-12", "2026-07-12")).toBe(true);
  });

  it("is NOT current when no acceptance exists yet", () => {
    expect(isAcceptanceCurrent(null, "2026-07-12")).toBe(false);
    expect(isAcceptanceCurrent(undefined, "2026-07-12")).toBe(false);
  });

  it("is NOT current when a newer version has been published (forces re-acceptance)", () => {
    expect(isAcceptanceCurrent("2026-07-12", "2026-08-01")).toBe(false);
  });

  it("treats an empty-string accepted version as not accepted", () => {
    expect(isAcceptanceCurrent("", "2026-07-12")).toBe(false);
  });
});

describe("legal documents: GATED_DOC_TYPES", () => {
  it("gates exactly tos and privacy — not dpa or contributor_consent", () => {
    expect(GATED_DOC_TYPES).toEqual(["tos", "privacy"]);
  });

  it("every gated doc type is a subset of the full LEGAL_DOC_TYPES enum", () => {
    for (const docType of GATED_DOC_TYPES) {
      expect(LEGAL_DOC_TYPES).toContain(docType);
    }
  });
});

describe("legal documents: LEGAL_DOC_TYPES enum stability", () => {
  it("supports the four doc types required by Priority 1.1/1.3", () => {
    expect(LEGAL_DOC_TYPES).toEqual(["tos", "privacy", "dpa", "contributor_consent"]);
  });
});
