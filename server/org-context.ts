/**
 * Active organization / tenant context (Phase 3).
 * Does not replace createdBy ownership checks yet — that is Phase 5.
 * Ensures every operator has a personal org and can select an active tenant.
 */
import crypto from "crypto";
import { eq, and, isNull, sql } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { contracts, songAssets } from "@shared/schema";
import { storage } from "./storage";
import { normalizeOrgRole, type OrgRole } from "@shared/org-rbac";

export type ActiveOrgContext = {
  organizationId: string;
  role: OrgRole;
  slOrgId: string;
  name: string;
};

async function generateUniqueSlOrgId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slOrgId = `SL-ORG-${shortId}`;
    const existing = await storage.getOrganizationBySlOrgId(slOrgId);
    if (!existing) return slOrgId;
  }
  return `SL-ORG-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

/** Ensure schema columns exist even when Vercel skips full boot migrations. */
export async function ensureOrgTenantSchema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS active_organization_id varchar;
  `);
  await db.execute(sql`
    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS organization_id varchar;
  `);
  await db.execute(sql`
    ALTER TABLE song_assets
      ADD COLUMN IF NOT EXISTS organization_id varchar;
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_contracts_organization_id ON contracts (organization_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_song_assets_organization_id ON song_assets (organization_id);
  `);
  // Legacy role rename: member → operator
  await db.execute(sql`
    UPDATE organization_members SET role = 'operator' WHERE role = 'member';
  `);
  const {
    ensureContributorTokenSchema,
    ensureLegalOrgAcceptanceSchema,
    ensureOrgStripeCustomerSchema,
  } = await import("./confirmation-token-policy");
  await ensureContributorTokenSchema();
  await ensureLegalOrgAcceptanceSchema();
  await ensureOrgStripeCustomerSchema();
  const { ensureProductionFeatureSchema } = await import("./feature-schema");
  await ensureProductionFeatureSchema();
}

/**
 * Every operator gets a personal workspace org (owner) if they have none.
 * Idempotent.
 */
export async function ensurePersonalOrganization(userId: string): Promise<string> {
  await ensureOrgTenantSchema();

  const existing = await storage.getOrganizationsForUser(userId);
  if (existing.length > 0) {
    const user = await storage.getUser(userId);
    if (!user?.activeOrganizationId) {
      await storage.updateUser(userId, {
        activeOrganizationId: existing[0].id,
      } as any);
    }
    await backfillUserResourcesToOrg(userId, user?.activeOrganizationId || existing[0].id);
    return user?.activeOrganizationId || existing[0].id;
  }

  const user = await storage.getUser(userId);
  const label =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "Personal";
  const slOrgId = await generateUniqueSlOrgId();
  const org = await storage.createOrganization({
    name: `${label} Workspace`,
    type: "studio",
    email: user?.email || null,
    slOrgId,
    createdBy: userId,
  } as any);

  await storage.addOrganizationMember({
    organizationId: org.id,
    userId,
    role: "owner",
    invitedBy: null,
  } as any);

  await storage.updateUser(userId, { activeOrganizationId: org.id } as any);
  await backfillUserResourcesToOrg(userId, org.id);
  return org.id;
}

/** Attach legacy user-owned contracts/assets to their active org when unset. */
export async function backfillUserResourcesToOrg(
  userId: string,
  organizationId: string,
): Promise<void> {
  await db
    .update(contracts)
    .set({ organizationId } as any)
    .where(and(eq(contracts.createdBy, userId), isNull(contracts.organizationId)));
  await db
    .update(songAssets)
    .set({ organizationId } as any)
    .where(and(eq(songAssets.createdBy, userId), isNull(songAssets.organizationId)));
}

export async function getMembership(organizationId: string, userId: string) {
  return storage.getOrganizationMember(organizationId, userId);
}

export async function resolveActiveOrganization(
  userId: string,
): Promise<ActiveOrgContext | null> {
  await ensurePersonalOrganization(userId);
  const user = await storage.getUser(userId);
  let orgId = user?.activeOrganizationId || null;

  if (orgId) {
    const member = await getMembership(orgId, userId);
    const org = await storage.getOrganization(orgId);
    const role = normalizeOrgRole(member?.role);
    if (member && org && role) {
      return {
        organizationId: org.id,
        role,
        slOrgId: org.slOrgId,
        name: org.name,
      };
    }
  }

  const orgs = await storage.getOrganizationsForUser(userId);
  if (!orgs.length) return null;
  const fallback = orgs[0];
  await storage.updateUser(userId, { activeOrganizationId: fallback.id } as any);
  const member = await getMembership(fallback.id, userId);
  const role = normalizeOrgRole(member?.role) || "viewer";
  return {
    organizationId: fallback.id,
    role,
    slOrgId: fallback.slOrgId,
    name: fallback.name,
  };
}

export async function setActiveOrganization(
  userId: string,
  organizationId: string,
): Promise<ActiveOrgContext> {
  const member = await getMembership(organizationId, userId);
  if (!member) {
    throw Object.assign(new Error("Not a member of this organization"), { status: 403 });
  }
  const org = await storage.getOrganization(organizationId);
  if (!org) {
    throw Object.assign(new Error("Organization not found"), { status: 404 });
  }
  const role = normalizeOrgRole(member.role);
  if (!role) {
    throw Object.assign(new Error("Invalid organization role"), { status: 400 });
  }
  await storage.updateUser(userId, { activeOrganizationId: organizationId } as any);
  return {
    organizationId: org.id,
    role,
    slOrgId: org.slOrgId,
    name: org.name,
  };
}

/** Express helper: attaches req.activeOrg after auth. */
export function attachActiveOrganization() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return next();
      const active = await resolveActiveOrganization(userId);
      (req as any).activeOrg = active;
      next();
    } catch (err) {
      console.error("[org-context]", err);
      next();
    }
  };
}
