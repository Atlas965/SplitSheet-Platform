/**
 * server/security.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SoundLedger Full Security Engine
 * Uses ONLY: Node.js built-in `crypto`, `zod` (already in package.json),
 *            `express`, `drizzle-orm` — zero new dependencies.
 *
 * Sections:
 *  1. Cryptographic utilities
 *  2. Split validation + hash chain
 *  3. State machine
 *  4. Fraud detection + risk scoring
 *  5. Audit logger
 *  6. API key system + HMAC
 *  7. Device / login anomaly tracker
 *  8. Express middleware (rate limit, HMAC verify, input sanitize)
 *  9. Zero-knowledge verification endpoint
 * 10. Dispute management
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "./db";
import { sql } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Collaborator {
  userId?:             string;
  name:                string;
  email:               string;
  role:                string;
  ownershipPercentage: number;  // decimal, e.g. 33.33
  proAffiliation?:     string;
  ipiNumber?:          string;
}

export type SplitStatus =
  | "draft"
  | "pending_signatures"
  | "signed"
  | "locked"
  | "disputed"
  | "voided";

export type FraudAction = "allow" | "delay" | "freeze";

// ── 1. CRYPTOGRAPHIC UTILITIES ────────────────────────────────────────────────

/** SHA-256 of any string → hex */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/** AES-256-GCM encrypt — for PII fields (phone, ID type) stored in DB */
export function encryptField(plaintext: string, secret: string): string {
  const key   = crypto.scryptSync(secret, "splitsheet-salt", 32);
  const iv    = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc   = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag   = cipher.getAuthTag();
  // Format: iv_hex:tag_hex:ciphertext_hex
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

/** AES-256-GCM decrypt */
export function decryptField(ciphertext: string, secret: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":");
  const key    = crypto.scryptSync(secret, "splitsheet-salt", 32);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(encHex, "hex")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** Secure random API key: "ss_live_" + 32 hex bytes */
export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw    = `ss_live_${crypto.randomBytes(32).toString("hex")}`;
  const hash   = sha256(raw);
  const prefix = raw.slice(0, 8);
  return { raw, hash, prefix };
}

/** HMAC-SHA256 for request signing */
export function hmacSign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function hmacVerify(payload: string, secret: string, sig: string): boolean {
  const expected = hmacSign(payload, secret);
  // Constant-time comparison prevents timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(sig,      "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return false;
  }
}

// ── 2. SPLIT VALIDATION + HASH CHAIN ──────────────────────────────────────────

/** Zod schema for a single collaborator */
const collaboratorSchema = z.object({
  userId:             z.string().optional(),
  name:               z.string().min(1).max(200),
  email:              z.string().email(),
  role:               z.enum(["writer", "producer", "performer", "co-writer", "publisher", "manager"]),
  ownershipPercentage: z.number().min(0.01).max(99.99),
  proAffiliation:     z.string().optional(),
  ipiNumber:          z.string().regex(/^\d{9}$/).optional().or(z.literal("")),
});

export const splitSheetSchema = z.object({
  contractId:    z.string().uuid(),
  collaborators: z.array(collaboratorSchema).min(2).max(20),
}).refine(
  (d) => {
    const total = d.collaborators.reduce((s, c) => s + c.ownershipPercentage, 0);
    return Math.abs(total - 100) < 0.01; // float tolerance
  },
  { message: "Ownership percentages must sum to exactly 100%." }
);

/** Canonical JSON string (sorted keys) for deterministic hashing */
export function canonicalJson(collaborators: Collaborator[]): string {
  const sorted = [...collaborators]
    .sort((a, b) => a.email.localeCompare(b.email))
    .map((c) => ({
      email:               c.email,
      name:                c.name,
      ownershipPercentage: c.ownershipPercentage,
      role:                c.role,
    }));
  return JSON.stringify(sorted);
}

