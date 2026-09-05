import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { isAuthenticated } from "./replitAuth";
import { isAdmin } from "./adminAuth";
import { requireActivePermission } from "./rbac-middleware";
import type { OrgAuthedRequest } from "./rbac-middleware";
import { logger } from "./logger";
import { ensureProductionFeatureSchema } from "./feature-schema";

function publicStudio(row: Record<string, unknown>) {
  return {
    id: row.id,
    slOrgId: row.sl_org_id,
    name: row.name,
    website: row.website ?? null,
    logoUrl: row.logo_url ?? null,
    phone: row.phone ?? null,
    verificationStatus: row.verification_status ?? "unverified",
    verifiedAt: row.verified_at ?? null,
    badgeTier: row.badge_tier ?? "none",
    verifiedSessionCount: Number(row.verified_session_count ?? 0),
  };
}

async function loadStudio(id: string) {
  await ensureProductionFeatureSchema();
  const rows = await db.execute(sql`
    SELECT o.id, o.sl_org_id, o.name, o.website, o.logo_url, o.phone, o.address,
           o.verification_status, o.verified_at, o.badge_tier, o.public_slug,
           (
             SELECT COUNT(*) FROM contracts c
             WHERE c.organization_id = o.id AND c.status IN ('signed', 'active')
           ) AS verified_session_count
    FROM organizations o
    WHERE o.id = ${id} OR o.sl_org_id = ${id} OR o.public_slug = ${id}
    LIMIT 1
  `);
  return (rows.rows[0] as Record<string, unknown> | undefined) ?? null;
}

export function registerStudioRoutes(app: Express): void {
  app.get("/api/studio/:id", async (req: Request, res: Response) => {
    try {
      const studio = await loadStudio(req.params.id);
      if (!studio) {
        res.status(404).json({ message: "Studio not found" });
        return;
      }
      res.json(publicStudio(studio));
    } catch (error) {
      res.status(500).json({ message: "Failed to load studio" });
    }
  });

  app.patch("/api/studio/profile", ...requireActivePermission("project.update"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const orgId = req.orgAuth?.organizationId;
      if (!orgId) {
        res.status(403).json({ message: "No active organization" });
        return;
      }
      await ensureProductionFeatureSchema();
      const website = typeof req.body?.website === "string" ? req.body.website.trim().slice(0, 300) : undefined;
      const phone = typeof req.body?.phone === "string" ? req.body.phone.trim().slice(0, 40) : undefined;
      const address = typeof req.body?.address === "string" ? req.body.address.trim().slice(0, 400) : undefined;
      const logoUrl = typeof req.body?.logoUrl === "string" ? req.body.logoUrl.trim().slice(0, 500) : undefined;
      if (logoUrl && !/^https:\/\//i.test(logoUrl)) {
        res.status(400).json({ message: "Logo must be an https URL." });
        return;
      }
      await db.execute(sql`
        UPDATE organizations SET
          website = COALESCE(${website ?? null}, website),
          phone = COALESCE(${phone ?? null}, phone),
          address = COALESCE(${address ?? null}, address),
          logo_url = COALESCE(${logoUrl ?? null}, logo_url),
          updated_at = now()
        WHERE id = ${orgId}
      `);
      const studio = await loadStudio(orgId);
      res.json(studio ? publicStudio(studio) : { id: orgId });
    } catch (error) {
      res.status(500).json({ message: "Failed to update studio profile" });
    }
  });

  app.get("/api/admin/studios", isAuthenticated, isAdmin, async (_req: Request, res: Response) => {
    await ensureProductionFeatureSchema();
    const rows = await db.execute(sql`
      SELECT id, sl_org_id, name, website, verification_status, verified_at, badge_tier
      FROM organizations
      ORDER BY created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows);
  });

  app.get("/api/admin/studios/:id/history", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    await ensureProductionFeatureSchema();
    const rows = await db.execute(sql`
      SELECT id, action, badge_tier, note, actor_id, created_at
      FROM studio_verification_events
      WHERE organization_id = ${req.params.id}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  });

  app.post("/api/admin/studios/:id/verify", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    await ensureProductionFeatureSchema();
    const tier = ["none", "standard", "plus"].includes(String(req.body?.tier)) ? String(req.body.tier) : "standard";
    await db.execute(sql`
      UPDATE organizations SET
        verification_status = 'verified',
        verified_at = now(),
        badge_tier = ${tier},
        updated_at = now()
      WHERE id = ${req.params.id}
    `);
    await db.execute(sql`
      INSERT INTO studio_verification_events (organization_id, actor_id, action, badge_tier, note)
      VALUES (${req.params.id}, ${req.user?.claims?.sub ?? null}, 'verify', ${tier}, ${String(req.body?.note ?? "") || null})
    `);
    logger.info("studio.verified", { organizationId: req.params.id, tier });
    res.json({ ok: true, verificationStatus: "verified", badgeTier: tier });
  });

  app.post("/api/admin/studios/:id/unverify", isAuthenticated, isAdmin, async (req: any, res: Response) => {
    await ensureProductionFeatureSchema();
    await db.execute(sql`
      UPDATE organizations SET
        verification_status = 'unverified',
        badge_tier = 'none',
        updated_at = now()
      WHERE id = ${req.params.id}
    `);
    await db.execute(sql`
      INSERT INTO studio_verification_events (organization_id, actor_id, action, badge_tier, note)
      VALUES (${req.params.id}, ${req.user?.claims?.sub ?? null}, 'unverify', 'none', ${String(req.body?.note ?? "") || null})
    `);
    logger.info("studio.unverified", { organizationId: req.params.id });
    res.json({ ok: true, verificationStatus: "unverified" });
  });
}

export async function studioForContract(contractId: string) {
  const rows = await db.execute(sql`
    SELECT o.id, o.sl_org_id, o.name, o.website, o.logo_url, o.phone,
           o.verification_status, o.verified_at, o.badge_tier
    FROM contracts c
    JOIN organizations o ON o.id = c.organization_id
    WHERE c.id = ${contractId}
    LIMIT 1
  `);
  const row = rows.rows[0] as Record<string, unknown> | undefined;
  return row ? publicStudio(row) : null;
}
