import type { Express, Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { apiKeyAuth, createRateLimiter, auditLog } from "./security";
import { parseApiPage } from "@shared/feature-policy";
import { logger } from "./logger";

function hasScope(req: Request, needed: string): boolean {
  const scopes: string[] = (req as any).apiScopes ?? [];
  if (scopes.includes("*") || scopes.includes(needed)) return true;
  if (needed === "ledger:read") return scopes.includes("read:ownership") || scopes.includes("read:contracts");
  if (needed === "sessions:read") return scopes.includes("read:contracts");
  if (needed === "contributors:read") return scopes.includes("read:ownership") || scopes.includes("read:contracts");
  return false;
}

function requireV1Scope(scope: string) {
  return (req: Request, res: Response, next: () => void) => {
    if (!hasScope(req, scope)) {
      logger.info("api.request_rejected", { reason: "scope", scope, keyId: (req as any).apiKeyId });
      res.status(403).json({ error: `Insufficient scope. Required: ${scope}` });
      return;
    }
    next();
  };
}

function ownerId(req: Request): string {
  return String((req as any).apiOwnerId ?? "");
}

const limiter = createRateLimiter(120, 60_000);

export function registerV1ApiRoutes(app: Express): void {
  const gate = [limiter, apiKeyAuth];

  app.get("/api/v1/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: { title: "SplitSheet Read API", version: "1.0.0" },
      servers: [{ url: "/api/v1" }],
      security: [{ apiKey: [] }],
      components: {
        securitySchemes: { apiKey: { type: "apiKey", in: "header", name: "X-Api-Key" } },
      },
      paths: {
        "/ledger": { get: { summary: "List rights ledger assets", security: [{ apiKey: [] }] } },
        "/ledger/{id}": { get: { summary: "Get one ledger asset" } },
        "/sessions": { get: { summary: "List projects/sessions" } },
        "/sessions/{id}": { get: { summary: "Get one session" } },
        "/contributors": { get: { summary: "List contributors" } },
        "/export": { get: { summary: "Export sessions and ledger summary" } },
      },
    });
  });

  app.get("/api/v1/ledger", ...gate, requireV1Scope("ledger:read"), async (req: Request, res: Response) => {
    const { limit, offset } = parseApiPage(req.query as Record<string, unknown>);
    const assets = await storage.getSongAssets(ownerId(req));
    const page = assets.slice(offset, offset + limit).map(publicAsset);
    res.json({ items: page, limit, offset, total: assets.length });
  });

  app.get("/api/v1/ledger/:id", ...gate, requireV1Scope("ledger:read"), async (req: Request, res: Response) => {
    const asset = await storage.getSongAsset(req.params.id);
    if (!asset || asset.createdBy !== ownerId(req)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(publicAsset(asset));
  });

  app.get("/api/v1/sessions", ...gate, requireV1Scope("sessions:read"), async (req: Request, res: Response) => {
    const { limit, offset } = parseApiPage(req.query as Record<string, unknown>);
    const contracts = await storage.getContracts(ownerId(req));
    const page = contracts.slice(offset, offset + limit).map(publicSession);
    res.json({ items: page, limit, offset, total: contracts.length });
  });

  app.get("/api/v1/sessions/:id", ...gate, requireV1Scope("sessions:read"), async (req: Request, res: Response) => {
    const contract = await storage.getContract(req.params.id);
    if (!contract || contract.createdBy !== ownerId(req)) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(publicSession(contract));
  });

  app.get("/api/v1/contributors", ...gate, requireV1Scope("contributors:read"), async (req: Request, res: Response) => {
    const { limit, offset } = parseApiPage(req.query as Record<string, unknown>);
    const contracts = await storage.getContracts(ownerId(req));
    const people: Record<string, unknown>[] = [];
    for (const contract of contracts) {
      const collabs = await storage.getContractCollaborators(contract.id);
      for (const c of collabs) {
        people.push({
          id: c.id,
          name: c.name,
          role: c.role,
          sessionId: contract.id,
          sessionTitle: contract.title,
          ownershipPercentage: c.ownershipPercentage,
          status: c.status,
        });
      }
    }
    res.json({ items: people.slice(offset, offset + limit), limit, offset, total: people.length });
  });

  app.get("/api/v1/export", ...gate, requireV1Scope("sessions:read"), async (req: Request, res: Response) => {
    if (!hasScope(req, "ledger:read")) {
      res.status(403).json({ error: "Insufficient scope. Required: ledger:read" });
      return;
    }
    const userId = ownerId(req);
    const contracts = await storage.getContracts(userId);
    const assets = await storage.getSongAssets(userId);
    await auditLog({
      userId,
      apiKeyId: (req as any).apiKeyId,
      action: "api.export",
      resourceType: "v1_export",
      afterState: { sessions: contracts.length, assets: assets.length },
    }).catch(() => {});
    res.json({
      exportedAt: new Date().toISOString(),
      sessions: contracts.map(publicSession),
      ledger: assets.map(publicAsset),
    });
  });
}

function publicSession(contract: { id: string; title: string; type: string; status?: string | null; createdAt?: Date | null; updatedAt?: Date | null }) {
  return {
    id: contract.id,
    title: contract.title,
    type: contract.type,
    status: contract.status,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

function publicAsset(asset: { id: string; title?: string | null; isrc?: string | null; status?: string | null; createdAt?: Date | null }) {
  return {
    id: asset.id,
    title: asset.title,
    isrc: asset.isrc ?? null,
    status: asset.status,
    createdAt: asset.createdAt,
  };
}
