/**
 * Shared resource authorization helpers.
 * Phase 5: prefer organization_id match to the caller's active org.
 * Legacy unstamped rows (organization_id NULL) fall back to createdBy.
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { contractCollaborators, revenueEvents, songAssets } from "@shared/schema";
import { storage } from "./storage";
import { resolveActiveOrganization } from "./org-context";
import type { OrgAuthedRequest } from "./rbac-middleware";

export function sessionUserId(req: Request): string | undefined {
  return (req as any).user?.claims?.sub;
}

/** Active org from Phase 4 middleware, else resolve from session. */
export async function resolveRequestOrgId(req: Request): Promise<string | null> {
  const attached = (req as OrgAuthedRequest).orgAuth?.organizationId;
  if (attached) return attached;
  const userId = sessionUserId(req);
  if (!userId) return null;
  const active = await resolveActiveOrganization(userId);
  return active?.organizationId ?? null;
}

/**
 * Tenant check for a resource that may carry organizationId.
 * - Stamped: must match caller's active organization.
 * - Unstamped legacy: creator only (until backfill).
 */
export function resourceBelongsToOrg(
  resource: { organizationId?: string | null; createdBy?: string | null },
  activeOrgId: string | null | undefined,
  userId: string,
): boolean {
  if (resource.organizationId) {
    return !!activeOrgId && resource.organizationId === activeOrgId;
  }
  return resource.createdBy === userId;
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
  const orgId = await resolveRequestOrgId(req);
  if (!resourceBelongsToOrg(contract, orgId, userId)) {
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
  const orgId = await resolveRequestOrgId(req);
  if (!resourceBelongsToOrg(asset, orgId, userId)) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return asset;
}

/** Revenue event must belong to an asset in the caller's active org. */
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
      organizationId: songAssets.organizationId,
    })
    .from(revenueEvents)
    .innerJoin(songAssets, eq(revenueEvents.assetId, songAssets.id))
    .where(eq(revenueEvents.id, eventId))
    .limit(1);

  if (!row) {
    res.status(404).json({ message: "Revenue event not found" });
    return null;
  }
  const orgId = await resolveRequestOrgId(req);
  if (!resourceBelongsToOrg(row, orgId, userId)) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return row;
}

/** Collaborator (client) must sit on a contract in the caller's active org. */
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
  const orgId = await resolveRequestOrgId(req);
  if (!contract || !resourceBelongsToOrg(contract, orgId, userId)) {
    res.status(403).json({ message: "Access denied" });
    return null;
  }
  return { collaborator: row, contract };
}

/**
 * Read access for a contract: org member (active org) OR legacy creator OR registered collaborator.
 */
export async function canReadContract(
  req: Request,
  contractId: string,
): Promise<{ ok: true; contract: NonNullable<Awaited<ReturnType<typeof storage.getContract>>> } | { ok: false; status: 401 | 403 | 404; message: string }> {
  const userId = sessionUserId(req);
  if (!userId) return { ok: false, status: 401, message: "Unauthorized" };
  const contract = await storage.getContract(contractId);
  if (!contract) return { ok: false, status: 404, message: "Contract not found" };
  const orgId = await resolveRequestOrgId(req);
  if (resourceBelongsToOrg(contract, orgId, userId)) {
    return { ok: true, contract };
  }
  const collaborators = await storage.getContractCollaborators(contractId);
  if (collaborators.some((c) => c.userId === userId)) {
    return { ok: true, contract };
  }
  return { ok: false, status: 403, message: "Access denied" };
}
