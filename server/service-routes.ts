/**
 * B2B2C service routes — operators manage clients/projects; contributors confirm via public links.
 * Projects map to contracts; contributors map to contract_collaborators.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import { resourceBelongsToOrg, resolveRequestOrgId } from "./authz-helpers";
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
import {
  clientDuplicateKey,
  clientProfileSchema,
  parseClientCsv,
  parseOptionalPercent,
} from "@shared/client-profile";
import { logger } from "./logger";
import { MAX_EMAILS_PER_REQUEST, parseBulkProjectIds, type ConfirmationSendMode } from "@shared/confirmation-send";
import { dispatchPendingConfirmations, summarizeDispatch } from "./confirmation-dispatch";

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
          company: null,
          type: collab.role ?? "artist",
          role: collab.role,
          status: collab.status,
          notes: null,
          defaultOwnershipPercentage: collab.ownershipPercentage != null
            ? Number(collab.ownershipPercentage)
            : null,
          defaultRoyaltyPercentage: null,
          contractCount: 1,
          lastActivity: contract.updatedAt ?? contract.createdAt,
          createdAt: collab.createdAt,
          source: "project",
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
      company varchar,
      type varchar DEFAULT 'artist',
      notes text,
      default_ownership_percentage decimal(5, 2),
      default_royalty_percentage decimal(5, 2),
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )
  `);
  await db.execute(sql`
    ALTER TABLE operator_clients
      ADD COLUMN IF NOT EXISTS company varchar,
      ADD COLUMN IF NOT EXISTS default_ownership_percentage decimal(5, 2),
      ADD COLUMN IF NOT EXISTS default_royalty_percentage decimal(5, 2);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_operator_clients_created_by ON operator_clients (created_by);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_operator_clients_created_by_email ON operator_clients (created_by, email);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_operator_clients_organization_id ON operator_clients (organization_id);
  `);
}

async function listRosterClients(userId: string, organizationId?: string | null) {
  await ensureOperatorClientsTable();
  const rows = organizationId
    ? await db.execute(sql`
        SELECT id, name, email, phone, company, type, notes,
               default_ownership_percentage, default_royalty_percentage,
               created_at, created_by
        FROM operator_clients
        WHERE organization_id = ${organizationId}
        ORDER BY created_at DESC
      `)
    : await db.execute(sql`
        SELECT id, name, email, phone, company, type, notes,
               default_ownership_percentage, default_royalty_percentage,
               created_at, created_by
        FROM operator_clients
        WHERE created_by = ${userId} AND organization_id IS NULL
        ORDER BY created_at DESC
      `);
  return (rows.rows as Record<string, unknown>[]).map((r) => mapRosterRow(r));
}

function mapRosterRow(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    name: String(r.name),
    email: (r.email as string) ?? null,
    phone: (r.phone as string) ?? null,
    company: (r.company as string) ?? null,
    type: (r.type as string) ?? "artist",
    role: (r.type as string) ?? "artist",
    notes: (r.notes as string) ?? null,
    defaultOwnershipPercentage: r.default_ownership_percentage != null
      ? Number(r.default_ownership_percentage)
      : null,
    defaultRoyaltyPercentage: r.default_royalty_percentage != null
      ? Number(r.default_royalty_percentage)
      : null,
    contractCount: 0,
    lastActivity: r.created_at,
    createdAt: r.created_at,
    source: "roster" as const,
  };
}

async function findOwnedClient(
  userId: string,
  organizationId: string | null | undefined,
  id: string,
) {
  const roster = await listRosterClients(userId, organizationId);
  const derived = await buildClientList(userId, organizationId);
  return [...roster, ...derived].find((c) => c.id === id) ?? null;
}

type ParsedClientProfile = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  type: string;
  notes: string | null;
  ownership: number | null;
  royalty: number | null;
};

function parseClientBody(body: unknown): { ok: true; data: ParsedClientProfile } | { ok: false; message: string } {
  const parsed = clientProfileSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid client data." };
  }
  try {
    return {
      ok: true,
      data: {
        name: parsed.data.name,
        email: parsed.data.email?.trim() || null,
        phone: parsed.data.phone?.trim() || null,
        company: parsed.data.company?.trim() || null,
        type: (parsed.data.role || parsed.data.type || "artist").trim(),
        notes: parsed.data.notes?.trim() || null,
        ownership: parseOptionalPercent(parsed.data.defaultOwnershipPercentage, "Default ownership"),
        royalty: parseOptionalPercent(parsed.data.defaultRoyaltyPercentage, "Default royalty"),
      },
    };
  } catch (err: any) {
    return { ok: false, message: err.message };
  }
}

async function insertRosterClient(
  userId: string,
  organizationId: string | null,
  data: ParsedClientProfile,
) {
  await ensureOperatorClientsTable();
  const inserted = await db.execute(sql`
    INSERT INTO operator_clients (
      organization_id, created_by, name, email, phone, company, type, notes,
      default_ownership_percentage, default_royalty_percentage
    ) VALUES (
      ${organizationId},
      ${userId},
      ${data.name},
      ${data.email},
      ${data.phone},
      ${data.company},
      ${data.type},
      ${data.notes},
      ${data.ownership},
      ${data.royalty}
    )
    RETURNING id, name, email, phone, company, type, notes,
              default_ownership_percentage, default_royalty_percentage,
              created_at, created_by
  `);
  return mapRosterRow(inserted.rows[0] as Record<string, unknown>);
}

async function updateRosterClient(
  userId: string,
  organizationId: string | null | undefined,
  id: string,
  data: ParsedClientProfile,
) {
  await ensureOperatorClientsTable();
  const updated = organizationId
    ? await db.execute(sql`
        UPDATE operator_clients SET
          name = ${data.name},
          email = ${data.email},
          phone = ${data.phone},
          company = ${data.company},
          type = ${data.type},
          notes = ${data.notes},
          default_ownership_percentage = ${data.ownership},
          default_royalty_percentage = ${data.royalty},
          updated_at = now()
        WHERE id = ${id} AND organization_id = ${organizationId}
        RETURNING id, name, email, phone, company, type, notes,
                  default_ownership_percentage, default_royalty_percentage,
                  created_at, created_by
      `)
    : await db.execute(sql`
        UPDATE operator_clients SET
          name = ${data.name},
          email = ${data.email},
          phone = ${data.phone},
          company = ${data.company},
          type = ${data.type},
          notes = ${data.notes},
          default_ownership_percentage = ${data.ownership},
          default_royalty_percentage = ${data.royalty},
          updated_at = now()
        WHERE id = ${id} AND created_by = ${userId} AND organization_id IS NULL
        RETURNING id, name, email, phone, company, type, notes,
                  default_ownership_percentage, default_royalty_percentage,
                  created_at, created_by
      `);
  const row = updated.rows[0] as Record<string, unknown> | undefined;
  return row ? mapRosterRow(row) : null;
}

async function deleteRosterClient(
  userId: string,
  organizationId: string | null | undefined,
  id: string,
): Promise<boolean> {
  await ensureOperatorClientsTable();
  const deleted = organizationId
    ? await db.execute(sql`
        DELETE FROM operator_clients
        WHERE id = ${id} AND organization_id = ${organizationId}
        RETURNING id
      `)
    : await db.execute(sql`
        DELETE FROM operator_clients
        WHERE id = ${id} AND created_by = ${userId} AND organization_id IS NULL
        RETURNING id
      `);
  return deleted.rows.length > 0;
}

function clientSnapshotFromRoster(client: ReturnType<typeof mapRosterRow>) {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    company: client.company,
    type: client.type,
    role: client.role,
    notes: client.notes,
    defaultOwnershipPercentage: client.defaultOwnershipPercentage,
    defaultRoyaltyPercentage: client.defaultRoyaltyPercentage,
    copiedAt: new Date().toISOString(),
  };
}

async function resolveOwnedRosterClient(
  userId: string,
  organizationId: string | null | undefined,
  clientId: string | null | undefined,
) {
  if (!clientId) return null;
  const roster = await listRosterClients(userId, organizationId);
  return roster.find((c) => c.id === clientId) ?? null;
}

async function rosterHasDuplicate(
  userId: string,
  organizationId: string | null | undefined,
  email: string | null | undefined,
  name: string | null | undefined,
  exceptId?: string,
): Promise<boolean> {
  const roster = await listRosterClients(userId, organizationId);
  const key = clientDuplicateKey(email, name);
  return roster.some((c) => c.id !== exceptId && clientDuplicateKey(c.email, c.name) === key);
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

  // ── Clients (reusable roster + derived project people) ─────────────────────
  app.get("/api/clients", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const orgId = req.orgAuth?.organizationId;
      const roster = await listRosterClients(userId, orgId);
      const derived = await buildClientList(userId, orgId);
      const seen = new Set(
        roster.map((c) => clientDuplicateKey(c.email, c.name)).filter(Boolean),
      );
      const extras = derived.filter((c) => {
        const key = clientDuplicateKey(c.email as string | null, c.name as string);
        return key && !seen.has(key);
      });
      const userContracts = orgId
        ? await storage.getContractsForOrganization(orgId, userId)
        : await storage.getContracts(userId);
      const clientIdCounts = new Map<string, number>();
      for (const contract of userContracts) {
        const linked = ((contract.data ?? {}) as Record<string, unknown>).clientId;
        if (typeof linked === "string" && linked) {
          clientIdCounts.set(linked, (clientIdCounts.get(linked) ?? 0) + 1);
        }
      }
      const merged = [...roster, ...extras].map((c) => ({
        ...c,
        contractCount: Math.max(Number(c.contractCount ?? 0), clientIdCounts.get(String(c.id)) ?? 0),
      }));
      res.json(merged);
    } catch (error) {
      logger.error("clients.list_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const parsed = parseClientBody(req.body);
      if (!parsed.ok) {
        res.status(400).json({ message: parsed.message });
        return;
      }
      const orgId = req.orgAuth?.organizationId ?? null;
      if (await rosterHasDuplicate(userId, orgId, parsed.data.email, parsed.data.name)) {
        res.status(409).json({ message: "A client with this email or name already exists." });
        return;
      }
      const created = await insertRosterClient(userId, orgId, parsed.data);
      logger.info("client.created", { userId, clientId: created.id });
      res.status(201).json(created);
    } catch (error) {
      logger.error("clients.create_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.post("/api/clients/import", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const orgId = req.orgAuth?.organizationId ?? null;
      const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
      if (!csv.trim()) {
        res.status(400).json({ message: "CSV content is required." });
        return;
      }
      const { rows, errors } = parseClientCsv(csv);
      if (rows.length > 200) {
        res.status(400).json({ message: "CSV import is limited to 200 rows." });
        return;
      }
      const created: ReturnType<typeof mapRosterRow>[] = [];
      const skipped: { line: number; message: string }[] = [...errors];
      const seenInFile = new Set<string>();
      for (let i = 0; i < rows.length; i++) {
        const parsed = parseClientBody(rows[i]);
        if (!parsed.ok) {
          skipped.push({ line: i + 2, message: parsed.message });
          continue;
        }
        const key = clientDuplicateKey(parsed.data.email, parsed.data.name);
        if (seenInFile.has(key)) {
          skipped.push({ line: i + 2, message: "Duplicate row in this file." });
          continue;
        }
        seenInFile.add(key);
        if (await rosterHasDuplicate(userId, orgId, parsed.data.email, parsed.data.name)) {
          skipped.push({ line: i + 2, message: "A client with this email or name already exists." });
          continue;
        }
        created.push(await insertRosterClient(userId, orgId, parsed.data));
      }
      logger.info("clients.imported", { userId, created: created.length, skipped: skipped.length });
      res.status(200).json({ created: created.length, skipped: skipped.length, clients: created, errors: skipped });
    } catch (error) {
      logger.error("clients.import_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to import clients" });
    }
  });

  app.post("/api/clients/from-contributor", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const projectId = String(req.body?.projectId ?? "").trim();
      const contributorId = String(req.body?.contributorId ?? "").trim();
      if (!projectId || !contributorId) {
        res.status(400).json({ message: "projectId and contributorId are required." });
        return;
      }
      const access = await assertContractAccess(req, projectId, userId);
      if ("error" in access) {
        res.status(access.status).json({ message: access.error });
        return;
      }
      const collabs = await storage.getContractCollaborators(projectId);
      const collab = collabs.find((c) => c.id === contributorId);
      if (!collab) {
        res.status(404).json({ message: "Contributor not found on this project." });
        return;
      }
      const parsed = parseClientBody({
        name: collab.name,
        email: collab.email ?? "",
        type: collab.role,
        role: collab.role,
        defaultOwnershipPercentage: collab.ownershipPercentage ?? undefined,
      });
      if (!parsed.ok) {
        res.status(400).json({ message: parsed.message });
        return;
      }
      const orgId = req.orgAuth?.organizationId ?? null;
      if (await rosterHasDuplicate(userId, orgId, parsed.data.email, parsed.data.name)) {
        res.status(409).json({ message: "A client with this email or name already exists." });
        return;
      }
      const created = await insertRosterClient(userId, orgId, parsed.data);
      logger.info("client.created_from_contributor", { userId, clientId: created.id, projectId });
      res.status(201).json(created);
    } catch (error) {
      logger.error("clients.from_contributor_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to save contributor as client" });
    }
  });

  app.get("/api/clients/:id", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const client = await findOwnedClient(userId, req.orgAuth?.organizationId, req.params.id);
      if (!client) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  const listClientProjects = async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const client = await findOwnedClient(userId, req.orgAuth?.organizationId, req.params.id);
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
            (c) => c.id === req.params.id || (!!email && c.email === email) || c.name === name,
          );
        if (match) projects.push(contractToProject(contract));
      }
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client projects" });
    }
  };

  app.get("/api/clients/:id/projects", ...requireActivePermission("client.manage"), listClientProjects);
  app.get("/api/clients/:id/sessions", ...requireActivePermission("client.manage"), listClientProjects);

  const updateClientHandler = async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const orgId = req.orgAuth?.organizationId ?? null;
      const roster = await listRosterClients(userId, orgId);
      const existing = roster.find((c) => c.id === req.params.id);
      if (!existing) {
        const derived = await findOwnedClient(userId, orgId, req.params.id);
        if (derived) {
          res.status(400).json({
            message: "This person is on a project. Save them as a client profile to edit reusable details without changing existing rights.",
          });
          return;
        }
        res.status(404).json({ message: "Client not found" });
        return;
      }
      const merged = {
        name: req.body?.name ?? existing.name,
        email: req.body?.email === undefined ? existing.email : req.body.email,
        phone: req.body?.phone === undefined ? existing.phone : req.body.phone,
        company: req.body?.company === undefined ? existing.company : req.body.company,
        type: req.body?.type ?? req.body?.role ?? existing.type,
        role: req.body?.role ?? req.body?.type ?? existing.role,
        notes: req.body?.notes === undefined ? existing.notes : req.body.notes,
        defaultOwnershipPercentage:
          req.body?.defaultOwnershipPercentage === undefined
            ? existing.defaultOwnershipPercentage
            : req.body.defaultOwnershipPercentage,
        defaultRoyaltyPercentage:
          req.body?.defaultRoyaltyPercentage === undefined
            ? existing.defaultRoyaltyPercentage
            : req.body.defaultRoyaltyPercentage,
      };
      const parsed = parseClientBody(merged);
      if (!parsed.ok) {
        res.status(400).json({ message: parsed.message });
        return;
      }
      if (await rosterHasDuplicate(userId, orgId, parsed.data.email, parsed.data.name, existing.id)) {
        res.status(409).json({ message: "A client with this email or name already exists." });
        return;
      }
      const updated = await updateRosterClient(userId, orgId, existing.id, parsed.data);
      if (!updated) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      logger.info("client.updated", { userId, clientId: updated.id });
      res.json(updated);
    } catch (error) {
      logger.error("clients.update_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to update client" });
    }
  };

  app.patch("/api/clients/:id", ...requireActivePermission("client.manage"), updateClientHandler);
  app.put("/api/clients/:id", ...requireActivePermission("client.manage"), updateClientHandler);

  app.delete("/api/clients/:id", ...requireActivePermission("client.manage"), async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user.claims.sub;
      const orgId = req.orgAuth?.organizationId ?? null;
      const roster = await listRosterClients(userId, orgId);
      const existing = roster.find((c) => c.id === req.params.id);
      if (!existing) {
        const derived = await findOwnedClient(userId, orgId, req.params.id);
        if (derived) {
          res.status(400).json({
            message: "Project contributors cannot be deleted from Clients. Remove them from the project instead.",
          });
          return;
        }
        res.status(404).json({ message: "Client not found" });
        return;
      }
      const removed = await deleteRosterClient(userId, orgId, existing.id);
      if (!removed) {
        res.status(404).json({ message: "Client not found" });
        return;
      }
      logger.info("client.deleted", { userId, clientId: existing.id });
      res.json({ success: true });
    } catch (error) {
      logger.error("clients.delete_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to delete client" });
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
      const requestedClientId = typeof req.body?.clientId === "string" ? req.body.clientId.trim() : "";
      let rosterClient: ReturnType<typeof mapRosterRow> | null = null;
      if (requestedClientId) {
        rosterClient = await resolveOwnedRosterClient(userId, req.orgAuth?.organizationId, requestedClientId);
        if (!rosterClient) {
          res.status(403).json({ message: "Client not found or not authorized." });
          return;
        }
      }
      const snapshot = rosterClient ? clientSnapshotFromRoster(rosterClient) : null;
      const created = await storage.createContract({
        title,
        type: "split-sheet",
        status: "draft",
        createdBy: userId,
        organizationId: req.orgAuth?.organizationId ?? null,
        data: {
          songTitle: String(req.body?.songTitle ?? title).trim(),
          notes: String(req.body?.notes ?? "").trim() || null,
          clientId: rosterClient?.id ?? null,
          clientSnapshot: snapshot,
        },
      } as any);
      const seedContributor = req.body?.seedContributor !== false;
      if (rosterClient && seedContributor) {
        try {
          const ownership = rosterClient.defaultOwnershipPercentage != null
            ? String(rosterClient.defaultOwnershipPercentage)
            : "100";
          await storage.addContractCollaborator({
            contractId: created.id,
            name: rosterClient.name,
            email: rosterClient.email,
            role: rosterClient.role || rosterClient.type || "artist",
            ownershipPercentage: ownership,
            status: "pending",
          });
        } catch (seedErr) {
          logger.error("projects.seed_contributor_failed", {
            projectId: created.id,
            error: (seedErr as Error)?.message,
          });
        }
      }
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
      if (clientId !== undefined) {
        const nextId = typeof clientId === "string" && clientId.trim() ? clientId.trim() : null;
        if (nextId) {
          const rosterClient = await resolveOwnedRosterClient(
            req.user.claims.sub,
            req.orgAuth?.organizationId,
            nextId,
          );
          if (!rosterClient) {
            res.status(403).json({ message: "Client not found or not authorized." });
            return;
          }
          data.clientId = rosterClient.id;
          data.clientSnapshot = clientSnapshotFromRoster(rosterClient);
        } else {
          data.clientId = null;
        }
      }
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

  const bulkDispatch = (mode: ConfirmationSendMode) =>
    async (req: OrgAuthedRequest, res: Response) => {
      try {
        const userId = (req as any).user?.claims?.sub as string;
        const parsed = parseBulkProjectIds(req.body);
        if (!parsed.ok) {
          res.status(400).json({ message: parsed.message });
          return;
        }
        const remainingEmails = { value: MAX_EMAILS_PER_REQUEST };
        const startedAt = Date.now();
        const projects = [];
        for (const id of parsed.ids) {
          const access = await assertContractAccess(req, id, userId);
          if ("error" in access) {
            projects.push({
              projectId: id,
              title: "",
              ok: false,
              skipped: true,
              code: access.status === 404 ? "not_found" as const : "unauthorized" as const,
              message: access.error,
              recipients: [],
            });
            continue;
          }
          projects.push(await dispatchPendingConfirmations({
            mode,
            contract: access.contract,
            userId,
            req,
            remainingEmails,
            startedAt,
          }));
        }
        const summary = summarizeDispatch(projects);
        logger.info(mode === "remind" ? "confirmation.bulk_remind" : "confirmation.bulk_send", {
          userId,
          mode,
          projects: parsed.ids.length,
          sent: summary.sent,
          failed: summary.failed,
          skipped: summary.skipped,
        });
        res.json(summary);
      } catch (error) {
        logger.error("confirmation.bulk_send_failed", { error: (error as Error)?.message, mode });
        res.status(500).json({ message: "Failed to send confirmations" });
      }
    };

  const resendOne = async (req: OrgAuthedRequest, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub as string;
      const access = await assertContractAccess(req, req.params.id, userId);
      if ("error" in access) {
        res.status(access.status).json({ message: access.error });
        return;
      }
      const project = await dispatchPendingConfirmations({
        mode: "resend",
        contract: access.contract,
        userId,
        req,
        remainingEmails: { value: MAX_EMAILS_PER_REQUEST },
        startedAt: Date.now(),
      });
      const summary = summarizeDispatch([project]);
      logger.info("confirmation.resend", {
        userId,
        projectId: req.params.id,
        sent: summary.sent,
        failed: summary.failed,
        skipped: summary.skipped,
      });
      res.json(summary);
    } catch (error) {
      logger.error("confirmation.resend_failed", { error: (error as Error)?.message });
      res.status(500).json({ message: "Failed to resend confirmations" });
    }
  };

  app.post("/api/projects/bulk-send", ...requireActivePermission("agreement.send"), bulkDispatch("send"));
  app.post("/api/sessions/bulk-send", ...requireActivePermission("agreement.send"), bulkDispatch("send"));
  app.post("/api/projects/bulk-remind", ...requireActivePermission("agreement.send"), bulkDispatch("remind"));
  app.post("/api/sessions/bulk-remind", ...requireActivePermission("agreement.send"), bulkDispatch("remind"));
  app.post("/api/projects/:id/resend", ...requireActivePermission("agreement.send"), resendOne);
  app.post("/api/sessions/:id/resend", ...requireActivePermission("agreement.send"), resendOne);

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