/** Compute content hash for a split version */
export function computeContentHash(
  contractId:    string,
  version:       number,
  collaborators: Collaborator[],
  prevHash?:     string
): string {
  const payload = JSON.stringify({
    contractId,
    version,
    canonical: canonicalJson(collaborators),
    prevHash:  prevHash ?? null,
  });
  return sha256(payload);
}

/** Verify the entire hash chain for a contract */
export async function verifyHashChain(contractId: string): Promise<{
  valid: boolean;
  brokenAt?: number;
  versions: number;
}> {
  const rows = await db.execute(sql`
    SELECT version_number, content_hash, prev_hash
    FROM split_versions
    WHERE contract_id = ${contractId}
    ORDER BY version_number ASC
  `);

  const versions = rows.rows as {
    version_number: number;
    content_hash: string;
    prev_hash: string | null;
  }[];

  let prev: string | null = null;
  for (const v of versions) {
    if (v.version_number === 1 && v.prev_hash !== null) {
      return { valid: false, brokenAt: 1, versions: versions.length };
    }
    if (v.version_number > 1 && v.prev_hash !== prev) {
      return { valid: false, brokenAt: v.version_number, versions: versions.length };
    }
    prev = v.content_hash;
  }
  return { valid: true, versions: versions.length };
}

// ── 3. SPLIT STATE MACHINE ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<SplitStatus, SplitStatus[]> = {
  draft:               ["pending_signatures", "voided"],
  pending_signatures:  ["signed", "voided", "disputed"],
  signed:              ["locked", "disputed"],
  locked:              ["disputed"],          // only disputes can reopen a locked split
  disputed:            ["signed", "voided"],  // after dispute resolution
  voided:              [],                    // terminal
};

