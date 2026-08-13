/**
 * Copilot Voice Assistant API — orchestration only (no UI).
 *
 * POST /api/copilot/voice/session
 * POST /api/copilot/voice/turn
 * POST /api/copilot/voice/confirm
 * GET  /api/copilot/voice/health
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "./replitAuth";
import {
  confirmVoiceAction,
  processVoiceTurn,
  startVoiceSession,
} from "./voice/pipeline";
import { upsertAuthorizedMemory, listAuthorizedMemory } from "./voice/store";
import { PLATFORM_VOICE_DISCLAIMER } from "@shared/voice-orchestration";

const sessionSchema = z.object({
  pageContext: z.string().max(200).optional(),
  projectId: z.string().max(100).optional(),
  contractId: z.string().max(100).optional(),
  organizationId: z.string().max(100).optional(),
  locale: z.string().max(20).optional(),
});

const turnSchema = z.object({
  sessionId: z.string().min(1),
  transcript: z.string().max(8000).optional(),
  audioBase64: z.string().max(5_000_000).optional(),
  mimeType: z.string().max(100).optional(),
});

const confirmSchema = z.object({
  sessionId: z.string().min(1),
  pendingActionId: z.string().min(1),
  decision: z.enum(["confirmed", "rejected"]),
});

const memorySchema = z.object({
  key: z.string().min(1).max(80),
  value: z.unknown(),
  category: z.enum(["preference", "collaborator", "workflow", "terminology"]).optional(),
});

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, max = 30): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function registerVoiceRoutes(app: Express): void {
  app.get("/api/copilot/voice/health", isAuthenticated, (_req, res) => {
    res.json({
      status: "ready",
      layer: "voice-orchestration",
      speechProviders: ["passthrough-transcript", process.env.OPENAI_API_KEY ? "openai-whisper" : null].filter(Boolean),
      principles: {
        notALawyer: true,
        notDatabaseOfRecord: true,
        confirmationGates: true,
        canonicalRightsPrevail: true,
      },
      disclaimer: PLATFORM_VOICE_DISCLAIMER,
    });
  });

  app.post("/api/copilot/voice/session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const body = sessionSchema.parse(req.body ?? {});
      const session = await startVoiceSession({ userId, ...body });
      res.status(201).json(session);
    } catch (err: any) {
      console.error("[voice/session]", err);
      res.status(400).json({ error: err?.message || "Failed to start voice session" });
    }
  });

  app.post("/api/copilot/voice/turn", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      if (!checkRateLimit(userId)) {
        return res.status(429).json({ error: "Too many voice requests. Please wait a moment." });
      }
      const body = turnSchema.parse(req.body ?? {});
      if (!body.transcript && !body.audioBase64) {
        return res.status(400).json({ error: "Provide transcript and/or audioBase64" });
      }
      const result = await processVoiceTurn({ userId, ...body });
      res.json(result);
    } catch (err: any) {
      const status = err?.status || 500;
      console.error("[voice/turn]", err);
      res.status(status).json({ error: err?.message || "Voice turn failed" });
    }
  });

  app.post("/api/copilot/voice/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const body = confirmSchema.parse(req.body ?? {});
      const result = await confirmVoiceAction({ userId, ...body });
      res.json(result);
    } catch (err: any) {
      const status = err?.status || 500;
      console.error("[voice/confirm]", err);
      res.status(status).json({ error: err?.message || "Confirmation failed" });
    }
  });

  app.get("/api/copilot/voice/memory", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const rows = await listAuthorizedMemory(userId);
    res.json({ memory: rows, note: "Canonical rights records always override conversational memory." });
  });

  app.put("/api/copilot/voice/memory", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const body = memorySchema.parse(req.body ?? {});
      const row = await upsertAuthorizedMemory({ userId, ...body });
      res.json({ memory: row });
    } catch (err: any) {
      res.status(400).json({ error: err?.message || "Memory update failed" });
    }
  });
}
