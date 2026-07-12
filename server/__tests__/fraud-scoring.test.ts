import { describe, it, expect } from "vitest";
import { calculateRiskScore, type Collaborator } from "../security";

const baseCollabs: Collaborator[] = [
  { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 60 },
  { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 40 },
];

function ctx(overrides: Partial<Parameters<typeof calculateRiskScore>[0]> = {}) {
  return {
    contractId: "contract-1",
    userId: "user-1",
    collaborators: baseCollabs,
    versionNumber: 1,
    ipAddress: "127.0.0.1",
    ...overrides,
  };
}

describe("security: fraud/risk scoring", () => {
  it("allows a clean, first-version split with no risk signals", () => {
    const result = calculateRiskScore(ctx());
    expect(result.riskScore).toBe(0);
    expect(result.action).toBe("allow");
    expect(result.rulesTriggered).toEqual([]);
  });

  it("flags rapid version changes (<5 minutes) with +30 and delays it", () => {
    const result = calculateRiskScore(ctx({ versionNumber: 2, timeSinceLastVersion: 2, prevCollaborators: baseCollabs }));
    expect(result.rulesTriggered).toContain("rapid_change");
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
  });

  it("does not flag rapid change when >=5 minutes have elapsed", () => {
    const result = calculateRiskScore(ctx({ versionNumber: 2, timeSinceLastVersion: 10, prevCollaborators: baseCollabs }));
    expect(result.rulesTriggered).not.toContain("rapid_change");
  });

  it("flags an ownership swing greater than 50 percentage points", () => {
    const prev: Collaborator[] = [
      { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 10 },
      { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 90 },
    ];
    const next: Collaborator[] = [
      { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 70 }, // +60 swing
      { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 30 },
    ];
    const result = calculateRiskScore(ctx({ versionNumber: 2, collaborators: next, prevCollaborators: prev }));
    expect(result.rulesTriggered).toContain("ownership_spike");
  });

  it("flags a late contributor added after version 1 with nonzero ownership", () => {
    const withNewWriter: Collaborator[] = [
      ...baseCollabs.map((c) => ({ ...c, ownershipPercentage: 30 })),
      { name: "Carol", email: "carol@example.com", role: "co-writer", ownershipPercentage: 40 },
    ];
    const result = calculateRiskScore(
      ctx({ versionNumber: 2, collaborators: withNewWriter, prevCollaborators: baseCollabs })
    );
    expect(result.rulesTriggered).toContain("late_contributor_add");
  });

  it("flags excessive version churn beyond version 5", () => {
    const result = calculateRiskScore(ctx({ versionNumber: 6 }));
    expect(result.rulesTriggered).toContain("excessive_versions");
  });

  it("flags ownership concentration when one party owns over 90%", () => {
    const concentrated: Collaborator[] = [
      { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 95 },
      { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 5 },
    ];
    const result = calculateRiskScore(ctx({ collaborators: concentrated }));
    expect(result.rulesTriggered).toContain("ownership_concentration");
  });

  it("escalates to 'delay' once the combined score reaches 40", () => {
    // rapid_change (30) + ownership_concentration (10) = 40 -> delay
    const concentrated: Collaborator[] = [
      { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 95 },
      { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 5 },
    ];
    const result = calculateRiskScore(
      ctx({ versionNumber: 2, collaborators: concentrated, prevCollaborators: concentrated, timeSinceLastVersion: 1 })
    );
    expect(result.riskScore).toBe(40);
    expect(result.action).toBe("delay");
  });

  it("escalates to 'freeze' when multiple severe rules stack past 70", () => {
    const prev: Collaborator[] = [
      { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 50 },
      { name: "Bob", email: "bob@example.com", role: "producer", ownershipPercentage: 50 },
    ];
    const next: Collaborator[] = [
      { name: "Alice", email: "alice@example.com", role: "writer", ownershipPercentage: 95 }, // +45 (not >50, avoid spike)
      { name: "Carol", email: "carol@example.com", role: "co-writer", ownershipPercentage: 5 }, // late add
    ];
    const result = calculateRiskScore(
      ctx({
        versionNumber: 7, // excessive_versions +15
        collaborators: next,
        prevCollaborators: prev,
        timeSinceLastVersion: 1, // rapid_change +30
      })
    );
    // rapid_change(30) + late_contributor_add(20) + excessive_versions(15) + ownership_concentration(10) = 75
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.action).toBe("freeze");
  });
});
