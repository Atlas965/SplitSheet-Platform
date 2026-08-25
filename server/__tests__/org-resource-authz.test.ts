import { describe, it, expect } from "vitest";
import { resourceBelongsToOrg } from "../authz-helpers";

describe("resourceBelongsToOrg (Phase 5)", () => {
  it("allows stamped resource when active org matches", () => {
    expect(
      resourceBelongsToOrg(
        { organizationId: "org-a", createdBy: "user-1" },
        "org-a",
        "user-2",
      ),
    ).toBe(true);
  });

  it("denies stamped resource for a different active org", () => {
    expect(
      resourceBelongsToOrg(
        { organizationId: "org-a", createdBy: "user-1" },
        "org-b",
        "user-1",
      ),
    ).toBe(false);
  });

  it("denies stamped resource when caller has no active org", () => {
    expect(
      resourceBelongsToOrg(
        { organizationId: "org-a", createdBy: "user-1" },
        null,
        "user-1",
      ),
    ).toBe(false);
  });

  it("allows legacy unstamped resource only for creator", () => {
    expect(
      resourceBelongsToOrg(
        { organizationId: null, createdBy: "user-1" },
        "org-a",
        "user-1",
      ),
    ).toBe(true);
    expect(
      resourceBelongsToOrg(
        { organizationId: null, createdBy: "user-1" },
        "org-a",
        "user-2",
      ),
    ).toBe(false);
  });
});
