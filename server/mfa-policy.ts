/**
 * Phase 8 — MFA policy (Auth0-managed factors; SplitSheet enforces for privileged org roles).
 * Requires Auth0 MFA configured in the dashboard. Session must carry amr/acr from ID token.
 */
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { OrgAuthedRequest } from "./rbac-middleware";
import { roleAtLeast, type OrgRole } from "@shared/org-rbac";
import { logAuthEvent, AUTH_EVENTS } from "./auth-events";

export function mfaEnforcementEnabled(): boolean {
  return (
    process.env.REQUIRE_MFA_FOR_ORG_ADMINS === "true" ||
    process.env.REQUIRE_MFA_FOR_ORG_ADMINS === "1"
  );
}

/** True when Auth0 (or equivalent) recorded MFA on this session. */
export function sessionHasMfa(req: Request): boolean {
  const user = (req as any).user;
  if (!user) return false;
  if (user.mfa === true || user.claims?.mfa === true) return true;
  const amr = user.amr || user.claims?.amr;
  if (Array.isArray(amr) && amr.some((v) => String(v).toLowerCase().includes("mfa"))) {
    return true;
  }
  const acr = String(user.acr || user.claims?.acr || "");
  if (/mfa|multi/i.test(acr)) return true;
  return false;
}

/**
 * After org membership is attached: block owner/admin (configurable minimum)
 * when MFA enforcement is on and session lacks MFA evidence.
 */
export function requireMfaForPrivilegedOrgRoles(
  minimum: OrgRole = "admin",
): RequestHandler {
  return async (req: OrgAuthedRequest, res: Response, next: NextFunction) => {
    if (!mfaEnforcementEnabled()) return next();
    const role = req.orgAuth?.role;
    if (!role || !roleAtLeast(role, minimum)) return next();
    if (sessionHasMfa(req)) {
      await logAuthEvent({
        action: AUTH_EVENTS.MFA_SATISFIED,
        userId: req.orgAuth?.userId,
        resourceType: "organization",
        resourceId: req.orgAuth?.organizationId,
        req,
      });
      return next();
    }
    await logAuthEvent({
      action: AUTH_EVENTS.MFA_REQUIRED,
      userId: req.orgAuth?.userId,
      resourceType: "organization",
      resourceId: req.orgAuth?.organizationId,
      afterState: { role, minimum },
      req,
    });
    res.status(403).json({
      message: "Multi-factor authentication required for this organization role",
      code: "MFA_REQUIRED",
      hint: "Complete MFA via Auth0 Universal Login, then retry.",
    });
  };
}
