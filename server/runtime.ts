/**
 * Runtime detection helpers for long-running hosts vs Vercel Functions.
 */

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

/** Prefer operator login on Vercel when AUTH_PROVIDER is unset or local. */
export function useLocalAuthProvider(): boolean {
  if (process.env.AUTH_PROVIDER === "local") return true;
  if (
    process.env.AUTH_PROVIDER === "replit" ||
    process.env.AUTH_PROVIDER === "oidc"
  ) {
    return false;
  }
  return isVercelRuntime();
}

/** Boot migrations/seeds are unsafe on frequent cold starts — except local-auth needs schema. */
export function shouldSkipBootMigrations(): boolean {
  return (
    process.env.SKIP_BOOT_MIGRATIONS === "true" || isVercelRuntime()
  );
}

/** In-process setInterval schedulers are unreliable on Vercel. */
export function shouldStartInProcessScheduler(): boolean {
  if (isVercelRuntime()) return false;
  return process.env.ENABLE_PAYOUT_RECONCILE === "true";
}
