/**
 * Fail fast with a clear message when required runtime config is missing.
 * Prevents opaque Vercel FUNCTION_INVOCATION_FAILED crashes during getApp().
 */
import { isVercelRuntime } from "./runtime";

export function assertRuntimeEnv(): void {
  const missing: string[] = [];
  const hasDb = Boolean(
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  );
  if (!hasDb) missing.push("DATABASE_URL (or NEON_DATABASE_URL)");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");

  const isProd =
    process.env.NODE_ENV === "production" || isVercelRuntime();

  if (isProd) {
    if (process.env.LOCAL_DEV === "true") {
      throw new Error(
        "LOCAL_DEV=true is not allowed when NODE_ENV=production / Vercel. Set LOCAL_DEV=false.",
      );
    }
    // main branch auth is Replit OIDC outside local-dev mode
    if (!process.env.REPL_ID) missing.push("REPL_ID");
    if (!process.env.REPLIT_DOMAINS) {
      missing.push(
        "REPLIT_DOMAINS (hostname only, e.g. your-app.vercel.app)",
      );
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "In Vercel, ensure these are enabled for the Environment that is deploying (Production vs Preview), then Redeploy.",
    );
  }
}
