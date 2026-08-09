/**
 * Runtime detection helpers for long-running hosts vs Vercel Functions.
 */

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

/** Boot migrations/seeds are unsafe on frequent cold starts — run via CI/db:migrate instead. */
export function shouldSkipBootMigrations(): boolean {
  return (
    process.env.SKIP_BOOT_MIGRATIONS === "true" || isVercelRuntime()
  );
}
