/**
 * server/jobs/reconcile-payouts.ts — Priority 3.4 hourly payout reconciliation.
 * Enabled when ENABLE_PAYOUT_RECONCILE=true.
 */
import Stripe from "stripe";
import { db } from "../db";
import { sql } from "drizzle-orm";

const AGE_HOURS = 24;

export async function reconcileStalePayouts(): Promise<{ checked: number; fixed: number; diverged: number }> {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.warn("[reconcile-payouts] STRIPE_SECRET_KEY missing — skip");
    return { checked: 0, fixed: 0, diverged: 0 };
  }

  const stripe = new Stripe(secret, { apiVersion: "2025-08-27.basil" as any });
  const cutoff = new Date(Date.now() - AGE_HOURS * 60 * 60 * 1000);

  const rows = await db.execute(sql`
    SELECT id, stripe_transfer_id, status
    FROM payout_records
    WHERE status IN ('pending', 'processing')
      AND created_at < ${cutoff}
    LIMIT 100
  `);

  const list = (rows as any).rows ?? rows;
  let checked = 0;
  let fixed = 0;
  let diverged = 0;

  for (const row of list as Array<{ id: string; stripe_transfer_id: string | null; status: string }>) {
    checked++;
    if (!row.stripe_transfer_id) continue;

    try {
      const transfer = await stripe.transfers.retrieve(row.stripe_transfer_id);
      const reversed = (transfer.reversed || (transfer.amount_reversed ?? 0) > 0);
      const nextStatus = reversed ? "failed" : "completed";

      if (row.status !== nextStatus && nextStatus === "completed") {
        await db.execute(sql`
          UPDATE payout_records
          SET status = 'completed', processed_at = NOW()
          WHERE id = ${row.id}
        `);
        fixed++;
      } else if (reversed && row.status !== "failed") {
        await db.execute(sql`
          UPDATE payout_records SET status = 'failed' WHERE id = ${row.id}
        `);
        fixed++;
      }
    } catch (err: any) {
      diverged++;
      console.error("[reconcile-payouts] divergence", row.id, err?.message);
      try {
        await db.execute(sql`
          INSERT INTO error_logs (message, context, created_at)
          VALUES (
            ${"payout_reconcile_divergence"},
            ${JSON.stringify({ payoutId: row.id, transferId: row.stripe_transfer_id, error: err?.message })},
            NOW()
          )
        `);
      } catch {
        // error_logs table may not exist in all envs — log only
      }
    }
  }

  console.log(`[reconcile-payouts] checked=${checked} fixed=${fixed} diverged=${diverged}`);
  return { checked, fixed, diverged };
}

export function startPayoutReconcileScheduler(): void {
  if (process.env.ENABLE_PAYOUT_RECONCILE !== "true") return;

  const HOUR_MS = 60 * 60 * 1000;
  console.log("[reconcile-payouts] scheduler enabled (hourly)");
  // First run after 1 minute, then hourly (no node-cron hard dep)
  setTimeout(() => {
    reconcileStalePayouts().catch(console.error);
    setInterval(() => reconcileStalePayouts().catch(console.error), HOUR_MS);
  }, 60_000);
}
