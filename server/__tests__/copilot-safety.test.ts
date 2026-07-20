import { describe, it, expect } from "vitest";
import {
  classifyCopilotQuestion,
  redactCopilotText,
} from "../copilot-safety";

describe("copilot-safety (Priority 6)", () => {
  it("classifies legal-advice questions", () => {
    expect(classifyCopilotQuestion("Is this legally binding under Ontario law?")).toBe(
      "seeking_legal_advice",
    );
    expect(classifyCopilotQuestion("How do I add a collaborator?")).toBe("general");
  });

  it("redacts emails, IPI, and Stripe IDs", () => {
    const raw = "Contact jane@example.com IPI 123456789 and cus_ABC123 pi_XYZ";
    const out = redactCopilotText(raw);
    expect(out).not.toContain("jane@example.com");
    expect(out).not.toContain("123456789");
    expect(out).not.toContain("cus_ABC123");
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[IPI]");
    expect(out).toContain("[STRIPE_ID]");
  });
});
