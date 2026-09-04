import type Stripe from "stripe";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";

async function ignoreMissing(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err: any) {
    console.warn(`[workspace-reset] ${label} skipped:`, err?.message ?? err);
  }
}

/** Deletes only this operator's inputted records and returns them to Starter. */
export async function resetOperatorWorkspace(
  userId: string,
  stripe: Stripe | null,
): Promise<{ deletedProjects: number; cancelledStripe: boolean }> {
  const user = await storage.getUser(userId);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  let cancelledStripe = false;
  if (user.stripeSubscriptionId && stripe) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      cancelledStripe = true;
    } catch (err: any) {
      console.warn("[workspace-reset] Stripe cancel skipped:", err?.message);
    }
  }

  const mine = await storage.getContracts(userId);
  const ids = mine.map((c) => c.id);

  for (const id of ids) {
    await ignoreMissing("signatures", () =>
      db.execute(sql`DELETE FROM contract_signatures WHERE contract_id = ${id}`),
    );
    await ignoreMissing("confirmations", () =>
      db.execute(sql`DELETE FROM split_confirmations WHERE contract_id = ${id}`),
    );
    await ignoreMissing("collaborators", () =>
      db.execute(sql`DELETE FROM contract_collaborators WHERE contract_id = ${id}`),
    );
    await ignoreMissing("license_records", () =>
      db.execute(sql`DELETE FROM license_records WHERE contract_id = ${id}`),
    );
  }

  await ignoreMissing("ownership", () =>
    db.execute(sql`
      DELETE FROM ownership_records
      WHERE asset_id IN (SELECT id FROM song_assets WHERE created_by = ${userId})
    `),
  );
  await ignoreMissing("song_assets", () =>
    db.execute(sql`DELETE FROM song_assets WHERE created_by = ${userId}`),
  );

  for (const id of ids) {
    await ignoreMissing("contract", () => storage.deleteContract(id));
  }

  await ignoreMissing("notifications", () =>
    db.execute(sql`DELETE FROM notifications WHERE user_id = ${userId}`),
  );
  await ignoreMissing("operator_clients", () =>
    db.execute(sql`DELETE FROM operator_clients WHERE created_by = ${userId}`),
  );

  await storage.updateUser(userId, {
    subscriptionTier: "free",
    subscriptionStatus: "free",
    stripeSubscriptionId: null as unknown as string,
  });

  return { deletedProjects: ids.length, cancelledStripe };
}
