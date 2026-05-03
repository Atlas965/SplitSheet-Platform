/**
 * server/payment-service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Core SplitSheet payment engine.
 *
 * Responsibilities:
 *  1. Currency-safe math (integer cents — no floats)
 *  2. Agreement enforcement (contract must be signed + locked)
 *  3. Split validation (must total 100%)
 *  4. PaymentIntent creation (on-platform charge)
 *  5. Multi-party transfer execution (to each collaborator's Connect account)
 *  6. Revenue event + payout record ledger updates
 *  7. Transfer retry queue (in-memory; replace with BullMQ in production)
 *
 * Works with EXISTING tables: song_assets, ownership_records, revenue_events,
 *   payout_records, user_balances, contracts, contract_collaborators
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Stripe from "stripe";
import { db } from "./db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2023-10-16",
});

// Platform fee: 2.5% default, configurable per env
const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? "250"); // basis points

// ── 1. CURRENCY-SAFE MATH ─────────────────────────────────────────────────────

/** Convert display dollars to integer cents. NEVER use floats for money. */
export const toCents = (dollars: number): number => Math.round(dollars * 100);

/** Convert cents back to display dollars */
export const fromCents = (cents: number): string => (cents / 100).toFixed(2);

/**
 * Split `totalCents` across collaborators by percentage.
 * Uses largest-remainder method to handle rounding without losing a cent.
 *
 * @returns Array of { userId, stripeAccountId, cents, ownershipPct }
 * All cents are integers. Sum guaranteed == totalCents.
 */
