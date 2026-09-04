import { describe, it, expect } from "vitest";
import { confirmationRate, summarizeWorkspace } from "../../shared/workspace-analytics";

describe("workspace analytics", () => {
  it("computes confirmation rate from actionable links only", () => {
    expect(
      confirmationRate([
        { status: "confirmed" },
        { status: "sent" },
        { status: "revoked" },
        { status: "not_sent" },
      ]),
    ).toBe(50);
  });

  it("summarizes operator workspace metrics and plan caps", () => {
    const summary = summarizeWorkspace({
      projects: [
        { status: "draft" },
        { status: "pending_confirmation" },
        { status: "confirmed" },
      ],
      confirmations: [{ status: "confirmed" }, { status: "sent" }],
      clientCount: 4,
      contributorCount: 2,
      tier: "free",
    });
    expect(summary.totalProjects).toBe(3);
    expect(summary.drafts).toBe(1);
    expect(summary.pendingConfirmation).toBe(1);
    expect(summary.confirmed).toBe(1);
    expect(summary.confirmationRate).toBe(50);
    expect(summary.plan.projectLimit).toBe(1);
    expect(summary.plan.contributorLimit).toBe(2);
  });
});
