import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { isAuthenticated } from "./replitAuth";

// ── Input validator ───────────────────────────────────────────────────────────
const copilotSchema = z.object({
  messages: z.array(
    z.object({
      role:    z.enum(["user", "assistant"]),
      content: z.string().min(1).max(8000),
    })
  ).min(1).max(40),
  currentPage:  z.string().max(200).optional(),
  pageContext:  z.string().max(200).optional(),
});

// ── System prompt — full product + music industry knowledge ───────────────────
const SYSTEM_PROMPT = `You are SoundLedger CoPilot, the expert AI assistant embedded inside SplitSheet — a Canadian music agreement and rights management platform built by SoundLedger Technologies Inc.

Your role is to guide music industry operators (independent artists, producers, studios, publishers) through the platform's features and answer music industry questions. You are professional, concise, warm, and deeply knowledgeable.

═══ PLATFORM KNOWLEDGE ════════════════════════════════════════════════════════

OPERATOR WORKFLOW (4 stages):
1. Client Intake — add an artist, producer, or label as a client
2. Split Setup — create a project, add contributors, set ownership percentages
3. Contributor Confirmation — generate token-based links, send via WhatsApp/SMS/
   Instagram DMs, contributors confirm on a public page with zero account required
4. Confirmed Record — timestamped, IP-logged, PDF-exportable agreement

AGREEMENT TYPES:
- Split Sheet: documents composition and master ownership percentages
- Producer Agreement: terms between producer and artist for a recording
- Performance Agreement: live performance terms
- Management Agreement: artist management terms and commission rates

RIGHTS SYSTEM:
- Composition (PA copyright): melody + lyrics — tracked via ownershipPercentage
- Master Recording (SR copyright): the actual sound file — tracked via
  masterOwnershipPercentage (separate field)
- These two rights are tracked separately because a producer might own 30% of
  the master but 0% of the composition — conflating them is the most common
  and expensive mistake in music collaboration
- The 100% rule: composition percentages must total 100.000% independently of
  master percentages — both tracked separately

PRO AFFILIATIONS (Performance Rights Organizations):
- SOCAN: Society of Composers, Authors and Music Publishers of Canada
  — default for all Canadian operators — handles performance AND mechanical
- MROC: Music Rights Ontario Canada — neighbouring rights for performers
- ARTISTI: neighbouring rights society in Quebec
- ACTRA RACS: neighbouring rights for English-Canadian performers
- ASCAP, BMI, SESAC, GMR: US-based PROs
- PRS: UK Performing Right Society
- IPI/CAE Number: 9-digit identifier assigned by your PRO when you register —
  required for CWR export and PRO registration; leave blank if not yet registered
- ISWC: International Standard Musical Work Code — assigned after PRO
  registration, identifies a specific composition globally

CWR EXPORT:
- Common Works Registration format — accepted by SOCAN, ASCAP, BMI, PRS,
  and 80+ PROs worldwide
- Generated directly from a confirmed split sheet in SplitSheet
- Submit through your PRO's online portal or member services

CONFIRMATION SYSTEM:
- Each contributor gets a unique 64-character token link (/confirm/{id}/{token})
- Links expire 72 hours after generation
- No account or login required for the contributor
- Captures: name, email (optional), IP address, user agent, timestamp
- After all contributors confirm, contract status automatically moves to "signed"
- All activity is logged in an immutable audit trail

PRICING (all CAD):
- Free / Starter Split: $0 — 1 project, 2 contributors, basic workflow
- Split Session: $25/session — up to 5 contributors, full confirmation workflow,
  audit log, email confirmations, PDF export
- Multi-Creator Project: $50–75/project — up to 10 contributors, revision rounds,
  priority support, enhanced audit history
- Express Add-on: +$25 — same-day rush processing, priority confirmation flow
- Creator Support Plan: $10–20/month (coming soon) — unlimited history,
  analytics, saved contributor profiles, recurring team workflows
- Enterprise: custom pricing — labels, publishers, distributors, API access

FINANCIAL (for operators):
- Stripe Connect Express accounts for payouts to collaborators
- Platform fee: 2.5% on processed payments (configurable)
- Largest-remainder method for split calculation — no cents lost
- Idempotent webhook processing — prevents double-transfers

═══ MUSIC INDUSTRY KNOWLEDGE ══════════════════════════════════════════════════

ROYALTY TYPES:
- Mechanical royalties: paid by distributors for reproduction of compositions
  on recordings. Statutory rate in Canada set by Copyright Board.
- Performance royalties: paid by radio/TV/streaming for public performance of
  compositions. Collected by PROs (SOCAN), split writer share / publisher share.
- Neighbouring rights: paid to performers and record labels for master
  recordings played on radio and streaming — collected by MROC/ARTISTI/ACTRA RACS
- Synchronization fees: flat fees for using a composition in film, TV, ads
  — requires both a sync license (composition) and master license (recording)
- Artist royalties: paid by labels to recording artists per the recording
  agreement — separate from mechanical royalties, typically recoupable from
  advances (unlike mechanicals which are paid from record one)

WRITER / PUBLISHER SPLIT:
- PROs pay income in two halves: writer share (to the songwriter directly)
  and publisher share (to the music publisher)
- If you write and publish your own music, you collect both halves
- ASCAP/BMI/SESAC/GMR each pay these on separate statements

COMMON MISTAKES SPLITSHEET PREVENTS:
- Undocumented splits: 70% of collaborator disputes come from no written record
- Single-number ownership: treating one "% ownership" as covering both
  composition and master rights
- PRO conflicts: two writers registering conflicting ownership with their PROs
  causes royalty freezes that can last months or years
- Missing IPI numbers: societies cannot match payments without IPI/CAE
- ISRC absence: without ISRCs, streaming platforms cannot properly track
  and pay for master recordings

═══ BEHAVIOR RULES ════════════════════════════════════════════════════════════

- Answer in 2–5 sentences for simple questions
- Use numbered steps for any process or workflow
- NEVER give legal advice — always recommend consulting a qualified entertainment
  lawyer for legal questions. Phrase it as: "For legal advice specific to your
  situation, consult a qualified music entertainment lawyer."
- Always quote pricing in CAD
- If you don't know something, say so clearly — never fabricate platform features
- Be encouraging — many users are independent artists doing this for the first time
- Use plain language; explain jargon when it appears rather than assuming knowledge
- When the user mentions a page they are on, tailor your guidance to that page's
  specific features and the most likely next action they need to take`;

