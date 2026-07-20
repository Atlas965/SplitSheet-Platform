/**
 * server/rights-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global Rights Framework (Feature 1) — territory + rights-organization
 * reference data, and the current user's own Rights Profile
 * (Settings → Rights Profile: PRO affiliation, territory, IPI number,
 * songwriter/publisher status).
 *
 * `rights_organizations` is a small seeded reference table (see
 * server/db-migrations.ts) — read-only from this API. `creator_rights_profiles`
 * is a one-per-user upsert, distinct from the `creators` roster in
 * server/creator-routes.ts (that roster is for OTHER people an operator
 * manages; this profile is the logged-in user's own rights settings).
 *
 * Mounted from server/routes.ts via registerRightsRoutes(app).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { insertCreatorRightsProfileSchema, TERRITORIES } from "@shared/schema";
import { auditLog } from "./security";

export function registerRightsRoutes(app: Express): void {
  // ══════════════════════════════════════════════════════════════════════════
  // RIGHTS ORGANIZATIONS (PROs / CMOs / MROs) — read-only reference data
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/rights-organizations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const territory = typeof req.query.territory === "string" ? req.query.territory.toUpperCase() : undefined;
      const orgs = await storage.getRightsOrganizations(territory);
      res.json(orgs);
    } catch (error) {
      console.error("[RIGHTS ORGS ERROR]", error);
      res.status(500).json({ message: "Failed to fetch rights organizations" });
    }
  });

  app.get("/api/territories", isAuthenticated, (_req: Request, res: Response) => {
    res.json(TERRITORIES);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RIGHTS PROFILE — Settings → Rights Profile (one per user)
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/rights-profile", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const profile = await storage.getCreatorRightsProfile(userId);
      res.json(profile ?? null);
    } catch (error) {
      console.error("[RIGHTS PROFILE GET ERROR]", error);
      res.status(500).json({ message: "Failed to fetch rights profile" });
    }
  });

  app.put("/api/rights-profile", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const body = insertCreatorRightsProfileSchema
        .extend({ territory: z.enum(TERRITORIES).optional() })
        .parse(req.body);

      const before = await storage.getCreatorRightsProfile(userId);
      const profile = await storage.upsertCreatorRightsProfile(userId, body);

      await auditLog({
        userId,
        action: "rights_profile.update",
        resourceType: "creator_rights_profile",
        resourceId: profile.id,
        beforeState: before,
        afterState: profile,
        ipAddress: (req as any).ip,
      });

      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[RIGHTS PROFILE UPDATE ERROR]", error);
        res.status(500).json({ message: "Failed to update rights profile" });
      }
    }
  });
}
