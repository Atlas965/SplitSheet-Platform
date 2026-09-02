/**
 * Server-authoritative plan limits. UI may display these; it must not
 * be the only check.
 */
export function normalizePlanTier(tier?: string | null): string {
  const t = (tier || "free").toLowerCase();
  if (t === "starter") return "free";
  if (t === "label") return "studio_pro";
  return t;
}

/** null = unlimited */
export function projectLimitForTier(tier?: string | null): number | null {
  switch (normalizePlanTier(tier)) {
    case "free":
      return 1;
    case "session":
      return 5;
    default:
      return null;
  }
}

export function contributorLimitForTier(tier?: string | null): number | null {
  switch (normalizePlanTier(tier)) {
    case "free":
      return 2;
    case "session":
      return 5;
    default:
      return null;
  }
}

export function assertUnderLimit(
  used: number,
  limit: number | null,
  noun: string,
): { ok: true } | { ok: false; message: string } {
  if (limit == null || used < limit) return { ok: true };
  return {
    ok: false,
    message: `Starter / session plan limit reached (${used}/${limit} ${noun}). Upgrade to add more.`,
  };
}