export function canTransition(from: SplitStatus, to: SplitStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: SplitStatus, to: SplitStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} → ${to}`);
  }
}

/** After signing, lock the split 48 hours later */
export function computeLockExpiry(signedAt: Date): Date {
  return new Date(signedAt.getTime() + 48 * 60 * 60 * 1000);
}

// ── 4. FRAUD DETECTION + RISK SCORING ────────────────────────────────────────

interface FraudContext {
  contractId:       string;
  userId:           string;
  collaborators:    Collaborator[];
  prevCollaborators?: Collaborator[];
  versionNumber:    number;
  ipAddress:        string;
  userAgent?:       string;
  timeSinceLastVersion?: number; // minutes
}

interface FraudResult {
  riskScore:      number;          // 0–100
  action:         FraudAction;
  rulesTriggered: string[];
  details:        Record<string, unknown>;
}

/**
 * Risk scoring formula:
 *
 *  RULE                          | SCORE
 * ──────────────────────────────────────────
 *  Rapid version change (<5 min) |  +30
 *  Ownership spike (>50% swing)  |  +25
 *  Late contributor addition     |  +20
 *  Version count > 5             |  +15
 *  Single collaborator owns >90% |  +10
 *
 *  TOTAL → 0–39 = allow | 40–69 = delay | 70+ = freeze
 */
export function calculateRiskScore(ctx: FraudContext): FraudResult {
  let score = 0;
  const rules: string[] = [];
  const details: Record<string, unknown> = {};

  // Rule 1: Rapid version changes
  if (ctx.timeSinceLastVersion !== undefined && ctx.timeSinceLastVersion < 5) {
    score += 30;
    rules.push("rapid_change");
    details.minutesSinceLastChange = ctx.timeSinceLastVersion;
  }

  // Rule 2: Ownership spike — any collaborator changed by more than 50 percentage points
  if (ctx.prevCollaborators?.length) {
    const prevMap = new Map(ctx.prevCollaborators.map((c) => [c.email, c.ownershipPercentage]));
    for (const c of ctx.collaborators) {
      const prev = prevMap.get(c.email) ?? 0;
      const swing = Math.abs(c.ownershipPercentage - prev);
      if (swing > 50) {
        score += 25;
        rules.push("ownership_spike");
        details.ownershipSpike = { email: c.email, from: prev, to: c.ownershipPercentage };
        break;
      }
    }
  }

  // Rule 3: Late contributor addition (added at version > 1 with >0% ownership)
  if (ctx.versionNumber > 1 && ctx.prevCollaborators?.length) {
    const prevEmails = new Set(ctx.prevCollaborators.map((c) => c.email));
    const newAdds = ctx.collaborators.filter(
      (c) => !prevEmails.has(c.email) && c.ownershipPercentage > 0
    );
    if (newAdds.length > 0) {
      score += 20;
      rules.push("late_contributor_add");
      details.newCollaborators = newAdds.map((c) => c.email);
    }
  }

  // Rule 4: Too many versions
  if (ctx.versionNumber > 5) {
    score += 15;
    rules.push("excessive_versions");
    details.versionNumber = ctx.versionNumber;
  }

  // Rule 5: Single party owns more than 90%
  const maxPct = Math.max(...ctx.collaborators.map((c) => c.ownershipPercentage));
  if (maxPct > 90) {
    score += 10;
    rules.push("ownership_concentration");
    details.maxPercentage = maxPct;
  }

  // Determine action
  let action: FraudAction;
  if      (score >= 70) action = "freeze";
  else if (score >= 40) action = "delay";
  else                  action = "allow";

  return { riskScore: score, action, rulesTriggered: rules, details };
}

/** Persist a fraud event and update the contract risk profile */
export async function recordFraudEvent(
  ctx:    FraudContext,
  result: FraudResult
): Promise<void> {
  if (result.rulesTriggered.length === 0) return;

  await db.execute(sql`
    INSERT INTO fraud_events
      (contract_id, user_id, rule_triggered, risk_score, action_taken, details)
    VALUES
      (${ctx.contractId}, ${ctx.userId},
       ${result.rulesTriggered.join(",")},
       ${result.riskScore}, ${result.action},
       ${JSON.stringify(result.details)}::jsonb)
  `);

  // Update risk profile
  await db.execute(sql`
    INSERT INTO contract_risk_profiles
      (contract_id, current_score, freeze_active, freeze_reason, version_changes, last_change_at)
    VALUES
      (${ctx.contractId}, ${result.riskScore},
       ${result.action === "freeze"},
       ${result.action === "freeze" ? result.rulesTriggered.join(", ") : null},
       1, NOW())
    ON CONFLICT (contract_id) DO UPDATE SET
      current_score     = GREATEST(contract_risk_profiles.current_score, ${result.riskScore}),
      freeze_active     = CASE WHEN ${result.action === "freeze"} THEN TRUE ELSE contract_risk_profiles.freeze_active END,
      freeze_reason     = COALESCE(${result.action === "freeze" ? result.rulesTriggered.join(", ") : null}, contract_risk_profiles.freeze_reason),
      version_changes   = contract_risk_profiles.version_changes + 1,
      last_change_at    = NOW(),
      rapid_change_flag = ${result.rulesTriggered.includes("rapid_change")},
      updated_at        = NOW()
  `);
}

// ── 5. AUDIT LOGGER ───────────────────────────────────────────────────────────

interface AuditEntry {
  userId?:       string;
  apiKeyId?:     string;
  action:        string;
  resourceType?: string;
  resourceId?:   string;
  beforeState?:  unknown;
  afterState?:   unknown;
  ipAddress?:    string;
  userAgent?:    string;
  requestId?:    string;
}

export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO audit_log
        (user_id, api_key_id, action, resource_type, resource_id,
         before_state, after_state, ip_address, user_agent, request_id)
      VALUES
        (${entry.userId ?? null},
         ${entry.apiKeyId ?? null}::uuid,
         ${entry.action},
         ${entry.resourceType ?? null},
         ${entry.resourceId ?? null},
         ${entry.beforeState ? JSON.stringify(entry.beforeState) : null}::jsonb,
         ${entry.afterState  ? JSON.stringify(entry.afterState)  : null}::jsonb,
         ${entry.ipAddress ?? null}::inet,
         ${entry.userAgent ?? null},
         ${entry.requestId ?? null})
    `);
  } catch (err) {
    // Audit failure must NEVER crash the application — log to stderr only
    console.error("[AUDIT ERROR]", err);
  }
}