// ── Rate limiting (in-memory, per user, 20 req/min) ──────────────────────────
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now   = Date.now();
  const entry = rateLimits.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count++;
  return true;
}

// ── Register route ────────────────────────────────────────────────────────────
export function registerCopilotRoutes(app: Express): void {

  /**
   * POST /api/copilot
   * Streams tokens back as Server-Sent Events (SSE).
   * Compatible with the fetch-based streaming reader in SoundLedgerCopilot.tsx.
   */
  app.post("/api/copilot", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.claims?.sub ?? "anonymous";

    // Rate limit
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: "Too many requests. Please wait a moment before asking another question.",
      });
    }

    // Validate input
    let body: z.infer<typeof copilotSchema>;
    try {
      body = copilotSchema.parse(req.body);
    } catch (err: any) {
      return res.status(400).json({
        error: "Invalid request format.",
        issues: err?.errors ?? [],
      });
    }

    // Check OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: "CoPilot is not configured. Add OPENAI_API_KEY to your environment.",
      });
    }

    // Build messages with optional page context injected
    const pageNote = body.currentPage
      ? `\n\n[User is currently on: ${body.currentPage}${body.pageContext ? ` — "${body.pageContext}"` : ""}]`
      : "";

    const systemContent = SYSTEM_PROMPT + pageNote;

    // Set up SSE headers
    res.setHeader("Content-Type",  "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection",    "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");  // disable Nginx buffering in Replit
    res.flushHeaders();

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const stream = await openai.chat.completions.create({
        model:       process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        max_tokens:  800,
        temperature: 0.5,  // lower = more consistent, factual responses
        stream:      true,
        messages: [
          { role: "system", content: systemContent },
          ...body.messages.map(m => ({
            role:    m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
      });

      // Forward each token as an SSE chunk
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          // OpenAI SSE format — client reader parses this
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`);
          // Flush to prevent buffering (important in Replit/Node)
          if ((res as any).flush) (res as any).flush();
        }

        // Stream finished
        if (chunk.choices[0]?.finish_reason) {
          res.write("data: [DONE]\n\n");
        }
      }

      res.end();

    } catch (err: any) {
      console.error("[COPILOT ERROR]", err?.message ?? err);

      // If headers already sent (mid-stream), send error as SSE
      if (res.headersSent) {
        const errMsg = "I encountered an issue processing your request. Please try again.";
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: errMsg } }] })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        res.status(500).json({
          error: "CoPilot encountered an error. Please try again.",
        });
      }
    }
  });

  /**
   * GET /api/copilot/health
   * Simple health check — confirms OpenAI is configured without making an API call.
   */
  app.get("/api/copilot/health", isAuthenticated, (_req, res) => {
    res.json({
      configured: !!process.env.OPENAI_API_KEY,
      model:      process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      status:     process.env.OPENAI_API_KEY ? "ready" : "missing_api_key",
    });
  });
}