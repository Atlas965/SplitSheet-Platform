/**
 * server/copilot-quota.ts — Priority 6.1 per-user daily token caps.
 */
import { db } from "./db";
import { copilotUsage } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getDailyTokenCap(subscriptionTier?: string | null): number {
  const envCap = Number(process.env.COPILOT_DAILY_TOKEN_CAP);
  if (Number.isFinite(envCap) && envCap > 0) return envCap;

  switch (subscriptionTier) {
    case "studio_pro":
    case "label":
      return 200_000;
    case "pro":
    case "creator_pro":
      return 80_000;
    default:
      return 20_000;
  }
}

export async function getTodayTokenUsage(userId: string): Promise<number> {
  const day = todayUtc();
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${copilotUsage.tokensIn} + ${copilotUsage.tokensOut}), 0)`,
    })
    .from(copilotUsage)
    .where(and(eq(copilotUsage.userId, userId), eq(copilotUsage.day, day)));
  return Number(row?.total ?? 0);
}

export async function recordCopilotUsage(opts: {
  userId: string;
  orgId?: string | null;
  tokensIn: number;
  tokensOut: number;
  model?: string;
}): Promise<void> {
  await db.insert(copilotUsage).values({
    userId: opts.userId,
    orgId: opts.orgId ?? null,
    tokensIn: opts.tokensIn,
    tokensOut: opts.tokensOut,
    model: opts.model ?? null,
    day: todayUtc(),
  });
}

export async function assertCopilotQuota(
  userId: string,
  subscriptionTier?: string | null,
): Promise<{ allowed: boolean; used: number; cap: number }> {
  const cap = getDailyTokenCap(subscriptionTier);
  const used = await getTodayTokenUsage(userId);
  return { allowed: used < cap, used, cap };
}