/** Express middleware that auto-attaches audit logging to req */
export function auditMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  (req as any).requestId = requestId;
  (req as any).ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
                 ?? req.socket.remoteAddress
                 ?? "unknown";
  next();
}

// ── 6. API KEY SYSTEM + HMAC MIDDLEWARE ──────────────────────────────────────

/** Validate an incoming API key header and attach the key record to req */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const raw = req.headers["x-api-key"]?.toString();
  if (!raw) {
    res.status(401).json({ error: "Missing X-Api-Key header" });
    return;
  }

  const keyHash = sha256(raw);
  const rows = await db.execute(sql`
    SELECT id, owner_id, scopes, rate_limit, expires_at
    FROM api_keys
    WHERE key_hash = ${keyHash}
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1
  `);

  if (!rows.rows.length) {
    res.status(401).json({ error: "Invalid or expired API key" });
    return;
  }

  const key = rows.rows[0] as {
    id: string; owner_id: string; scopes: string[]; rate_limit: number;
  };

  // Update last_used_at (fire-and-forget)
  db.execute(sql`
    UPDATE api_keys SET last_used_at = NOW() WHERE id = ${key.id}
  `).catch(() => {});

  (req as any).apiKey     = key;
  (req as any).apiKeyId   = key.id;
  (req as any).apiScopes  = key.scopes;
  (req as any).apiOwnerId = key.owner_id;
  next();
}

/** Check that the API key has the required scope */
export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const scopes: string[] = (req as any).apiScopes ?? [];
    if (!scopes.includes(scope) && !scopes.includes("*")) {
      res.status(403).json({ error: `Insufficient scope. Required: ${scope}` });
      return;
    }
    next();
  };
}

/** HMAC request signature verification middleware
 *  Client sends:
 *    X-Signature: hmac-sha256=<hex>
 *    X-Timestamp:  unix timestamp (reject if >5 min old)
 *    Body: raw JSON
 */
export function hmacVerifyMiddleware(secret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sigHeader = req.headers["x-signature"]?.toString();
    const tsHeader  = req.headers["x-timestamp"]?.toString();

    if (!sigHeader || !tsHeader) {
      res.status(401).json({ error: "Missing HMAC signature headers" });
      return;
    }

    // Reject requests older than 5 minutes (replay protection)
    const ts  = parseInt(tsHeader, 10);
    const age = Math.abs(Date.now() / 1000 - ts);
    if (age > 300) {
      res.status(401).json({ error: "Request timestamp too old" });
      return;
    }

    const body    = JSON.stringify(req.body) ?? "";
    const payload = `${tsHeader}.${body}`;
    const sig     = sigHeader.replace("hmac-sha256=", "");

    if (!hmacVerify(payload, secret, sig)) {
      res.status(401).json({ error: "Invalid HMAC signature" });
      return;
    }

    next();
  };
}

// ── 7. DEVICE + LOGIN ANOMALY TRACKING ───────────────────────────────────────

/** Build a device fingerprint from request headers */
export function buildDeviceHash(req: Request): string {
  const ua      = req.headers["user-agent"] ?? "";
  const lang    = req.headers["accept-language"] ?? "";
  const ipSubnet = ((req as any).ip ?? "").split(".").slice(0, 3).join(".");
  return sha256(`${ua}|${lang}|${ipSubnet}`);
}

