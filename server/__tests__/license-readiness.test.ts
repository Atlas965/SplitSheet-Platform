import { describe, it, expect } from "vitest";
import { LICENSE_SCORE_WEIGHTS, tierForScore, tierLabel } from "../license-readiness";

describe("license-readiness: scoring weights", () => {
  it("sums to exactly 100 points", () => {
    const total = Object.values(LICENSE_SCORE_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBe(100);
  });
});

describe("license-readiness: tierForScore boundaries", () => {
  it("classifies 100 as ready for licensing", () => {
    expect(tierForScore(100)).toBe("ready");
  });

  it("classifies 99 as needs review (just below ready)", () => {
    expect(tierForScore(99)).toBe("needs_review");
  });

  it("classifies 75 as needs review (lower boundary of the band)", () => {
    expect(tierForScore(75)).toBe("needs_review");
  });

  it("classifies 74 as incomplete (just below needs-review band)", () => {
    expect(tierForScore(74)).toBe("incomplete");
  });

  it("classifies 0 as incomplete", () => {
    expect(tierForScore(0)).toBe("incomplete");
  });

  it("never returns a tier outside the known set for any 0-100 score", () => {
    for (let score = 0; score <= 100; score++) {
      expect(["ready", "needs_review", "incomplete"]).toContain(tierForScore(score));
    }
  });
});

describe("license-readiness: tierLabel", () => {
  it("maps each tier to its human-readable label from the spec", () => {
    expect(tierLabel("ready")).toBe("Ready for licensing");
    expect(tierLabel("needs_review")).toBe("Needs review");
    expect(tierLabel("incomplete")).toBe("Incomplete rights information");
  });
});
