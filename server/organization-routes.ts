/**
 * server/organization-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise multi-tenant workspace layer: organizations (labels, studios,
 * publishers, distributors, PROs) with a permanent SL-ORG-XXXXXXXX id,
 * role-based membership (owner/admin/member/viewer), and org-scoped API keys.
 *
 * This lets an enterprise client share one workspace, API access, and roster
 * of contributors across multiple logged-in users instead of a single
 * personal account — see .agents/memory/identity-layer.md and sl-ids.md.
 *
 * Mounted from server/routes.ts via registerOrganizationRoutes(app).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "./storage";
import { insertOrganizationSchema, ORGANIZATION_TYPES, ORGANIZATION_ROLES } from "@shared/schema";
import {
  ORG_ROLES,
  normalizeOrgRole,
  roleAtLeast,
  permissionsForRole,
} from "@shared/org-rbac";
import { generateApiKey, auditLog } from "./security";
import {
  ensurePersonalOrganization,
  resolveActiveOrganization,
  setActiveOrganization,
} from "./org-context";
import {
  requireAuth,
  requireOrganizationMembership,
  requireRole,
  requirePermission,
  type OrgAuthedRequest,
} from "./rbac-middleware";

/** Permanent external ID: SL-ORG-XXXXXXXX (never reused, generated server-side only). */
async function generateUniqueSlOrgId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = crypto.randomBytes(6).toString("hex").slice(0, 8).toUpperCase();
    const slOrgId = `SL-ORG-${shortId}`;
    const existing = await storage.getOrganizationBySlOrgId(slOrgId);
    if (!existing) return slOrgId;
  }
  return `SL-ORG-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

export function registerOrganizationRoutes(app: Express): void {
  // ══════════════════════════════════════════════════════════════════════════
  // ORGANIZATIONS
  // ══════════════════════════════════════════════════════════════════════════

  // List organizations the current user belongs to (array — backward compatible)
  app.get("/api/organizations", requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      await ensurePersonalOrganization(userId);
      const orgs = await storage.getOrganizationsForUser(userId);
      res.json(orgs);
    } catch (error) {
      console.error("[ORG LIST ERROR]", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Active tenant for the current operator session context
  app.get("/api/me/organization", requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const active = await resolveActiveOrganization(userId);
      if (!active) {
        res.status(404).json({ message: "No organization available" });
        return;
      }
      res.json({
        ...active,
        permissions: permissionsForRole(active.role),
        roles: ORG_ROLES,
      });
    } catch (error) {
      console.error("[ACTIVE ORG GET]", error);
      res.status(500).json({ message: "Failed to resolve active organization" });
    }
  });

  app.post("/api/me/organization", requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const organizationId = String(req.body?.organizationId || "");
      if (!organizationId) {
        res.status(400).json({ message: "organizationId is required" });
        return;
      }
      const active = await setActiveOrganization(userId, organizationId);
      res.json({
        ...active,
        permissions: permissionsForRole(active.role),
      });
    } catch (error: any) {
      const status = error?.status || 500;
      res.status(status).json({ message: error?.message || "Failed to set active organization" });
    }
  });

  // Create a new organization — creator is automatically added as "owner"
  app.post("/api/organizations", requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const body = insertOrganizationSchema
        .pick({ name: true, type: true, email: true, website: true, country: true })
        .extend({ type: z.enum(ORGANIZATION_TYPES) })
        .parse(req.body);

      const slOrgId = await generateUniqueSlOrgId();
      const org = await storage.createOrganization({
        ...body,
        slOrgId,
        createdBy: userId,
      } as any);

      await storage.addOrganizationMember({
        organizationId: org.id,
        userId,
        role: "owner",
        invitedBy: null,
      } as any);

      await auditLog({
        userId,
        action: "organization.create",
        resourceType: "organization",
        resourceId: org.id,
        afterState: { name: org.name, type: org.type, slOrgId: org.slOrgId },
        ipAddress: (req as any).ip,
      });

      res.status(201).json(org);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else {
        console.error("[ORG CREATE ERROR]", error);
        res.status(500).json({ message: "Failed to create organization" });
      }
    }
  });

  // Get a single organization (any member may view)
  app.get(
    "/api/organizations/:id",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    async (req: Request, res: Response) => {
      const org = await storage.getOrganization(req.params.id);
      res.json(org);
    }
  );

  // Update organization details (admin+)
  app.patch(
    "/api/organizations/:id",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requireRole("admin"),
    async (req: Request, res: Response) => {
      try {
        const updates = insertOrganizationSchema
          .pick({ name: true, email: true, website: true, country: true })
          .partial()
          .parse(req.body);
        const updated = await storage.updateOrganization(req.params.id, updates as any);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG UPDATE ERROR]", error);
          res.status(500).json({ message: "Failed to update organization" });
        }
      }
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // MEMBERS (RBAC)
  // ══════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/organizations/:id/members",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    async (req: Request, res: Response) => {
      const members = await storage.getOrganizationMembers(req.params.id);
      res.json(members);
    }
  );

  // Add a member by user id (admin+). Enterprise clients typically resolve
  // the target user id out-of-band (e.g. they've already signed up).
  app.post(
    "/api/organizations/:id/members",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requirePermission("org.members.manage"),
    async (req: Request, res: Response) => {
      const actingUserId = (req as any).user.claims.sub;
      try {
        const body = z
          .object({
            userId: z.string().min(1),
            role: z.enum(ORGANIZATION_ROLES).default("operator"),
          })
          .parse(req.body);

        const role = normalizeOrgRole(body.role) || "operator";

        const existing = await storage.getOrganizationMember(req.params.id, body.userId);
        if (existing) {
          res.status(409).json({ message: "User is already a member of this organization" });
          return;
        }

        const member = await storage.addOrganizationMember({
          organizationId: req.params.id,
          userId: body.userId,
          role,
          invitedBy: actingUserId,
        } as any);

        await auditLog({
          userId: actingUserId,
          action: "organization.member_add",
          resourceType: "organization",
          resourceId: req.params.id,
          afterState: { addedUserId: body.userId, role },
          ipAddress: (req as any).ip,
        });

        res.status(201).json(member);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG MEMBER ADD ERROR]", error);
          res.status(500).json({ message: "Failed to add member" });
        }
      }
    }
  );

  // Change a member's role — only owners can grant/revoke owner or admin
  app.patch(
    "/api/organizations/:id/members/:memberId",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requireRole("owner"),
    async (req: Request, res: Response) => {
      try {
        const { role: rawRole } = z.object({ role: z.enum(ORGANIZATION_ROLES) }).parse(req.body);
        const role = normalizeOrgRole(rawRole);
        if (!role) {
          res.status(400).json({ message: "Invalid role" });
          return;
        }
        const updated = await storage.updateOrganizationMemberRole(req.params.memberId, role);
        res.json(updated);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG MEMBER ROLE ERROR]", error);
          res.status(500).json({ message: "Failed to update member role" });
        }
      }
    }
  );

  // Remove a member (admin+); members may also remove themselves (leave org)
  app.delete(
    "/api/organizations/:id/members/:memberId",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    async (req: OrgAuthedRequest, res: Response) => {
      const members = await storage.getOrganizationMembers(req.params.id);
      const target = members.find((m) => m.id === req.params.memberId);
      if (!target) {
        res.status(404).json({ message: "Member not found" });
        return;
      }
      const isSelf = target.userId === req.orgAuth?.userId;
      if (!isSelf && !roleAtLeast(req.orgAuth?.role, "admin")) {
        res.status(403).json({ message: "Requires admin role or higher to remove other members" });
        return;
      }
      await storage.removeOrganizationMember(req.params.memberId);
      res.json({ removed: true });
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // ORGANIZATION API KEYS
  // ══════════════════════════════════════════════════════════════════════════

  app.get(
    "/api/organizations/:id/api-keys",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requireRole("admin"),
    async (req: Request, res: Response) => {
      const keys = await storage.getOrganizationApiKeys(req.params.id);
      // key_hash is never modeled/returned client-side — only prefix + metadata
      res.json(keys.map(({ keyHash, ...safe }) => safe));
    }
  );

  app.post(
    "/api/organizations/:id/api-keys",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requireRole("admin"),
    async (req: Request, res: Response) => {
      const userId = (req as any).user.claims.sub;
      try {
        const body = z
          .object({
            name: z.string().min(1).max(100),
            scopes: z.array(z.string()).min(1),
          })
          .parse(req.body);

        const { raw, hash, prefix } = generateApiKey();
        const key = await storage.createOrganizationApiKey({
          organizationId: req.params.id,
          name: body.name,
          scopes: body.scopes,
          keyHash: hash,
          keyPrefix: prefix,
          createdBy: userId,
        } as any);

        await auditLog({
          userId,
          action: "organization.api_key_create",
          resourceType: "organization",
          resourceId: req.params.id,
          afterState: { name: body.name, scopes: body.scopes, keyPrefix: prefix },
          ipAddress: (req as any).ip,
        });

        const { keyHash, ...safeKey } = key;
        res.status(201).json({ ...safeKey, rawKey: raw });
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Validation failed", issues: error.errors });
        } else {
          console.error("[ORG API KEY CREATE ERROR]", error);
          res.status(500).json({ message: "Failed to create API key" });
        }
      }
    }
  );

  app.delete(
    "/api/organizations/:id/api-keys/:keyId",
    requireAuth,
    requireOrganizationMembership({ paramKey: "id" }),
    requireRole("admin"),
    async (req: Request, res: Response) => {
      const userId = (req as any).user.claims.sub;
      await storage.revokeOrganizationApiKey(req.params.keyId, req.params.id);
      await auditLog({
        userId,
        action: "organization.api_key_revoke",
        resourceType: "organization",
        resourceId: req.params.id,
        afterState: { keyId: req.params.keyId },
        ipAddress: (req as any).ip,
      });
      res.json({ revoked: true });
    }
  );
}