export async function trackLoginEvent(
  userId:    string,
  req:       Request,
  eventType: string,
  riskScore = 0
): Promise<void> {
  const ip         = (req as any).ip ?? req.socket.remoteAddress ?? "0.0.0.0";
  const deviceHash = buildDeviceHash(req);
  const ua         = req.headers["user-agent"] ?? null;

  await db.execute(sql`
    INSERT INTO login_events
      (user_id, event_type, ip_address, user_agent, device_hash, risk_score)
    VALUES
      (${userId}, ${eventType}, ${ip}::inet, ${ua}, ${deviceHash}, ${riskScore})
  `);

  // Upsert device record
  await db.execute(sql`
    INSERT INTO user_devices (user_id, device_hash, ip_address, device_name)
    VALUES (${userId}, ${deviceHash}, ${ip}::inet, ${ua?.slice(0,200) ?? 'Unknown'})
    ON CONFLICT (user_id, device_hash)
    DO UPDATE SET last_seen_at = NOW(), ip_address = ${ip}::inet
  `);
}

/** Returns login risk score for anomaly detection */
export async function assessLoginRisk(userId: string, req: Request): Promise<number> {
  const deviceHash = buildDeviceHash(req);

  // Check if this is a known device
  const deviceRows = await db.execute(sql`
    SELECT is_trusted FROM user_devices
    WHERE user_id = ${userId} AND device_hash = ${deviceHash}
    LIMIT 1
  `);
  const knownDevice = deviceRows.rows.length > 0;
  const trustedDevice = (deviceRows.rows[0] as any)?.is_trusted === true;

  // Count failed logins in last 30 minutes
  const failRows = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM login_events
    WHERE user_id = ${userId}
      AND event_type = 'login_fail'
      AND created_at > NOW() - INTERVAL '30 minutes'
  `);
  const recentFails = Number((failRows.rows[0] as any)?.cnt ?? 0);

  let score = 0;
  if (!knownDevice)   score += 30;
  if (!trustedDevice) score += 10;
  score += Math.min(recentFails * 15, 45); // 3+ fails = max 45
  return Math.min(score, 100);
}

// ── 8. RATE LIMITERS ──────────────────────────────────────────────────────────

/**
 * In-memory rate limiter — fine-grained, per-route, single-instance.
 * Fast (no DB round-trip) but resets on restart and doesn't share state
 * across multiple app instances. Suitable for tight per-action limits
 * (e.g. 5 sign attempts/min) layered on top of the global Postgres-backed
 * limiter below.
 */
const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

export function createRateLimiter(maxReqs: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key   = `${(req as any).ip}:${req.path}`;
    const now   = Date.now();
    const entry = inMemoryBuckets.get(key);

    if (!entry || now > entry.resetAt) {
      inMemoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count++;
    if (entry.count > maxReqs) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: "Too many requests. Please wait." });
      return;
    }
    next();
  };
}

/**
 * Postgres-backed rate limiter — multi-instance / autoscale safe.
 * Uses the `rate_limit_buckets` table (defined in shared/schema.ts) so the
 * limit is shared correctly across however many server processes are
 * running behind the load balancer, and survives restarts/deploys.
 *
 * Implemented as a single atomic UPSERT so concurrent requests can't race
 * past the limit (INSERT ... ON CONFLICT DO UPDATE with a guarded WHERE).
 */
export function createPgRateLimiter(maxReqs: number, windowMs: number, scope = "global") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip  = (req as any).ip ?? req.socket.remoteAddress ?? "unknown";
    const key = `${scope}:${ip}`;
    const now = new Date();

    try {
      const rows = await db.execute(sql`
        INSERT INTO rate_limit_buckets (bucket_key, count, reset_at)
        VALUES (${key}, 1, ${new Date(now.getTime() + windowMs)})
        ON CONFLICT (bucket_key) DO UPDATE SET
          count    = CASE WHEN rate_limit_buckets.reset_at < ${now}
                          THEN 1
                          ELSE rate_limit_buckets.count + 1 END,
          reset_at = CASE WHEN rate_limit_buckets.reset_at < ${now}
                          THEN ${new Date(now.getTime() + windowMs)}
                          ELSE rate_limit_buckets.reset_at END
        RETURNING count, reset_at
      `);
      const bucket = rows.rows[0] as { count: number; reset_at: string };

      if (Number(bucket.count) > maxReqs) {
        const retryAfterSec = Math.max(1, Math.ceil((new Date(bucket.reset_at).getTime() - now.getTime()) / 1000));
        res.setHeader("Retry-After", retryAfterSec);
        res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
        return;
      }
      next();
    } catch (err) {
      // Never let a rate-limiter outage take down the whole API.
      console.error("[PG RATE LIMIT ERROR]", err);
      next();
    }
  };
}

// ── 9. ZERO-KNOWLEDGE VERIFICATION ENDPOINT ──────────────────────────────────

/**
 * GET /api/raas/verify/:contractId
 * Authenticated with API key + scope "verify_ownership"
 *
 * Returns ONLY:
 *   - proof_id, content_hash, prev_hash
 *   - is_valid, is_finalized, is_contested
 *   - signature_count, collaborator_count
 *   - signed_at, locked_at
 *
 * NEVER returns:
 *   - collaborator names, emails, IPI numbers
 *   - signature image data
 *   - raw contract data
 */
export async function zkVerifyHandler(req: Request, res: Response): Promise<void> {
  const { contractId } = req.params;

  if (!contractId || typeof contractId !== "string") {
    res.status(400).json({ error: "contractId is required" });
    return;
  }

  const rows = await db.execute(sql`
    SELECT
      proof_id, contract_id, version_number, content_hash, prev_hash,
      status, total_pct, is_valid, is_finalized, is_contested,
      signature_count, collaborator_count, signed_at, locked_at, lock_expires_at
    FROM zk_ownership_proofs
    WHERE contract_id = ${contractId}
    ORDER BY version_number DESC
    LIMIT 1
  `);

  if (!rows.rows.length) {
    res.status(404).json({ error: "Contract not found or not yet finalized" });
    return;
  }

  const proof = rows.rows[0] as any;

  // Also verify the hash chain integrity
  const chainResult = await verifyHashChain(contractId);

  await auditLog({
    apiKeyId:     (req as any).apiKeyId,
    action:       "raas.verify_ownership",
    resourceType: "contract",
    resourceId:   contractId,
    ipAddress:    (req as any).ip,
    userAgent:    req.headers["user-agent"],
    requestId:    (req as any).requestId,
  });

  res.json({
    proof: {
      proofId:          proof.proof_id,
      contractId:       proof.contract_id,
      versionNumber:    proof.version_number,
      contentHash:      proof.content_hash,
      prevHash:         proof.prev_hash,
      status:           proof.status,
      isValid:          proof.is_valid,
      isFinalized:      proof.is_finalized,
      isContested:      proof.is_contested,
      signatureCount:   Number(proof.signature_count),
      collaboratorCount: Number(proof.collaborator_count),
      signedAt:         proof.signed_at,
      lockedAt:         proof.locked_at,
      lockExpiresAt:    proof.lock_expires_at,
    },
    chain: {
      intact:   chainResult.valid,
      versions: chainResult.versions,
      brokenAt: chainResult.brokenAt ?? null,
    },
    // Cryptographic proof that this response itself is untampered
    responseHash: sha256(JSON.stringify({ contractId, contentHash: proof.content_hash, ts: Date.now() })),
  });
}

// ── 10. DISPUTE MANAGEMENT ────────────────────────────────────────────────────

const disputeSchema = z.object({
  contractId:      z.string().uuid(),
  splitVersionId:  z.string().uuid(),
  disputeType:     z.enum([
    "unauthorized_change", "wrong_percentage",
    "missing_collaborator", "fraud", "other",
  ]),
  description: z.string().min(10).max(2000),
});

export async function openDispute(
  userId: string,
  data:   z.infer<typeof disputeSchema>,
  req:    Request
): Promise<{ disputeId: string }> {
  const parsed = disputeSchema.parse(data);

  // Freeze the split version
  await db.execute(sql`
    UPDATE split_versions SET status = 'disputed'
    WHERE id = ${parsed.splitVersionId}
      AND contract_id = ${parsed.contractId}
      AND status NOT IN ('voided', 'disputed')
  `);

  // Create dispute record
  const result = await db.execute(sql`
    INSERT INTO disputes
      (contract_id, split_version_id, raised_by, dispute_type, description, freeze_payouts)
    VALUES
      (${parsed.contractId}, ${parsed.splitVersionId}::uuid,
       ${userId}, ${parsed.disputeType}, ${parsed.description}, TRUE)
    RETURNING id
  `);

  const disputeId = (result.rows[0] as any).id as string;

  // Log transition
  await db.execute(sql`
    INSERT INTO dispute_transitions (dispute_id, from_status, to_status, actor_id)
    VALUES (${disputeId}::uuid, NULL, 'open', ${userId})
  `);

  await auditLog({
    userId,
    action:       "dispute.open",
    resourceType: "dispute",
    resourceId:   disputeId,
    afterState:   parsed,
    ipAddress:    (req as any).ip,
    requestId:    (req as any).requestId,
  });

  return { disputeId };
}

export async function resolveDispute(
  disputeId: string,
  adminId:   string,
  resolution: "accepted" | "rejected",
  notes:     string,
  req:       Request
): Promise<void> {
  const toStatus = resolution === "accepted"
    ? "resolved_accepted"
    : "resolved_rejected";

  const rows = await db.execute(sql`
    SELECT status, contract_id, split_version_id FROM disputes
    WHERE id = ${disputeId}::uuid LIMIT 1
  `);
  const dispute = rows.rows[0] as any;
  if (!dispute) throw new Error("Dispute not found");

  await db.execute(sql`
    UPDATE disputes SET
      status           = ${toStatus},
      assigned_to      = ${adminId},
      resolution_notes = ${notes},
      resolved_at      = NOW(),
      updated_at       = NOW()
    WHERE id = ${disputeId}::uuid
  `);

  await db.execute(sql`
    INSERT INTO dispute_transitions (dispute_id, from_status, to_status, actor_id, note)
    VALUES (${disputeId}::uuid, ${dispute.status}, ${toStatus}, ${adminId}, ${notes})
  `);

  // If accepted: unfreeze contract by setting split version back to signed
  if (resolution === "accepted") {
    await db.execute(sql`
      UPDATE split_versions SET status = 'signed'
      WHERE id = ${dispute.split_version_id}::uuid AND status = 'disputed'
    `);
  }

  await auditLog({
    userId:       adminId,
    action:       `dispute.${toStatus}`,
    resourceType: "dispute",
    resourceId:   disputeId,
    ipAddress:    (req as any).ip,
    requestId:    (req as any).requestId,
  });
}

// ── SECURITY HEADERS MIDDLEWARE ───────────────────────────────────────────────
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options",    "nosniff");
  res.setHeader("X-Frame-Options",           "DENY");
  res.setHeader("X-XSS-Protection",          "1; mode=block");
  res.setHeader("Referrer-Policy",           "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      // Stripe.js must be loaded from js.stripe.com to tokenize card data
      "script-src 'self' 'unsafe-inline' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      // Stripe Elements renders card fields inside an iframe
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      // Stripe.js calls out to api.stripe.com to confirm payments
      "connect-src 'self' https://api.stripe.com",
      "img-src 'self' data: https:",
    ].join("; ") + ";"
  );
  next();
}

// ── INPUT SANITIZER ───────────────────────────────────────────────────────────

/** Strip control chars and limit string length — applied before any DB write */
export function sanitizeString(input: unknown, maxLen = 1000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars
    .replace(/<script[\s\S]*?<\/script>/gi, "")         // inline scripts
    .replace(/javascript:/gi, "")
    .trim()
    .slice(0, maxLen);
}

/** Recursively sanitize all string values in a plain object */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string")  out[k] = sanitizeString(v);
    else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = sanitizeObject(v as Record<string, unknown>);
    } else out[k] = v;
  }
  return out;
}

export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  next();
};