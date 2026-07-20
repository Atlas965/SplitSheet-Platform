/**
 * server/legal-routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Legal Document Versioning (Priority 1.1) — counsel-editable Terms of
 * Service, Privacy Policy, DPA, and contributor-consent text, published via
 * an admin API instead of a code deploy. Entertainment counsel can publish
 * a new version of any doc type; every authenticated user is automatically
 * required to re-accept `tos`/`privacy` before continuing (enforced by
 * requireTermsAccepted in server/compliance-routes.ts).
 *
 * Read routes are intentionally public (no auth) — legal text needs to be
 * visible before a user has an account, and TermsGate itself has to fetch it
 * before the user has accepted anything.
 *
 * Mounted from server/routes.ts via registerLegalRoutes(app).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { isAdmin } from "./adminAuth";
import { insertLegalDocumentSchema, LEGAL_DOC_TYPES, type LegalDocType } from "@shared/schema";
import { auditLog } from "./security";

const docTypeParamSchema = z.enum(LEGAL_DOC_TYPES);

function parseDocType(raw: string): LegalDocType | null {
  const result = docTypeParamSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export function registerLegalRoutes(app: Express): void {
  /**
   * GET /api/legal/documents/:docType/latest
   * Public. Returns the most recently effective published version of a doc
   * type, or 404 if none has been published yet.
   */
  app.get("/api/legal/documents/:docType/latest", async (req: Request, res: Response) => {
    const docType = parseDocType(req.params.docType);
    if (!docType) {
      res.status(400).json({ error: `Invalid docType. Must be one of: ${LEGAL_DOC_TYPES.join(", ")}` });
      return;
    }
    try {
      const doc = await storage.getLatestLegalDocument(docType);
      if (!doc) {
        res.status(404).json({ error: "No published document for this doc type" });
        return;
      }
      res.json({
        docType: doc.docType,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
        markdownBody: doc.markdownBody,
        publishedAt: doc.publishedAt,
      });
    } catch (error) {
      console.error("[LEGAL DOCUMENT LATEST ERROR]", error);
      res.status(500).json({ error: "Failed to fetch legal document" });
    }
  });

  /**
   * GET /api/legal/documents/:docType/history
   * Public. Lists every published version of a doc type, newest first.
   * Body text is omitted from history entries for payload size — fetch
   * `/latest` (or a future `/version/:version` route) for full text.
   */
  app.get("/api/legal/documents/:docType/history", async (req: Request, res: Response) => {
    const docType = parseDocType(req.params.docType);
    if (!docType) {
      res.status(400).json({ error: `Invalid docType. Must be one of: ${LEGAL_DOC_TYPES.join(", ")}` });
      return;
    }
    try {
      const docs = await storage.getLegalDocumentHistory(docType);
      res.json({
        docType,
        versions: docs.map((d) => ({
          version: d.version,
          effectiveDate: d.effectiveDate,
          publishedAt: d.publishedAt,
        })),
      });
    } catch (error) {
      console.error("[LEGAL DOCUMENT HISTORY ERROR]", error);
      res.status(500).json({ error: "Failed to fetch legal document history" });
    }
  });

  /**
   * POST /api/legal/documents
   * Admin-only. Publishes a new version of a doc type. Versions are
   * immutable once published — publishing the same (docType, version) pair
   * twice returns 409; editing published text means picking a new version
   * string, not mutating an old one.
   */
  app.post("/api/legal/documents", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    const userId = (req as any).user.claims.sub;
    try {
      const body = insertLegalDocumentSchema.parse(req.body);
      const doc = await storage.createLegalDocument({ ...body, publishedBy: userId });

      await auditLog({
        userId,
        action: "legal_document.publish",
        resourceType: "legal_document",
        resourceId: doc.id,
        afterState: { docType: doc.docType, version: doc.version, effectiveDate: doc.effectiveDate },
        ipAddress: (req as any).ip,
      });

      res.status(201).json({
        id: doc.id,
        docType: doc.docType,
        version: doc.version,
        effectiveDate: doc.effectiveDate,
        publishedAt: doc.publishedAt,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Validation failed", issues: error.errors });
      } else if (error?.code === "23505") {
        // Postgres unique_violation on (doc_type, version)
        res.status(409).json({ error: "This doc type + version has already been published" });
      } else {
        console.error("[LEGAL DOCUMENT PUBLISH ERROR]", error);
        res.status(500).json({ message: "Failed to publish legal document" });
      }
    }
  });
}
