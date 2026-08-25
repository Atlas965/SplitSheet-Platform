import { describe, it, expect } from "vitest";
import {
  normalizeOrgRole,
  roleAtLeast,
  roleHasPermission,
  permissionsForRole,
} from "../../shared/org-rbac";

describe("org-rbac (Phase 3)", () => {
  it("maps legacy member to operator", () => {
    expect(normalizeOrgRole("member")).toBe("operator");
    expect(normalizeOrgRole("MEMBER")).toBe("operator");
  });

  it("ranks owner above admin and operator", () => {
    expect(roleAtLeast("owner", "admin")).toBe(true);
    expect(roleAtLeast("admin", "operator")).toBe(true);
    expect(roleAtLeast("viewer", "operator")).toBe(false);
  });

  it("gives finance billing but not project create", () => {
    expect(roleHasPermission("finance", "org.billing.manage")).toBe(true);
    expect(roleHasPermission("finance", "project.create")).toBe(false);
  });

  it("owner has all permissions", () => {
    const perms = permissionsForRole("owner");
    expect(perms).toContain("org.manage");
    expect(perms).toContain("project.delete");
  });
});
