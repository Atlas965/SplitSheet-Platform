/**
 * Phase 6 — contributor confirmation token policy helpers (pure / DB schema ensure).
 * Contributors stay accountless; links remain public with fail-closed checks.
 */
import { sql } from "drizzle-orm";
import { db } from "./db";

export type ConfirmationTokenRow = {
  status?: string | null;
  expires_at?: Date | string | null;
  revoked_at?: Date | string | null;
  consumed_at?: Date | string | null;
};

export type TokenGateResult =
  | { ok: true }
  | { ok: false; status: 410 | 403; error: string };

export function evaluateConfirmationToken(
  row: ConfirmationTokenRow,
  opts: { forSubmit?: boolean } = {},
): TokenGateResult {
  if (row.revoked_at) {
    return {
      ok: false,
      status: 410,
      error: "This confirmation link was revoked. Ask the operator for a new link.",
    };
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return {
      ok: false,
      status: 410,
      error: "This confirmation link has expired. Ask the operator to resend.",
    };
  }
  if (opts.forSubmit && row.consumed_at && row.status === "confirmed") {
    // Idempotent confirm is allowed by callers; change_request after consume is blocked
    return { ok: true };
  }
  if (row.status === "revoked") {
    return {
      ok: false,
      status: 410,
      error: "This confirmation link was revoked. Ask the operator for a new link.",
    };
  }
  return { ok: true };
}

/** Runtime DDL for Vercel / cold starts (idempotent). */
export async function ensureContributorTokenSchema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE split_confirmations
      ADD COLUMN IF NOT EXISTS revoked_at timestamp;
  `);
  await db.execute(sql`
    ALTER TABLE split_confirmations
      ADD COLUMN IF NOT EXISTS consumed_at timestamp;
  `);
  await db.execute(sql`
    ALTER TABLE split_confirmations
      ADD COLUMN IF NOT EXISTS consent_versions jsonb;
  `);
}

export async function ensureLegalOrgAcceptanceSchema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE legal_acceptances
      ADD COLUMN IF NOT EXISTS organization_id varchar;
  `);
}

export async function ensureOrgStripeCustomerSchema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS stripe_customer_id varchar;
  `);
}
