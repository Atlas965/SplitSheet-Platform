/**
 * B2B2C service routes — operators manage clients/projects; contributors confirm via public links.
 * Projects map to contracts; contributors map to contract_collaborators.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { requireOwnedCollaborator, resourceBelongsToOrg, resolveRequestOrgId } from "./authz-helpers";
import { requireActivePermission } from "./rbac-middleware";
import { storage } from "./storage";
import { db } from "./db";
import type { Contract } from "@shared/schema";
import type { OrgAuthedRequest } from "./rbac-middleware";
import { confirmationExpiresAt, generateConfirmationToken, opaqueConfirmUrl } from "./confirmation-url";
import {
  evaluateEvent,
  getProjectWorkflow,
  loadWorkflowSnapshot,
  recordWorkflowEvent,
  RSEE_ACTIONS,
} from "./rights-state-engine";
import { validateSplits } from "@shared/split-validation";
import {
  assertUnderLimit,
  contributorLimitForTier,
  projectLimitForTier,
} from "@shared/plan-limits";

function generateToken(): string {
  return generateConfirmationToken();
}

function expiresAt72h(): Date {
  return confirmationExpiresAt();
}

function projectStatusFromContract(status?: string | null): string {
  switch (status) {
    case "signed":
    case "active":
      return "confirmed";
    case "pending":
      return "pending_confirmation";
    case "cancelled":
      return "archived";
    default:
      return "draft";
  }
}

function contractStatusFromProject(status: string): string {
  switch (status) {
    case "confirmed":
      return "signed";
    case "pending_confirmation":
      return "pending";
    case "archived":
      return "cancelled";
    default:
      return "draft";
  }
}

function contractToProject(contract: Contract) {
  const data = (contract.data ?? {}) as Record<string, unknown>;
  return {
    id: contract.id,
    title: contract.title,
    songTitle: (data.songTitle as string) ?? contract.title,
    clientId: (data.clientId as string) ?? null,
    status: projectStatusFromContract(contract.status),
    notes: (data.notes as string) ?? null,
    type: contract.type,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

type ContractOwnerResult =
  | { ok: false; error: string; status: number }
  | { ok: true; contract: Contract };

async function assertContractAccess(
  req: OrgAuthedRequest,
  contractId: string,
  userId: string,
): Promise<ContractOwnerResult> {
  const contract = await storage.getContract(contractId);
  if (!contract) return { ok: false, error: "Project not found", status: 404 };
  const orgId = req.orgAuth?.organizationId ?? (await resolveRequestOrgId(req));
  if (!resourceBelongsToOrg(contract, orgId, userId)) {
    return { ok: false, error: "Not authorized", status: 403 };
  }
  return { ok: true, contract };
}

async function buildClientList(userId: string, organizationId?: string | null) {
  const userContracts = organizationId
    ? await storage.getContractsForOrganization(organizationId, userId)
    : await storage.getContracts(userId);
  const clientMap = new Map<string, Record<string, unknown>>();
  for (const contract of userContracts) {
    const collabs = await storage.getContractCollaborators(contract.id);
    for (const collab of collabs) {
      const key = collab.email ?? collab.name;
      if (!key) continue;
      if (clientMap.has(key)) {
        const existing = clientMap.get(key)!;
        existing.contractCount = (existing.contractCount as number) + 1;
      } else {
        clientMap.set(key, {
          id: collab.id,
          name: collab.name,
          email: collab.email ?? null,
          phone: null,
          type: collab.role ?? "artist",
          role: collab.role,
          status: collab.status,
          notes: null,
          contractCount: 1,
          lastActivity: contract.updatedAt ?? contract.createdAt,
          createdAt: collab.createdAt,
        });
      }
    }
  }
  return Array.from(clientMap.values());
}

async function ensureOperatorClientsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS operator_clients (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar,
      created_by varchar NOT NULL,
      name varchar NOT NULL,
      email varchar,
      phone varchar,
      type varchar DEFAULT 'artist',
      notes text,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
}

async function listRosterClients(userId: string, organizationId?: string | null) {
  await ensureOperatorClientsTable();
  const rows = organizationId
    ? await db.execute(sql`
        SELECT id, name, email, phone, type, notes, created_at, created_by
        FROM operator_clients
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
      `)
    : await db.execute(sql`
        SELECT id, name, email, phone, type, notes, created_at, created_by
        FROM operator_clients
        WHERE created_by = ${userId} AND organization_id IS NULL
        ORDER BY created_at DESC
      `);
  return (rows.rows as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    type: (r.type as string) ?? "artist",
    role: (r.type as string) ?? "artist",
    notes: (r.notes as string) ?? null,
    contractCount: 0,
    lastActivity: r.created_at,
    createdAt: r.created_at,
    source: "roster",
  }));
}

const contributorSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  role: z.string().min(1).max(100),
  pro: z.string().max(50).optional(),
  ipi: z.string().max(20).optional(),
  ownershipPercentage: z.union([z.string(), z.number()]),
});

export function registerServiceRoutes(app: Express): void {
  // ── Workflow status for operator dashboard ────────────────────────────────
  app.get("/api/workflow/status", isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = await resolveRequestOrgId(req);
      const userContracts = orgId
        ? await storage.getContractsForOrganization(orgId, userId)
        : await storage.getContracts(userId);
      let totalContributors = 0;
      let pendingConfirmations = 0;
      let confirmedProjects = 0;

      for (const contract of userContracts) {
        const collabs = await storage.getContractCollaborators(contract.id);
        totalContributors += collabs.length;
        if (contract.status === "signed" || contract.status === "active") {
          confirmedProjects += 1;
        } else if (contract.status === "pending") {
          pendingConfirmations += 1;
        }
      }

      const roster = await listRosterClients(userId, orgId);
      const derived = await buildClientList(userId, orgId);
      const clients = roster.length + derived.length;
      res.json({
        clients,
        projects: userContracts.length,
        contributors: totalContributors,
        pendingConfirmations,
        confirmedProjects,
        stages: [
          { id: "intake", label: "Project created", complete: userContracts.length > 0, href: "/projects" },
          { id: "splits", label: "Splits set", complete: totalContributors > 0, href: "/projects" },
          { id: "confirm", label: "Confirmation", complete: pendingConfirmations > 0 || confirmedProjects > 0, href: "/projects" },
          { id: "ledger", label: "Rights Ledger", complete: confirmedProjects > 0, href: "/ownership" },
        ],
      });
    } catch (error) {
      console.error("[WORKFLOW STATUS]", error);
      res.status(500).json({ message: "Failed to load workflow status" });
    }
  });

  // ── Clients (derived from collaborators) ────────────────────────────────────
  app.get("/api/clients", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const roster = await listRosterClients(userId, req.orgAuth?.organizationId);
      const derived = await buildClientList(userId, req.orgAuth?.organizationId);
      const seen = new Set(
        roster.map((c) => (c.email || c.name).toLowerCase()).filter(Boolean),
      );
      const extras = derived.filter((c) => {
        const key = String(c.email || c.name || "").toLowerCase();
        return key && !seen.has(key);
      });
      res.json([...roster, ...extras]);
    } catch (error) {
      console.error("[CLIENTS LIST]", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const name = String(req.body?.name ?? "").trim();
      if (!name) {
        res.status(400).json({ message: "Client name is required." });
        return;
      }
      await ensureOperatorClientsTable();
      const orgId = req.orgAuth?.organizationId ?? null;
      const inserted = await db.execute(sql`
        INSERT INTO operator_clients (organization_id, created_by, name, email, phone, type, notes)
        VALUES (
          ${orgId},
          ${userId},
          ${name},
          ${String(req.body?.email ?? "").trim() || null},
          ${String(req.body?.phone ?? "").trim() || null},
          ${String(req.body?.type ?? "artist")},
          ${String(req.body?.notes ?? "").trim() || null}
        )
        RETURNING id, name, email, phone, type, notes, created_at
      `);
      const row = inserted.rows[0] as Record<string, unknown>;
      res.status(201).json({
        id: row.id,
        name: row.name,
        email: row.email ?? null,
        phone: row.phone ?? null,
        type: row.type,
        role: row.type,
        notes: row.notes ?? null,
        contractCount: 0,
        createdAt: row.created_at,
        source: "roster",
      });
    } catch (error) {
      console.error("[CLIENTS CREATE]", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.get("/api/clients/:id", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const roster = await listRosterClients(userId, req.orgAuth?.organizationId);
      const derived = await buildClientList(userId, req.orgAuth?.organizationId);
      const client = [...roster, ...derived].find((c) => c.id === req.params.id);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.get("/api/clients/:id/projects", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const roster = await listRosterClients(userId, req.orgAuth?.organizationId);
      const derived = await buildClientList(userId, req.orgAuth?.organizationId);
      const client = [...roster, ...derived].find((c) => c.id === req.params.id);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      const userContracts = req.orgAuth?.organizationId
        ? await storage.getContractsForOrganization(req.orgAuth.organizationId, userId)
        : await storage.getContracts(userId);
      const email = client.email as string | null;
      const name = client.name as string;
      const projects = [];
      for (const contract of userContracts) {
        const data = (contract.data ?? {}) as Record<string, unknown>;
        const collabs = await storage.getContractCollaborators(contract.id);
        const match =
          data.clientId === req.params.id ||
          collabs.some(
            (c) => c.id === req.params.id || c.email === email || c.name === name,
          );
        if (match) projects.push(contractToProject(contract));
      }
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client projects" });
    }
  });

  app.patch("/api/clients/:id", ...requireActivePermission("client.manage"), async (req: any, res: Response) => {
    try {
      const owned = await requireOwnedCollaborator(req, res, req.params.id);
      if (!owned) return;

      const { name, email, role, type } = req.body ?? {};
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (email !== undefined) updates.email = email || null;
      if (role || type) updates.role = role ?? type;
      if (!Object.keys(updates).length) {
        res.status(400).json({ message: "No updates provided" });
        return;
      }
      const updated = await storage.updateContractCollaborator(req.params.id, updates);
      res.json({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: null,
        type: updated.role,
        notes: null,
        createdAt: updated.createdAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // ── Projects (contract alias) ───────────────────────────────────────────────
  app.post("/api/projects", ...requireActivePermission("project.create"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const title = String(req.body?.title ?? req.body?.songTitle ?? "").trim();
      if (!title) {
        res.status(400).json({ message: "Project title is required." });
        return;
      }
      const user = await storage.getUser(userId);
      const existing = req.orgAuth?.organizationId
        ? await storage.getContractsForOrganization(req.orgAuth.organizationId, userId)
        : await storage.getContracts(userId);
      const limit = projectLimitForTier(user?.subscriptionTier);
      const gate = assertUnderLimit(existing.length, limit, "projects");
      if (!gate.ok) {
        res.status(402).json({ message: gate.message, code: "PLAN_LIMIT" });
        return;
      }
      const created = await storage.createContract({
        title,
        type: "split-sheet",
        status: "draft",
        createdBy: userId,
        organizationId: req.orgAuth?.organizationId ?? null,
        data: {
          songTitle: String(req.body?.songTitle ?? title).trim(),
          notes: String(req.body?.notes ?? "").trim() || null,
          clientId: req.body?.clientId ?? null,
        },
      } as any);
      res.status(201).json(contractToProject(created));
    } catch (error) {
      console.error("[PROJECTS CREATE]", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects", ...requireActivePermission("project.read"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const userContracts = req.orgAuth?.organizationId
        ? await storage.getContractsForOrganization(req.orgAuth.organizationId, userId)
        : await storage.getContracts(userId);
      const projects = await Promise.all(
        userContracts.map(async (contract) => {
          const collabs = await storage.getContractCollaborators(contract.id);
          return {
            ...contractToProject(contract),
            collaboratorCount: collabs.length,
            collaborators: collabs.map((c) => ({
              name: c.name,
              role: c.role,
              ownershipPercentage: Number(c.ownershipPercentage ?? 0),
            })),
          };
        }),
      );
      res.json(projects);
    } catch (error) {
      console.error("[PROJECTS LIST]", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", ...requireActivePermission("project.read"), async (req: any, res: Response) => {
    try {
      const result = await assertContractAccess(req, req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      res.json(contractToProject(result.contract));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", ...requireActivePermission("project.update"), async (req: any, res: Response) => {
    try {
      const result = await assertContractAccess(req, req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const { title, songTitle, status, notes, clientId } = req.body ?? {};
      const data = { ...(result.contract.data as Record<string, unknown>) };
      if (songTitle !== undefined) data.songTitle = songTitle;
      if (notes !== undefined) data.notes = notes;
      if (clientId !== undefined) data.clientId = clientId;
      const updates: Partial<Contract> = { data };
      if (title) updates.title = title;
      if (status) updates.status = contractStatusFromProject(status);
      const updated = await storage.updateContract(req.params.id, updates);
      res.json(contractToProject(updated));
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.get("/api/projects/:id/contributors", ...requireActivePermission("project.read"), async (req: any, res: Response) => {
    try {
      const result = await assertContractAccess(req, req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const collabs = await storage.getContractCollaborators(req.params.id);
      const enriched = await Promise.all(
        collabs.map(async (c) => {
          const confRows = await db.execute(sql`
            SELECT token, status, confirmed_at, expires_at
            FROM split_confirmations
            WHERE contract_id = ${req.params.id} AND collaborator_id = ${c.id}
            LIMIT 1
          `);
          const conf = confRows.rows[0] as Record<string, unknown> | undefined;
          const data = (result.contract.data as Record<string, unknown>) ?? {};
          const extras = (data.contributorMeta as Record<string, Record<string, string>>)?.[c.id] ?? {};
          return {
            id: c.id,
            projectId: req.params.id,
            name: c.name,
            email: c.email,
            role: c.role,
            pro: extras.pro ?? null,
            ipi: extras.ipi ?? null,
            ownershipPercentage: String(c.ownershipPercentage ?? "0"),
            confirmationToken: (conf?.token as string) ?? null,
            confirmedAt: (conf?.confirmed_at as string) ?? c.signedAt ?? null,
            status: c.status,
            createdAt: c.createdAt,
          };
        }),
      );
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contributors" });
    }
  });

  app.post("/api/projects/:id/contributors", ...requireActivePermission("project.update"), async (req: any, res: Response) => {
    try {
      const parsed = contributorSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: "Invalid contributor data", issues: parsed.error.issues });
        return;
      }
      const result = await assertContractAccess(req, req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const operator = await storage.getUser(req.user.claims.sub);
      const existingCollabs = await storage.getContractCollaborators(req.params.id);
      const contribLimit = contributorLimitForTier(operator?.subscriptionTier);
      const contribGate = assertUnderLimit(existingCollabs.length, contribLimit, "contributors");
      if (!contribGate.ok) {
        res.status(402).json({ message: contribGate.message, code: "PLAN_LIMIT" });
        return;
      }
      const { name, email, role, pro, ipi, ownershipPercentage } = parsed.data;
      const collab = await storage.addContractCollaborator({
        contractId: req.params.id,
        name,
        email: email || null,
        role,
        ownershipPercentage: String(ownershipPercentage),
        status: "pending",
      });
      if (pro || ipi) {
        const data = { ...(result.contract.data as Record<string, unknown>) };
        const meta = (data.contributorMeta as Record<string, Record<string, string>>) ?? {};
        meta[collab.id] = { pro: pro ?? "", ipi: ipi ?? "" };
        data.contributorMeta = meta;
        await storage.updateContract(req.params.id, { data });
      }
      res.status(201).json({
        id: collab.id,
        projectId: req.params.id,
        name: collab.name,
        email: collab.email,
        role: collab.role,
        pro: pro ?? null,
        ipi: ipi ?? null,
        ownershipPercentage: String(collab.ownershipPercentage ?? "0"),
        confirmationToken: null,
        confirmedAt: null,
        createdAt: collab.createdAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to add contributor" });
    }
  });

  app.patch("/api/projects/:id/contributors/:contribId", ...requireActivePermission("project.update"), async (req: any, res: Response) => {
    try {
      const result = await assertContractAccess(req, req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const { name, email, role, pro, ipi, ownershipPercentage } = req.body ?? {};
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (email !== undefined) updates.email = email || null;
      if (role) updates.role = role;
      if (ownershipPercentage !== undefined) updates.ownershipPercentage = String(ownershipPercentage);
      const updated = await storage.updateContractCollaborator(req.params.contribId, updates);
      if (pro !== undefined || ipi !== undefined) {
        const data = { ...(result.contract.data as Record<string, unknown>) };
        const meta = (data.contributorMeta as Record<string, Record<string, string>>) ?? {};
        meta[req.params.contribId] = {
          pro: pro ?? meta[req.params.contribId]?.pro ?? "",
          ipi: ipi ?? meta[req.params.contribId]?.ipi ?? "",
        };
        data.contributorMeta = meta;
        await storage.updateContract(req.params.id, { data });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contributor" });
    }
  });

  app.delete("/api/projects/:id/contributors/:contribId", ...requireActivePermission("project.update"), async (req: any, res: Response) => {
    try {
      const result = await assertContractAccess(req, req.params.id, req.user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      await storage.deleteContractCollaborator(req.params.contribId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove contributor" });
    }
  });

  app.post("/api/projects/:id/send-confirmations", ...requireActivePermission("agreement.send"), async (req: Request, res: Response) => {
    const contractId = req.params.id;
    const userId = (req as any).user?.claims?.sub;
    try {
      const result = await assertContractAccess(req, contractId, userId);
      if ("error" in result) {
        res.status(result.status).json({ error: result.error });
        return;
      }
      const collabs = await storage.getContractCollaborators(contractId);
      if (!collabs.length) {
        res.status(400).json({ error: "Add at least one contributor before sending confirmation links." });
        return;
      }
      const validation = validateSplits(
        collabs.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.role,
          ownershipPercentage: c.ownershipPercentage,
        })),
      );
      if (!validation.valid) {
        res.status(400).json({
          error: validation.errors[0]?.message ?? "Splits must total 100% before sending links.",
          code: validation.errors[0]?.code ?? "SPLIT_TOTAL_INVALID",
          validation,
        });
        return;
      }
      const snapshot = await loadWorkflowSnapshot(contractId);
      if (snapshot) {
        const allowed = evaluateEvent(snapshot, "REQUEST_CONFIRMATIONS");
        if (!allowed.ok) {
          res.status(400).json({
            error: allowed.error,
            code: allowed.code,
            validation: allowed.validation,
          });
          return;
        }
      }

      const expires = expiresAt72h();
      const baseUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
      const links = [];

      for (const collab of collabs) {
        const existing = await db.execute(sql`
          SELECT id, token, status FROM split_confirmations
          WHERE contract_id = ${contractId} AND collaborator_id = ${collab.id}
          LIMIT 1
        `);
        let token: string;
        if (existing.rows.length > 0) {
          const row = existing.rows[0] as Record<string, unknown>;
          token = row.token as string;
          await db.execute(sql`
            UPDATE split_confirmations SET expires_at = ${expires}, updated_at = NOW() WHERE id = ${row.id}
          `);
        } else {
          token = generateToken();
          await db.execute(sql`
            INSERT INTO split_confirmations (contract_id, collaborator_id, token, status, expires_at)
            VALUES (${contractId}, ${collab.id}, ${token}, 'not_sent', ${expires})
          `);
        }
        links.push({
          collaboratorId: collab.id,
          name: collab.name,
          email: collab.email,
          link: opaqueConfirmUrl(baseUrl, token),
          confirmUrl: opaqueConfirmUrl(baseUrl, token),
          id: collab.id,
        });
      }

      await storage.updateContract(contractId, { status: "pending" });
      await recordWorkflowEvent({
        action: RSEE_ACTIONS.CONFIRMATION_REQUESTED,
        projectId: contractId,
        previousState: snapshot ? "AGREEMENT_READY" : "AGREEMENT_READY",
        newState: "CONFIRMATION_REQUESTED",
        actorType: "operator",
        actorId: userId,
        req,
      });
      res.json({
        success: true,
        confirmations: links,
        contributors: links.map((l) => ({
          id: l.id,
          name: l.name,
          email: l.email,
          confirmUrl: l.confirmUrl,
        })),
      });
    } catch (error) {
      console.error("[SEND CONFIRMATIONS]", error);
      res.status(500).json({ error: "Failed to generate confirmation links" });
    }
  });

  app.get("/api/projects/:id/workflow", ...requireActivePermission("project.read"), async (req: Request, res: Response) => {
    try {
      const result = await assertContractAccess(req, req.params.id, (req as any).user.claims.sub);
      if ("error" in result) {
        res.status(result.status).json({ message: result.error });
        return;
      }
      const workflow = await getProjectWorkflow(req.params.id);
      if (!workflow) {
        res.status(404).json({ message: "Project not found" });
        return;
      }
      res.json(workflow);
    } catch (error) {
      console.error("[GET-PROJECT-WORKFLOW]", error);
      res.status(500).json({ message: "Failed to load workflow status" });
    }
  });

  // Production health check (public)
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "development",
    });
  });
}
