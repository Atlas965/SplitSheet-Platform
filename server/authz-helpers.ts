/**
 * Shared ownership checks for Phase 1 authz hardening.
 * Prefer these over ad-hoc id lookups that skip tenant/owner checks.
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { contractCollaborators, revenueEvents, songAssets } from "@shared/schema";
import { storage } from "./storage";

export function sessionUserId(req: Request): string | undefined {
  return (req as any).user?.claims?.sub;
}

export async function requireOwnedContract(req: Request, res: Response, contractId: string) {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const contract = await storage.getContract(contractId);
  if (!contract) {
    res.status(404).json({ message: "Contract not found" });
    return null;
  }
  if (contract.createdBy !== userId) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return contract;
}

export async function requireOwnedAsset(req: Request, res: Response, assetId: string) {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const asset = await storage.getSongAsset(assetId);
  if (!asset) {
    res.status(404).json({ message: "Asset not found" });
    return null;
  }
  if (asset.createdBy !== userId) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return asset;
}

/** Revenue event must belong to an asset owned by the caller. */
export async function requireOwnedRevenueEvent(
  req: Request,
  res: Response,
  eventId: string,
) {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const [row] = await db
    .select({
      eventId: revenueEvents.id,
      assetId: revenueEvents.assetId,
      createdBy: songAssets.createdBy,
    })
    .from(revenueEvents)
    .innerJoin(songAssets, eq(revenueEvents.assetId, songAssets.id))
    .where(eq(revenueEvents.id, eventId))
    .limit(1);

  if (!row) {
    res.status(404).json({ message: "Revenue event not found" });
    return null;
  }
  if (row.createdBy !== userId) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return row;
}

/** Collaborator (client) must sit on a contract owned by the caller. */
export async function requireOwnedCollaborator(
  req: Request,
  res: Response,
  collaboratorId: string,
) {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ message: "Unauthorized" });
    return null;
  }
  const [row] = await db
    .select()
    .from(contractCollaborators)
    .where(eq(contractCollaborators.id, collaboratorId))
    .limit(1);
  if (!row) {
    res.status(404).json({ message: "Client not found" });
    return null;
  }
  const contract = await storage.getContract(row.contractId);
  if (!contract || contract.createdBy !== userId) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return { collaborator: row, contract };
}
