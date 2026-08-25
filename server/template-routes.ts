import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";
import { isAdmin } from "./adminAuth";
import { storage } from "./storage";
import { db } from "./db";
import { templateAuditLog } from "@shared/schema";
import {
  LEGAL_DISCLAIMER,
  LEGAL_REVIEW_STATUSES,
  PARTY_TYPES,
  RIGHTS_TAXONOMY,
  RISK_LEVELS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_STATUSES,
  isDraftableStatus,
  recommendAgreements,
  validateTemplateFieldValues,
} from "@shared/agreement-catalog";
import { syncAgreementToRightsLedger } from "./agreement-ledger";
import { requireOwnedContract } from "./authz-helpers";
import { requireActivePermission } from "./rbac-middleware";

async function writeTemplateAudit(
  templateId: string | null,
  actorId: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  await db.insert(templateAuditLog).values({
    templateId: templateId ?? undefined,
    actorId,
    action,
    before: before as any,
    after: after as any,
  });
}

export function registerTemplateRoutes(app: Express) {
  // Catalog metadata (taxonomies)
  app.get("/api/templates/meta", isAuthenticated, async (_req, res) => {
    res.json({
      categories: TEMPLATE_CATEGORIES.filter((c) => !(c as any).reserved),
      futureCategories: TEMPLATE_CATEGORIES.filter((c) => (c as any).reserved),
      rights: RIGHTS_TAXONOMY,
      parties: PARTY_TYPES,
      statuses: TEMPLATE_STATUSES,
      legalReviewStatuses: LEGAL_REVIEW_STATUSES,
      riskLevels: RISK_LEVELS,
      disclaimer: LEGAL_DISCLAIMER,
    });
  });

  // Alias: GET /api/templates (filtered library)
  app.get("/api/templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getContractTemplates({
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        riskLevel: req.query.riskLevel as string | undefined,
        jurisdiction: req.query.jurisdiction as string | undefined,
        rights: req.query.rights as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.get("/api/templates/by-type/:type", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getContractTemplateByType(req.params.type);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch template" });
    }
  });

  app.post("/api/templates/:id/validate", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getContractTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      const fields = ((template.template as any)?.fields ?? []) as any[];
      const result = validateTemplateFieldValues(fields, req.body?.data ?? {});
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Admin: list all templates including archived
  app.get("/api/admin/templates", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const templates = await storage.listAllContractTemplates({
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        search: req.query.search as string | undefined,
        includeInactive: true,
      });
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: "Failed to list templates" });
    }
  });

  app.post("/api/admin/templates", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const body = req.body ?? {};
      if (!body.name || !body.type || !body.template) {
        return res.status(400).json({ message: "name, type, and template are required" });
      }
      const created = await storage.createContractTemplate({
        name: body.name,
        type: body.type,
        slug: body.slug || body.type,
        description: body.description,
        category: body.category,
        subcategory: body.subcategory,
        industry: body.industry || "music",
        agreementType: body.agreementType,
        version: body.version || "1.0",
        status: body.status || "draft",
        jurisdiction: body.jurisdiction || "CA",
        legalReviewStatus: body.legalReviewStatus || "NOT_REVIEWED",
        rightsCategories: body.rightsCategories || [],
        requiredParties: body.requiredParties || [],
        optionalParties: body.optionalParties || [],
        riskLevel: body.riskLevel || "medium",
        workflowType: body.workflowType,
        supportedTransactions: body.supportedTransactions || [],
        template: body.template,
        isActive: (body.status || "draft") === "active",
      } as any);
      await writeTemplateAudit(created.id, actorId, "create", null, created);
      res.status(201).json(created);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/admin/templates/:id", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const before = await storage.getContractTemplate(req.params.id);
      if (!before) return res.status(404).json({ message: "Template not found" });

      const updates = { ...req.body };
      delete updates.id;
      if (updates.status) {
        updates.isActive = updates.status === "active";
      }
      const after = await storage.updateContractTemplate(req.params.id, updates);
      await writeTemplateAudit(after.id, actorId, "update", before, after);
      res.json(after);
    } catch (error) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.post("/api/admin/templates/:id/duplicate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const source = await storage.getContractTemplate(req.params.id);
      if (!source) return res.status(404).json({ message: "Template not found" });
      const suffix = `-copy-${Date.now().toString(36)}`;
      const created = await storage.createContractTemplate({
        name: `${source.name} (Copy)`,
        type: `${source.type}${suffix}`,
        slug: `${source.slug || source.type}${suffix}`,
        description: source.description,
        category: source.category,
        subcategory: source.subcategory,
        industry: source.industry,
        agreementType: source.agreementType,
        version: "1.0",
        status: "draft",
        jurisdiction: source.jurisdiction,
        legalReviewStatus: "NOT_REVIEWED",
        rightsCategories: source.rightsCategories as any,
        requiredParties: source.requiredParties as any,
        optionalParties: source.optionalParties as any,
        riskLevel: source.riskLevel,
        workflowType: source.workflowType,
        supportedTransactions: source.supportedTransactions as any,
        parentTemplateId: source.id,
        template: source.template,
        isActive: false,
      } as any);
      await writeTemplateAudit(created.id, actorId, "duplicate", source, created);
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({ message: "Failed to duplicate template" });
    }
  });

  app.post("/api/admin/templates/:id/version", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const source = await storage.getContractTemplate(req.params.id);
      if (!source) return res.status(404).json({ message: "Template not found" });

      const [major, minor] = String(source.version || "1.0").split(".").map((n) => parseInt(n, 10) || 0);
      const bump = req.body?.bump === "major" ? "major" : "minor";
      const nextVersion = bump === "major" ? `${major + 1}.0` : `${major}.${minor + 1}`;

      // Deprecate previous for new creates; historical contracts keep templateId
      await storage.updateContractTemplate(source.id, {
        status: "deprecated",
        isActive: false,
        legalReviewStatus:
          source.legalReviewStatus === "COUNSEL_APPROVED" ? "DEPRECATED" : source.legalReviewStatus,
      } as any);

      const created = await storage.createContractTemplate({
        name: source.name,
        type: source.type,
        slug: source.slug || source.type,
        description: source.description,
        category: source.category,
        subcategory: source.subcategory,
        industry: source.industry,
        agreementType: source.agreementType,
        version: nextVersion,
        status: "draft",
        jurisdiction: source.jurisdiction,
        legalReviewStatus: "NOT_REVIEWED",
        rightsCategories: source.rightsCategories as any,
        requiredParties: source.requiredParties as any,
        optionalParties: source.optionalParties as any,
        riskLevel: source.riskLevel,
        workflowType: source.workflowType,
        supportedTransactions: source.supportedTransactions as any,
        parentTemplateId: source.id,
        template: req.body?.template ?? source.template,
        isActive: false,
      } as any);

      await writeTemplateAudit(created.id, actorId, "version", source, created);
      res.status(201).json(created);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to version template" });
    }
  });

  app.post("/api/admin/templates/:id/activate", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const before = await storage.getContractTemplate(req.params.id);
      if (!before) return res.status(404).json({ message: "Template not found" });
      const after = await storage.updateContractTemplate(req.params.id, {
        status: "active",
        isActive: true,
      } as any);
      await writeTemplateAudit(after.id, actorId, "activate", before, after);
      res.json(after);
    } catch (error) {
      res.status(500).json({ message: "Failed to activate template" });
    }
  });

  app.post("/api/admin/templates/:id/archive", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const actorId = req.user.claims.sub;
      const before = await storage.getContractTemplate(req.params.id);
      if (!before) return res.status(404).json({ message: "Template not found" });
      const after = await storage.updateContractTemplate(req.params.id, {
        status: "archived",
        isActive: false,
      } as any);
      await writeTemplateAudit(after.id, actorId, "archive", before, after);
      res.json(after);
    } catch (error) {
      res.status(500).json({ message: "Failed to archive template" });
    }
  });

  // Project recommendations
  app.get("/api/projects/:id/recommended-agreements", ...requireActivePermission("project.read"), async (req: any, res) => {
    try {
      const project = await requireOwnedContract(req, res, req.params.id);
      if (!project) return;

      const collaborators = await storage.getContractCollaborators(project.id);
      const roles = collaborators.map((c) => c.role);
      const data = (project.data || {}) as Record<string, any>;

      const recommendations = recommendAgreements({
        roles,
        songwriterCount: collaborators.filter((c) =>
          /writer|composer|songwriter/i.test(c.role),
        ).length,
        hasProducer: roles.some((r) => /producer/i.test(r)) || Boolean(data.hasProducer),
        hasExternalBeat: Boolean(data.hasExternalBeat || data.externalBeat),
        hasMaster: Boolean(data.hasMaster || data.recordingTitle) || project.type.includes("master"),
        hasPublishing: Boolean(data.hasPublishing) || roles.some((r) => /publish/i.test(r)),
        hasLiveEvent: Boolean(data.eventDate || data.venue),
        hasSyncUse: Boolean(data.syncUse || data.media),
        notes: data.notes,
      });

      // Attach live template rows when present
      const enriched = await Promise.all(
        recommendations.map(async (rec) => {
          const template = await storage.getContractTemplateByType(rec.template);
          return {
            ...rec,
            templateRecord: template
              ? {
                  id: template.id,
                  name: template.name,
                  type: template.type,
                  status: template.status,
                  riskLevel: template.riskLevel,
                  legalReviewStatus: template.legalReviewStatus,
                  version: template.version,
                  category: template.category,
                }
              : null,
            draftable: template ? isDraftableStatus(template.status) : false,
          };
        }),
      );

      res.json({ projectId: project.id, recommendations: enriched, disclaimer: LEGAL_DISCLAIMER });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to recommend agreements" });
    }
  });

  // Rights ledger sync (explicit + used after confirmation)
  app.post("/api/projects/:id/workflow/sync-ledger", ...requireActivePermission("rights.update"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const project = await requireOwnedContract(req, res, req.params.id);
      if (!project) return;
      const result = await syncAgreementToRightsLedger(project.id, userId);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to sync rights ledger" });
    }
  });

  app.post("/api/contracts/:id/sync-ledger", ...requireActivePermission("rights.update"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const contract = await requireOwnedContract(req, res, req.params.id);
      if (!contract) return;
      const result = await syncAgreementToRightsLedger(contract.id, userId);
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to sync rights ledger" });
    }
  });
}
