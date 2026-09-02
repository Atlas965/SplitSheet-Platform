import { describe, it, expect } from "vitest";
import {
  assertUnderLimit,
  contributorLimitForTier,
  normalizePlanTier,
  projectLimitForTier,
} from "../../shared/plan-limits";

describe("plan-limits", () => {
  it("normalizes legacy tier names", () => {
    expect(normalizePlanTier(undefined)).toBe("free");
    expect(normalizePlanTier("starter")).toBe("free");
    expect(normalizePlanTier("label")).toBe("studio_pro");
    expect(normalizePlanTier("Creator_Pro")).toBe("creator_pro");
  });

  it("caps starter and session projects; paid tiers are unlimited", () => {
    expect(projectLimitForTier("free")).toBe(1);
    expect(projectLimitForTier("starter")).toBe(1);
    expect(projectLimitForTier("session")).toBe(5);
    expect(projectLimitForTier("creator_pro")).toBeNull();
    expect(projectLimitForTier("studio_pro")).toBeNull();
  });

  it("caps starter and session contributors", () => {
    expect(contributorLimitForTier("free")).toBe(2);
    expect(contributorLimitForTier("session")).toBe(5);
    expect(contributorLimitForTier("studio_pro")).toBeNull();
  });

  it("allows usage under the cap and rejects at the cap", () => {
    expect(assertUnderLimit(0, 1, "projects")).toEqual({ ok: true });
    expect(assertUnderLimit(1, 1, "projects").ok).toBe(false);
    expect(assertUnderLimit(4, 5, "projects")).toEqual({ ok: true });
    expect(assertUnderLimit(99, null, "projects")).toEqual({ ok: true });
  });
});
