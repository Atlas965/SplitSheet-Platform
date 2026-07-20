/**
 * server/creator-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Creator Registry — finishes the identity-layer work already described in
 * .agents/memory/identity-layer.md: a permanent roster of songwriters,
 * producers, artists, and publishers, each assigned a permanent
 * SL-CREATOR-XXXXXXXX id. The frontend (client/src/pages/creators.tsx,
 * client/src/pages/creator-detail.tsx) was already fully built against this
 * API — this file is what makes it actually work.
 *
 * Mirrors the SL-ID generation + audit logging pattern established in
 * server/organization-routes.ts.
 *
 * Mounted from server/routes.ts via registerCreatorRoutes(app).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { insertCreatorSchema } from "@shared/schema";
import { auditLog } from "./security";

/** Permanent external ID: SL-CREATOR-XXXXXXXX (never reused, generated server-side only). */
async function generateUniqueSlCreatorId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slCreatorId = `SL-CREATOR-${shortId}`;
    const existing = await storage.getCreatorBySlCreatorId(slCreatorId);
    if (!existing) return slCreatorId;
  }
  return `SL-CREATOR-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

export function registerCreatorRoutes(app: Express): void {
  // List creators registered by the current user
  app.get("/api/creators", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const list = await storage.getCreators(userId);
      res.json(list);
    } catch (error) {
      console.error("[CREATORS LIST ERROR]", error);
      res.status(500).json({ message: "Failed to fetch creators" });
    }
  });

  // Register a new creator — a permanent SL-CREATOR id is assigned automatically
  app.post("/api/creators", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const body = insertCreatorSchema.parse(req.body);
      const slCreatorId = await generateUniqueSlCreatorId();
      const creator = await storage.createCreator({
        ...body,
        slCreatorId,
        createdBy: userId,
      });

      await auditLog({
        userId,
        action: "creator.create",
        resourceType: "creator",
        resourceId: creator.id,
        afterState: { name: creator.name, type: creator.type, slCreatorId: creator.slCreatorId },
        ipAddress: (req as any).ip,
      });

      res.status(201).json(creator);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[CREATOR CREATE ERROR]", error);
        res.status(500).json({ message: "Failed to create creator" });
      }
    }
  });

  // Get a single creator (owner only)
  app.get("/api/creators/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const creator = await storage.getCreator(req.params.id);
      if (!creator) {
        res.status(404).json({ message: "Creator not found" });
        return;
      }
      if (creator.createdBy !== userId) {
        res.status(403).json({ message: "You do not have access to this creator" });
        return;
      }
      res.json(creator);
    } catch (error) {
      console.error("[CREATOR GET ERROR]", error);
      res.status(500).json({ message: "Failed to fetch creator" });
    }
  });

  // Update a creator (owner only)
  app.patch("/api/creators/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const existing = await storage.getCreator(req.params.id);
      if (!existing) {
        res.status(404).json({ message: "Creator not found" });
        return;
      }
      if (existing.createdBy !== userId) {
        res.status(403).json({ message: "You do not have access to this creator" });
        return;
      }

      const updates = insertCreatorSchema.partial().parse(req.body);
      const updated = await storage.updateCreator(req.params.id, updates);

      await auditLog({
        userId,
        action: "creator.update",
        resourceType: "creator",
        resourceId: req.params.id,
        beforeState: existing,
        afterState: updated,
        ipAddress: (req as any).ip,
      });

      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[CREATOR UPDATE ERROR]", error);
        res.status(500).json({ message: "Failed to update creator" });
      }
    }
  });

  // Remove a creator (owner only)
  app.delete("/api/creators/:id", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const existing = await storage.getCreator(req.params.id);
      if (!existing) {
        res.status(404).json({ message: "Creator not found" });
        return;
      }
      if (existing.createdBy !== userId) {
        res.status(403).json({ message: "You do not have access to this creator" });
        return;
      }

      await storage.deleteCreator(req.params.id);

      await auditLog({
        userId,
        action: "creator.delete",
        resourceType: "creator",
        resourceId: req.params.id,
        beforeState: { name: existing.name, slCreatorId: existing.slCreatorId },
        ipAddress: (req as any).ip,
      });

      res.json({ deleted: true });
    } catch (error) {
      console.error("[CREATOR DELETE ERROR]", error);
      res.status(500).json({ message: "Failed to delete creator" });
    }
  });
}
