/**
 * Fail fast with a clear message when required runtime config is missing.
 * Prevents opaque Vercel FUNCTION_INVOCATION_FAILED crashes during getApp().
 */
import { isVercelRuntime, useLocalAuthProvider, hasSocialCredentials } from "./runtime";

export function assertRuntimeEnv(): void {
  const missing: string[] = [];
  const hasDb = Boolean(
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  );
  if (!hasDb) missing.push("DATABASE_URL (or NEON_DATABASE_URL)");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");

  const isProd =
    process.env.NODE_ENV === "production" || isVercelRuntime();
  const useLocalAuth = useLocalAuthProvider();

  if (isProd) {
    if (process.env.LOCAL_DEV === "true") {
      throw new Error(
        "LOCAL_DEV=true is not allowed when NODE_ENV=production / Vercel. Set LOCAL_DEV=false and use AUTH_PROVIDER=local for operator login.",
      );
    }

    if (useLocalAuth) {
      // Operator login — no Replit OIDC vars required
    } else if (process.env.AUTH_PROVIDER === "social" || hasSocialCredentials()) {
      // Social OAuth — credentials validated when strategies register
      if (!hasSocialCredentials()) {
        missing.push(
          "GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (or GitHub / Microsoft / Apple credentials)",
        );
      }
    } else {
      if (!process.env.REPL_ID) missing.push("REPL_ID");
      if (!process.env.REPLIT_DOMAINS) {
        missing.push(
          "REPLIT_DOMAINS (hostname only) — or set AUTH_PROVIDER=social / local",
        );
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        "In Vercel, ensure these are enabled for Production (and Preview), then Redeploy.",
    );
  }
}
