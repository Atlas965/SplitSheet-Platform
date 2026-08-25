/**
 * Phases 9–10 — Enterprise SSO / SCIM stubs.
 * Not a product IdP; endpoints exist so enterprise discovery and Auth0 Enterprise
 * connection planning have a stable surface. Always 501 until explicitly enabled.
 */
import type { Express, Request, Response } from "express";
import { requireAuth } from "./rbac-middleware";

const STUB = {
  code: "ENTERPRISE_NOT_ENABLED",
  message:
    "Enterprise SSO/SCIM is not enabled. Use Auth0 Enterprise connections when contracted; SplitSheet does not host an IdP.",
  docs: "/docs/ENTERPRISE_SSO_SCIM.md",
};

export function registerEnterpriseStubs(app: Express): void {
  app.get("/api/enterprise/sso/status", requireAuth, (_req: Request, res: Response) => {
    res.status(501).json({
      ...STUB,
      feature: "sso",
      auth0Hint: "Configure an Enterprise connection in Auth0; set AUTH_PROVIDER=auth0.",
    });
  });

  app.post("/api/enterprise/sso/acs", (_req: Request, res: Response) => {
    res.status(501).json({ ...STUB, feature: "sso_acs" });
  });

  app.get("/api/enterprise/scim/Users", requireAuth, (_req: Request, res: Response) => {
    res.status(501).json({ ...STUB, feature: "scim_users" });
  });

  app.post("/api/enterprise/scim/Users", requireAuth, (_req: Request, res: Response) => {
    res.status(501).json({ ...STUB, feature: "scim_users_create" });
  });

  app.get("/api/enterprise/scim/Groups", requireAuth, (_req: Request, res: Response) => {
    res.status(501).json({ ...STUB, feature: "scim_groups" });
  });
}
