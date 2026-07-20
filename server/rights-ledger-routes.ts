/**
 * server/rights-ledger-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Master vs Composition Rights (Feature 2) + Licensing Readiness (Feature 3)
 * + the permanent SL-SONG-ID (planned in .agents/memory/identity-layer.md) +
 * rights change history (Feature 8 — reuses the existing audit_log table,
 * see server/storage.ts `getRightsChangeHistory`).
 *
 * All routes are nested under the existing song-asset resource
 * (server/routes.ts already owns GET/POST/PATCH /api/assets and the
 * ownership sub-routes) — this file only adds the new sub-resources.
 *
 * Mounted from server/routes.ts via registerRightsLedgerRoutes(app).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { insertCompositionAssetSchema, insertMasterAssetSchema } from "@shared/schema";
import { auditLog } from "./security";
import { recalculateLicenseReadiness, tierForScore, tierLabel } from "./license-readiness";

/** Permanent external ID: SL-SONG-XXXXXXXX (never reused, generated server-side only). */
async function generateUniqueSlSongId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slSongId = `SL-SONG-${shortId}`;
    const existing = await storage.getSongAssetBySlSongId(slSongId);
    if (!existing) return slSongId;
  }
  return `SL-SONG-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

async function requireAssetOwner(req: Request, res: Response): Promise<{ id: string; contractId: string | null; createdBy: string } | null> {
  const userId = (req as any).user.claims.sub;
  const asset = await storage.getSongAsset(req.params.id);
  if (!asset) {
    res.status(404).json({ message: "Asset not found" });
    return null;
  }
  if (asset.createdBy !== userId) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return asset as any;
}

export function registerRightsLedgerRoutes(app: Express): void {
  // ══════════════════════════════════════════════════════════════════════════
  // SL-SONG-ID assignment
  // ══════════════════════════════════════════════════════════════════════════
  app.post("/api/assets/:id/assign-sl-id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const asset = await requireAssetOwner(req, res);
      if (!asset) return;
      const existing = await storage.getSongAsset(req.params.id);
      if (existing?.slSongId) {
        res.json(existing);
        return;
      }
      const slSongId = await generateUniqueSlSongId();
      const updated = await storage.updateSongAsset(req.params.id, { slSongId } as any);

      await auditLog({
        userId,
        action: "song_asset.assign_sl_id",
        resourceType: "song_asset",
        resourceId: req.params.id,
        afterState: { slSongId },
        ipAddress: (req as any).ip,
      });

      res.json(updated);
    } catch (error) {
      console.error("[ASSIGN SL-SONG-ID ERROR]", error);
      res.status(500).json({ message: "Failed to assign SL-SONG id" });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // COMPOSITION RIGHTS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/assets/:id/composition", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const composition = await storage.getCompositionAsset(req.params.id);
      res.json(composition ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch composition rights" });
    }
  });

  app.put("/api/assets/:id/composition", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const asset = await requireAssetOwner(req, res);
      if (!asset) return;

      const body = insertCompositionAssetSchema.omit({ songAssetId: true }).parse(req.body);
      const before = await storage.getCompositionAsset(req.params.id);
      const composition = await storage.upsertCompositionAsset(req.params.id, body as any);

      await auditLog({
        userId,
        action: "composition_asset.upsert",
        resourceType: "composition_asset",
        resourceId: composition.id,
        beforeState: before,
        afterState: composition,
        ipAddress: (req as any).ip,
      });

      await recalculateLicenseReadiness(req.params.id);
      res.json(composition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[COMPOSITION UPSERT ERROR]", error);
        res.status(500).json({ message: "Failed to save composition rights" });
      }
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MASTER RIGHTS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/assets/:id/master", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const master = await storage.getMasterAsset(req.params.id);
      res.json(master ?? null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch master rights" });
    }
  });

  app.put("/api/assets/:id/master", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const asset = await requireAssetOwner(req, res);
      if (!asset) return;

      const body = insertMasterAssetSchema.omit({ songAssetId: true }).parse(req.body);
      const before = await storage.getMasterAsset(req.params.id);
      const master = await storage.upsertMasterAsset(req.params.id, body as any);

      await auditLog({
        userId,
        action: "master_asset.upsert",
        resourceType: "master_asset",
        resourceId: master.id,
        beforeState: before,
        afterState: master,
        ipAddress: (req as any).ip,
      });

      await recalculateLicenseReadiness(req.params.id);
      res.json(master);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[MASTER UPSERT ERROR]", error);
        res.status(500).json({ message: "Failed to save master rights" });
      }
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // LICENSING READINESS
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/assets/:id/license-readiness", isAuthenticated, async (req: Request, res: Response) => {
    try {
      let readiness = await storage.getLicenseReadiness(req.params.id);
      if (!readiness) {
        readiness = await recalculateLicenseReadiness(req.params.id);
      }
      const tier = tierForScore(readiness.licenseScore);
      res.json({ ...readiness, tier, tierLabel: tierLabel(tier) });
    } catch (error) {
      console.error("[LICENSE READINESS GET ERROR]", error);
      res.status(500).json({ message: "Failed to fetch license readiness" });
    }
  });

  app.post(
    "/api/assets/:id/license-readiness/recalculate",
    isAuthenticated,
    async (req: Request, res: Response) => {
      try {
        const asset = await requireAssetOwner(req, res);
        if (!asset) return;

        const readiness = await recalculateLicenseReadiness(req.params.id);
        const tier = tierForScore(readiness.licenseScore);
        res.json({ ...readiness, tier, tierLabel: tierLabel(tier) });
      } catch (error) {
        console.error("[LICENSE READINESS RECALC ERROR]", error);
        res.status(500).json({ message: "Failed to recalculate license readiness" });
      }
    }
  );

  // Manually set sample clearance status (the one input this system cannot infer automatically)
  app.patch(
    "/api/assets/:id/license-readiness/sample-clearance",
    isAuthenticated,
    async (req: Request, res: Response) => {
      const userId = (req as any).user.claims.sub;
      try {
        const asset = await requireAssetOwner(req, res);
        if (!asset) return;

        const { status } = z
          .object({ status: z.enum(["clear", "pending", "not_cleared", "not_applicable"]) })
          .parse(req.body);

        const existing = await storage.getLicenseReadiness(req.params.id);
        await storage.upsertLicenseReadiness(req.params.id, {
          ownershipComplete: existing?.ownershipComplete ?? false,
          contributorConfirmed: existing?.contributorConfirmed ?? false,
          agreementsComplete: existing?.agreementsComplete ?? false,
          metadataComplete: existing?.metadataComplete ?? false,
          sampleClearanceStatus: status,
          licenseScore: existing?.licenseScore ?? 0,
        });

        await auditLog({
          userId,
          action: "license_readiness.sample_clearance_update",
          resourceType: "song_asset",
          resourceId: req.params.id,
          beforeState: { sampleClearanceStatus: existing?.sampleClearanceStatus },
          afterState: { sampleClearanceStatus: status },
          ipAddress: (req as any).ip,
        });

        const readiness = await recalculateLicenseReadiness(req.params.id);
        const tier = tierForScore(readiness.licenseScore);
        res.json({ ...readiness, tier, tierLabel: tierLabel(tier) });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[SAMPLE CLEARANCE UPDATE ERROR]", error);
          res.status(500).json({ message: "Failed to update sample clearance status" });
        }
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // RIGHTS CHANGE HISTORY (Feature 8 — reuses audit_log, no new table)
  // ══════════════════════════════════════════════════════════════════════════
  app.get("/api/assets/:id/rights-history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const [composition, master, ownershipHistory] = await Promise.all([
        storage.getCompositionAsset(req.params.id),
        storage.getMasterAsset(req.params.id),
        storage.getOwnershipHistory(req.params.id),
      ]);
      const relatedIds = [
        ...(composition ? [composition.id] : []),
        ...(master ? [master.id] : []),
        ...ownershipHistory.map((o) => o.id),
      ];
      const history = await storage.getRightsChangeHistory(req.params.id, relatedIds);
      res.json(history);
    } catch (error) {
      console.error("[RIGHTS HISTORY ERROR]", error);
      res.status(500).json({ message: "Failed to fetch rights history" });
    }
  });
}
