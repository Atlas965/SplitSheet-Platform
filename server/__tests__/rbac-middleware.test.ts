import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  requireRole,
  requirePermission,
  type OrgAuthedRequest,
} from "../rbac-middleware";
import { roleHasPermission } from "../../shared/org-rbac";

function mockRes() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = vi.fn((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as any;
  res.json = vi.fn((body: unknown) => {
    res.body = body;
    return res as Response;
  }) as any;
  return res as Response & { statusCode?: number; body?: any };
}

describe("rbac-middleware (Phase 4)", () => {
  it("requireRole allows owner for admin minimum", () => {
    const req = {
      orgAuth: {
        organizationId: "org1",
        role: "owner",
        userId: "u1",
        membershipId: "m1",
        name: "Org",
        slOrgId: "SL-ORG-1",
        source: "param",
        permissions: [],
      },
    } as OrgAuthedRequest;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requireRole("admin")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("requireRole denies viewer for operator minimum", () => {
    const req = {
      orgAuth: {
        organizationId: "org1",
        role: "viewer",
        userId: "u1",
        membershipId: "m1",
        name: "Org",
        slOrgId: "SL-ORG-1",
        source: "active",
        permissions: [],
      },
    } as OrgAuthedRequest;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requireRole("operator")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("requirePermission denies missing permission", () => {
    const req = {
      orgAuth: {
        organizationId: "org1",
        role: "viewer",
        userId: "u1",
        membershipId: "m1",
        name: "Org",
        slOrgId: "SL-ORG-1",
        source: "active",
        permissions: [],
      },
    } as OrgAuthedRequest;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requirePermission("agreement.create")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(String(res.body?.message)).toContain("agreement.create");
  });

  it("requirePermission allows operator to create agreements", () => {
    const req = {
      orgAuth: {
        organizationId: "org1",
        role: "operator",
        userId: "u1",
        membershipId: "m1",
        name: "Org",
        slOrgId: "SL-ORG-1",
        source: "active",
        permissions: [],
      },
    } as OrgAuthedRequest;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requirePermission("agreement.create")(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("requirePermission fails closed without orgAuth", () => {
    const req = {} as OrgAuthedRequest;
    const res = mockRes();
    const next = vi.fn() as NextFunction;
    requirePermission("project.read")(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it("catalog includes agreement.update for operator", () => {
    expect(roleHasPermission("operator", "agreement.update")).toBe(true);
    expect(roleHasPermission("viewer", "agreement.update")).toBe(false);
  });
});
