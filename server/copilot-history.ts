import type { Express, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePermission } from "./rbac-middleware";
import type { OrgAuthedRequest } from "./rbac-middleware";
import { storage } from "./storage";
import { mostCommonSplit, titlesLookSimilar } from "@shared/feature-policy";
import { resourceBelongsToOrg, resolveRequestOrgId } from "./authz-helpers";
import { logger } from "./logger";

export function registerCopilotHistoryRoutes(app: Express): void {
  app.get("/api/copilot/history-suggestions", ...requireActivePermission("project.read"), async (req: OrgAuthedRequest, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const email = String(req.query.email ?? "").trim().toLowerCase();
    const name = String(req.query.name ?? "").trim();
    const title = String(req.query.title ?? "").trim();
    if (!email && !name) {
      res.status(400).json({ message: "Provide a contributor name or email." });
      return;
    }
    const rows = await db.execute(sql`
      SELECT c.id AS project_id, c.title, c.created_at, c.status,
             cc.name, cc.email, cc.role, cc.ownership_percentage
      FROM contract_collaborators cc
      JOIN contracts c ON c.id = cc.contract_id
      WHERE c.created_by = ${userId}
        AND (
          (${email || null}::varchar IS NOT NULL AND lower(cc.email) = ${email || null})
          OR (${name || null}::varchar IS NOT NULL AND lower(cc.name) = ${name.toLowerCase() || null})
        )
      ORDER BY c.created_at DESC
      LIMIT 25
    `);
    const history = (rows.rows as Record<string, unknown>[]).map((r) => ({
      projectId: String(r.project_id),
      title: String(r.title),
      date: r.created_at,
      status: r.status,
      role: r.role,
      ownershipPercentage: Number(r.ownership_percentage ?? 0),
    }));
    const splits = history.map((h) => h.ownershipPercentage);
    const pattern = mostCommonSplit(splits);
    const conflicts = history.filter((h) =>
      (pattern && Math.abs(h.ownershipPercentage - Number.parseFloat(pattern.label)) > 5) ||
      (title && titlesLookSimilar(title, h.title)),
    ).map((h) => ({
      projectId: h.projectId,
      title: h.title,
      date: h.date,
      reason: title && titlesLookSimilar(title, h.title)
        ? "Previous records use a similar song title."
        : "Previous records differ.",
    }));
    logger.info("copilot.suggestion_viewed", { userId, matches: history.length });
    res.json({
      matches: history.length,
      previousSplitPatterns: pattern ? [{ label: pattern.label, count: pattern.count }] : [],
      sourceSessions: history.slice(0, 8),
      conflicts,
      disclaimer: "These are previous records from your workspace. They are not a legal determination.",
    });
  });

  app.post("/api/copilot/apply-suggestion", ...requireActivePermission("project.update"), async (req: OrgAuthedRequest, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const projectId = String(req.body?.projectId ?? "");
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "").trim();
    const role = String(req.body?.role ?? "songwriter").trim();
    const ownership = String(req.body?.ownershipPercentage ?? "");
    if (!projectId || !name || !ownership) {
      res.status(400).json({ message: "projectId, name, and ownershipPercentage are required." });
      return;
    }
    const contract = await storage.getContract(projectId);
    if (!contract) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const orgId = req.orgAuth?.organizationId ?? (await resolveRequestOrgId(req));
    if (!resourceBelongsToOrg(contract, orgId, userId)) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }
    if (contract.status === "signed" || contract.status === "active") {
      res.status(409).json({ message: "Cannot apply suggestions to a confirmed project." });
      return;
    }
    const collab = await storage.addContractCollaborator({
      contractId: projectId,
      name,
      email: email || null,
      role,
      ownershipPercentage: ownership,
      status: "pending",
    });
    logger.info("copilot.suggestion_applied", { userId, projectId, contributorId: collab.id });
    res.status(201).json({ applied: true, contributor: { id: collab.id, name: collab.name } });
  });
}
