import type { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "./replitAuth";
import {
  getFallbackResponse,
  getOpenAIErrorMessage,
  streamTextAsSSE,
  appendTextAsSSE,
} from "./copilot-fallback";
import { COPILOT_SYSTEM_PROMPT, resolveCopilotPageKey } from "./copilot-knowledge";
import {
  getCopilotModel,
  isCopilotConfigured,
  streamCopilotCompletion,
} from "./claude.service";

const copilotSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(40),
  currentPage: z.string().max(200).optional(),
  pageContext: z.string().max(200).optional(),
});

const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

function getLastUserMessage(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return messages[messages.length - 1]?.content ?? "";
}

function respondWithFallback(
  res: Response,
  userMessage: string,
  currentPage?: string,
  prefix?: string,
): boolean {
  const pageKey = resolveCopilotPageKey(currentPage);
  const fallback = getFallbackResponse(userMessage, pageKey);
  if (!fallback) return false;

  const text = prefix ? `${prefix}\n\n${fallback}` : fallback;
  streamTextAsSSE(res, text);
  return true;
}

export function registerCopilotRoutes(app: Express): void {
  app.post("/api/copilot", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub ?? "anonymous";

    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before asking another question.",
      });
    }

    let body: z.infer<typeof copilotSchema>;
    try {
      body = copilotSchema.parse(req.body);
    } catch (err: any) {
      return res.status(400).json({
        error: "Invalid request format.",
        issues: err?.errors ?? [],
      });
    }

    const userMessage = getLastUserMessage(body.messages);
    const pageKey = resolveCopilotPageKey(body.currentPage);
    const pageNote = pageKey
      ? `\n\n[User is on: ${pageKey}${body.pageContext ? ` — "${body.pageContext}"` : ""}]`
      : "";
    const systemContent = COPILOT_SYSTEM_PROMPT + pageNote;

    if (!isCopilotConfigured()) {
      if (
        respondWithFallback(
          res,
          userMessage,
          pageKey,
          "CoPilot AI is not configured (missing OPENAI_API_KEY). Here's guidance from SplitSheet's built-in knowledge:",
        )
      ) {
        return;
      }
      return res.status(503).json({
        error: "CoPilot is not configured. Add OPENAI_API_KEY to your .env file.",
      });
    }

    try {
      const stream = await streamCopilotCompletion(
        systemContent,
        body.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          res.write(
            `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`,
          );
        }
        if (chunk.choices[0]?.finish_reason) {
          res.write("data: [DONE]\n\n");
        }
      }

      res.end();
    } catch (err: unknown) {
      console.error("[COPILOT ERROR]", err);

      const errorIntro = getOpenAIErrorMessage(err);
      const fallback = getFallbackResponse(userMessage, pageKey);
      const combined = fallback ? `${errorIntro}\n\n${fallback}` : errorIntro;

      if (!res.headersSent) {
        if (fallback) {
          streamTextAsSSE(res, combined);
          return;
        }
        res.status(500).json({
          error: errorIntro,
          code: "copilot_unavailable",
        });
        return;
      }

      appendTextAsSSE(res, `\n\n${combined}`);
    }
  });

  app.get("/api/copilot/health", isAuthenticated, (_req, res) => {
    res.json({
      configured: isCopilotConfigured(),
      model: getCopilotModel(),
      status: isCopilotConfigured() ? "ready" : "missing_api_key",
      fallback: "available",
    });
  });
}