export function calculateSplits(
  totalCents: number,
  collaborators: { userId: string; stripeAccountId: string; ownershipPct: number }[]
): { userId: string; stripeAccountId: string; cents: number; ownershipPct: number }[] {
  // Validate percentages
  const total = collaborators.reduce((s, c) => s + c.ownershipPct, 0);
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Split percentages must sum to 100%. Got: ${total.toFixed(4)}%`);
  }

  // Calculate raw (decimal) amounts
  const raw = collaborators.map((c) => ({
    ...c,
    exact: totalCents * (c.ownershipPct / 100),
    floor: Math.floor(totalCents * (c.ownershipPct / 100)),
  }));

  // Distribute remainder using largest-remainder method
  const totalFloor  = raw.reduce((s, r) => s + r.floor, 0);
  let remainder     = totalCents - totalFloor;

  // Sort by fractional remainder descending, assign extra cents to top N
  const sorted = [...raw].sort((a, b) => (b.exact - b.floor) - (a.exact - a.floor));
  return collaborators.map((c) => {
    const r   = sorted.find((s) => s.userId === c.userId)!;
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder--;
    return { userId: c.userId, stripeAccountId: c.stripeAccountId, cents: r.floor + extra, ownershipPct: c.ownershipPct };
  });
}

/** Deduct platform fee from gross amount. Returns { netCents, feeCents }. */
export function deductPlatformFee(grossCents: number, feeBps = PLATFORM_FEE_BPS) {
  const feeCents = Math.round(grossCents * feeBps / 10_000);
  return { netCents: grossCents - feeCents, feeCents };
}

// ── 2. AGREEMENT ENFORCEMENT ──────────────────────────────────────────────────

interface EnforcementResult {
  allowed: boolean;
  reason?: string;
}

export async function enforceAgreement(contractId: string): Promise<EnforcementResult> {
  const rows = await db.execute(sql`
    SELECT status, data
    FROM contracts WHERE id = ${contractId} LIMIT 1
  `);
  const contract = rows.rows[0] as any;
  if (!contract) return { allowed: false, reason: "Contract not found" };

  // Contract must be in 'signed' or 'locked' status
  if (!["signed", "locked", "active"].includes(contract.status)) {
    return {
      allowed: false,
      reason: `Contract must be signed before payment. Current status: ${contract.status}`,
    };
  }

  // Check all collaborators have signed
  const sigRows = await db.execute(sql`
    SELECT cc.id, cc.email, cc.name,
           COUNT(cs.id) AS sig_count
    FROM contract_collaborators cc
    LEFT JOIN contract_signatures cs
      ON cs.contract_id = cc.contract_id
     AND cs.signer_email = cc.email
    WHERE cc.contract_id = ${contractId}
    GROUP BY cc.id, cc.email, cc.name
    HAVING COUNT(cs.id) = 0
  `);
  if (sigRows.rows.length > 0) {
    const unsigned = (sigRows.rows as any[]).map((r) => r.name).join(", ");
    return { allowed: false, reason: `Unsigned collaborators: ${unsigned}` };
  }

  return { allowed: true };
}

// ── 3. RESOLVE COLLABORATOR STRIPE ACCOUNTS ───────────────────────────────────

interface CollaboratorPayee {
  userId:           string;
  email:            string;
  name:             string;
  ownershipPct:     number;
  stripeAccountId:  string;
}

export async function resolvePayees(contractId: string): Promise<CollaboratorPayee[]> {
  const rows = await db.execute(sql`
    SELECT
      cc.id, cc.name, cc.email,
      cc.ownership_percentage::float AS ownership_pct,
      u.id AS user_id,
      u.stripe_connect_account_id,
      u.stripe_connect_onboarded,
      u.stripe_connect_charges_enabled
    FROM contract_collaborators cc
    LEFT JOIN users u ON u.email = cc.email
    WHERE cc.contract_id = ${contractId}
  `);

  const payees: CollaboratorPayee[] = [];
  const missing: string[] = [];

  for (const row of rows.rows as any[]) {
    if (!row.stripe_connect_account_id || !row.stripe_connect_onboarded) {
      missing.push(row.name);
      continue;
    }
    payees.push({
      userId:          row.user_id,
      email:           row.email,
      name:            row.name,
      ownershipPct:    Number(row.ownership_pct),
      stripeAccountId: row.stripe_connect_account_id,
    });
  }

  if (missing.length > 0) {
    throw new Error(
      `These collaborators have not connected Stripe: ${missing.join(", ")}. ` +
      `They must complete Stripe onboarding before payouts can be processed.`
    );
  }

  return payees;
}

// ── 4. CREATE PAYMENT INTENT ──────────────────────────────────────────────────

interface CreatePaymentParams {
  contractId:  string;
  assetId:     string;
  source:      "streaming" | "sync" | "performance" | "mechanical" | "other";
  grossCents:  number;
  currency:    string;
  description: string;
  requesterId: string;    // user initiating the payment
}

interface PaymentIntentResult {
  paymentIntentId: string;
  clientSecret:    string;
  netCents:        number;
  feeCents:        number;
  revenueEventId:  string;
}

export async function createSplitPaymentIntent(
  params: CreatePaymentParams
): Promise<PaymentIntentResult> {
  const { contractId, assetId, source, grossCents, currency, description, requesterId } = params;

  // Enforce agreement
  const enforcement = await enforceAgreement(contractId);
  if (!enforcement.allowed) {
    throw new Error(`Payment blocked: ${enforcement.reason}`);
  }

  const { netCents, feeCents } = deductPlatformFee(grossCents);

  // Create a revenue event record BEFORE charging (idempotency)
  const revenueResult = await db.execute(sql`
    INSERT INTO revenue_events
      (asset_id, source, amount, currency, description, metadata)
    VALUES
      (${assetId}, ${source}, ${fromCents(grossCents)}, ${currency},
       ${description}, ${{ contractId, requesterId, feeCents }}::jsonb)
    RETURNING id
  `);
  const revenueEventId = (revenueResult.rows[0] as any).id as string;

  // Create Stripe PaymentIntent (on-platform account charges the payer)
  const idempotencyKey = `pi-${revenueEventId}`;
  const intent = await stripe.paymentIntents.create(
    {
      amount:   grossCents,
      currency: currency.toLowerCase(),
      description,
      metadata: {
        revenueEventId,
        contractId,
        assetId,
        source,
        splitsheet_fee_cents: feeCents.toString(),
      },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey }
  );

  // Update revenue event with intent id
  await db.execute(sql`
    UPDATE revenue_events
    SET metadata = metadata || ${{ stripePaymentIntentId: intent.id }}::jsonb
    WHERE id = ${revenueEventId}
  `);

  return {
    paymentIntentId: intent.id,
    clientSecret:    intent.client_secret!,
    netCents,
    feeCents,
    revenueEventId,
  };
}

// ── 5. EXECUTE SPLITS (after PaymentIntent succeeds) ──────────────────────────

interface ExecuteSplitsParams {
  revenueEventId:  string;
  contractId:      string;
  paymentIntentId: string;
  grossCents:      number;
  currency:        string;
}

interface SplitResult {
  success:       boolean;
  totalPaid:     number;   // cents
  failedPayees:  string[];
  payouts:       { userId: string; cents: number; transferId: string }[];
}

export async function executeSplits(params: ExecuteSplitsParams): Promise<SplitResult> {
  const { revenueEventId, contractId, paymentIntentId, grossCents, currency } = params;

  const { netCents } = deductPlatformFee(grossCents);

  // Get payees from contract
  const payees = await resolvePayees(contractId);
  const splits  = calculateSplits(netCents, payees);

  const payouts:      { userId: string; cents: number; transferId: string }[] = [];
  const failedPayees: string[] = [];

  for (const split of splits) {
    if (split.cents <= 0) continue; // skip zero-allocation splits

    const idempotencyKey = `transfer-${revenueEventId}-${split.userId}`;

    try {
      // Create transfer to collaborator's Connect account
      const transfer = await stripe.transfers.create(
        {
          amount:             split.cents,
          currency:           currency.toLowerCase(),
          destination:        split.stripeAccountId,
          source_transaction: paymentIntentId,  // links to the original charge
          description:        `SplitSheet payout — ${fromCents(split.cents)} ${currency.toUpperCase()}`,
          metadata: {
            revenueEventId,
            contractId,
            userId: split.userId,
            ownershipPct: split.ownershipPct.toString(),
          },
        },
        { idempotencyKey }
      );

      // Record payout
      await db.execute(sql`
        INSERT INTO payout_records
          (revenue_event_id, user_id, asset_id, ownership_percentage,
           amount, currency, status, stripe_transfer_id, processed_at)
        SELECT
          ${revenueEventId}, ${split.userId},
          re.asset_id, ${split.ownershipPct},
          ${fromCents(split.cents)}, ${currency}, 'completed',
          ${transfer.id}, NOW()
        FROM revenue_events re WHERE re.id = ${revenueEventId}
        ON CONFLICT DO NOTHING
      `);

      // Update user balance
      await db.execute(sql`
        INSERT INTO user_balances (user_id, total_earned, total_paid, pending_balance, currency)
        VALUES (${split.userId}, ${fromCents(split.cents)}, ${fromCents(split.cents)}, '0', ${currency})
        ON CONFLICT (user_id) DO UPDATE SET
          total_earned    = user_balances.total_earned    + ${fromCents(split.cents)}::decimal,
          total_paid      = user_balances.total_paid      + ${fromCents(split.cents)}::decimal,
          updated_at      = NOW()
      `);

      payouts.push({ userId: split.userId, cents: split.cents, transferId: transfer.id });
      log("TRANSFER_SUCCESS", { userId: split.userId, cents: split.cents, transferId: transfer.id });

    } catch (err: any) {
      log("TRANSFER_FAILED", { userId: split.userId, cents: split.cents, error: err.message });

      // Record failed payout
      await db.execute(sql`
        INSERT INTO payout_records
          (revenue_event_id, user_id, asset_id, ownership_percentage,
           amount, currency, status)
        SELECT ${revenueEventId}, ${split.userId}, re.asset_id, ${split.ownershipPct},
               ${fromCents(split.cents)}, ${currency}, 'failed'
        FROM revenue_events re WHERE re.id = ${revenueEventId}
        ON CONFLICT DO NOTHING
      `);

      failedPayees.push(split.userId);

      // Queue for retry (in-memory — replace with BullMQ in production)
      scheduleRetry({
        revenueEventId,
        userId:          split.userId,
        stripeAccountId: split.stripeAccountId,
        cents:           split.cents,
        currency,
        idempotencyKey,
        attempt:         1,
      });
    }
  }

  return {
    success:    failedPayees.length === 0,
    totalPaid:  payouts.reduce((s, p) => s + p.cents, 0),
    failedPayees,
    payouts,
  };
}

// ── 6. RETRY QUEUE (in-memory — upgrade to BullMQ for production) ─────────────

interface RetryJob {
  revenueEventId:  string;
  userId:          string;
  stripeAccountId: string;
  cents:           number;
  currency:        string;
  idempotencyKey:  string;
  attempt:         number;
}

const MAX_ATTEMPTS = 4;
const RETRY_DELAYS = [60_000, 300_000, 900_000, 3_600_000]; // 1m, 5m, 15m, 1h

function scheduleRetry(job: RetryJob): void {
  if (job.attempt > MAX_ATTEMPTS) {
    log("RETRY_EXHAUSTED", { ...job });
    return;
  }
  const delay = RETRY_DELAYS[job.attempt - 1] ?? 3_600_000;
  log("RETRY_SCHEDULED", { ...job, delayMs: delay });

  setTimeout(async () => {
    try {
      const transfer = await stripe.transfers.create(
        {
          amount:      job.cents,
          currency:    job.currency.toLowerCase(),
          destination: job.stripeAccountId,
          description: `SplitSheet retry payout #${job.attempt}`,
          metadata:    { revenueEventId: job.revenueEventId, userId: job.userId, attempt: job.attempt.toString() },
        },
        { idempotencyKey: `${job.idempotencyKey}-retry-${job.attempt}` }
      );

      await db.execute(sql`
        UPDATE payout_records
        SET status = 'completed', stripe_transfer_id = ${transfer.id}, processed_at = NOW()
        WHERE revenue_event_id = ${job.revenueEventId} AND user_id = ${job.userId}
      `);

      await db.execute(sql`
        INSERT INTO user_balances (user_id, total_earned, total_paid, pending_balance, currency)
        VALUES (${job.userId}, ${fromCents(job.cents)}, ${fromCents(job.cents)}, '0', ${job.currency})
        ON CONFLICT (user_id) DO UPDATE SET
          total_earned = user_balances.total_earned + ${fromCents(job.cents)}::decimal,
          total_paid   = user_balances.total_paid   + ${fromCents(job.cents)}::decimal,
          updated_at   = NOW()
      `);

      log("RETRY_SUCCESS", { ...job, transferId: transfer.id });
    } catch (err: any) {
      log("RETRY_FAILED", { ...job, error: err.message });
      scheduleRetry({ ...job, attempt: job.attempt + 1 });
    }
  }, delay);
}

// ── 7. LOGGER ─────────────────────────────────────────────────────────────────

type LogLevel = "INFO" | "WARN" | "ERROR" |
  "TRANSFER_SUCCESS" | "TRANSFER_FAILED" |
  "RETRY_SCHEDULED" | "RETRY_SUCCESS" | "RETRY_FAILED" | "RETRY_EXHAUSTED";

function log(level: LogLevel, data: Record<string, unknown>): void {
  const entry = {
    ts:    new Date().toISOString(),
    level,
    svc:   "payment-service",
    ...data,
  };
  // Structured JSON to stdout — pipe to Datadog/CloudWatch/Grafana in production
  console.log(JSON.stringify(entry));
}