/**
 * Central RBAC middleware (Phase 4).
 * Use these instead of ad-hoc role checks. Resource-by-id org IDOR remains Phase 5.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { isAuthenticated } from "./replitAuth";
import { storage } from "./storage";
import { resolveActiveOrganization } from "./org-context";
import {
  normalizeOrgRole,
  roleAtLeast,
  roleHasPermission,
  permissionsForRole,
  type OrgPermission,
  type OrgRole,
} from "@shared/org-rbac";
import { sessionUserId } from "./authz-helpers";

export type OrgAuthContext = {
  organizationId: string;
  role: OrgRole;
  userId: string;
  membershipId: string;
  name: string;
  slOrgId: string;
  source: "param" | "active";
  permissions: OrgPermission[];
};

export type OrgAuthedRequest = Request & {
  orgAuth?: OrgAuthContext;
};

/** Phase 4 name for session authentication (same gate as isAuthenticated). */
export const requireAuth: RequestHandler = isAuthenticated;

type MembershipOptions = {
  /** Route param holding organization id (default: "id"). Ignored when fromActive. */
  paramKey?: string;
  /** Resolve the caller's active organization instead of a path param. */
  fromActive?: boolean;
};

function deny(res: Response, status: number, message: string): void {
  res.status(status).json({ message });
}

/**
 * Ensures the caller is a member of the target organization and sets req.orgAuth.
 * Must run after requireAuth (or isAuthenticated).
 */
export function requireOrganizationMembership(
  options: MembershipOptions = {},
): RequestHandler {
  const paramKey = options.paramKey ?? "id";
  const fromActive = options.fromActive === true;

  return async (req: OrgAuthedRequest, res: Response, next: NextFunction) => {
    const userId = sessionUserId(req);
    if (!userId) {
      deny(res, 401, "Unauthorized");
      return;
    }

    try {
      if (fromActive) {
        const active = await resolveActiveOrganization(userId);
        if (!active) {
          deny(res, 403, "No active organization");
          return;
        }
        const member = await storage.getOrganizationMember(
          active.organizationId,
          userId,
        );
        if (!member) {
          deny(res, 403, "You are not a member of this organization");
          return;
        }
        const role = normalizeOrgRole(member.role) || active.role;
        req.orgAuth = {
          organizationId: active.organizationId,
          role,
          userId,
          membershipId: member.id,
          name: active.name,
          slOrgId: active.slOrgId,
          source: "active",
          permissions: permissionsForRole(role),
        };
        return next();
      }

      const organizationId = String(req.params[paramKey] || "");
      if (!organizationId) {
        deny(res, 400, "Organization id is required");
        return;
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        deny(res, 404, "Organization not found");
        return;
      }

      const member = await storage.getOrganizationMember(organizationId, userId);
      if (!member) {
        deny(res, 403, "You are not a member of this organization");
        return;
      }

      const role = normalizeOrgRole(member.role);
      if (!role) {
        deny(res, 403, "Invalid organization role");
        return;
      }

      req.orgAuth = {
        organizationId: org.id,
        role,
        userId,
        membershipId: member.id,
        name: org.name,
        slOrgId: org.slOrgId,
        source: "param",
        permissions: permissionsForRole(role),
      };
      next();
    } catch (error) {
      console.error("[rbac] membership", error);
      deny(res, 500, "Internal server error");
    }
  };
}

/** Requires req.orgAuth and role ≥ minimum. Run after requireOrganizationMembership. */
export function requireRole(minimum: OrgRole): RequestHandler {
  return (req: OrgAuthedRequest, res: Response, next: NextFunction) => {
    if (!req.orgAuth) {
      deny(res, 403, "Organization context required");
      return;
    }
    if (!roleAtLeast(req.orgAuth.role, minimum)) {
      deny(res, 403, `Requires ${minimum} role or higher in this organization`);
      return;
    }
    next();
  };
}

/** Requires req.orgAuth and every listed permission. Run after requireOrganizationMembership. */
export function requirePermission(
  ...permissions: OrgPermission[]
): RequestHandler {
  return (req: OrgAuthedRequest, res: Response, next: NextFunction) => {
    if (!req.orgAuth) {
      deny(res, 403, "Organization context required");
      return;
    }
    if (!permissions.length) {
      next();
      return;
    }
    const missing = permissions.filter(
      (p) => !roleHasPermission(req.orgAuth!.role, p),
    );
    if (missing.length) {
      deny(res, 403, `Missing permission: ${missing.join(", ")}`);
      return;
    }
    next();
  };
}

/**
 * Convenience chain: auth → active org membership → permission(s).
 * Spread onto a route: `app.post(path, ...requireActivePermission("agreement.create"), handler)`
 */
export function requireActivePermission(
  ...permissions: OrgPermission[]
): RequestHandler[] {
  return [
    requireAuth,
    requireOrganizationMembership({ fromActive: true }),
    requirePermission(...permissions),
  ];
}

/** Auth + active organization membership (no specific permission). */
export function requireActiveOrg(): RequestHandler[] {
  return [requireAuth, requireOrganizationMembership({ fromActive: true })];
}

/** Convenience: auth → org from `:id` → minimum role. */
export function requireOrgParamRole(minimum: OrgRole): RequestHandler[] {
  return [
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requireRole(minimum),
  ];
}

/** Convenience: auth → org from `:id` → permission(s). */
export function requireOrgParamPermission(
  ...permissions: OrgPermission[]
): RequestHandler[] {
  return [
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requirePermission(...permissions),
  ];
}
