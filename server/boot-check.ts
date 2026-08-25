/**
 * Fail fast with a clear message when required runtime config is missing.
 * Prevents opaque Vercel FUNCTION_INVOCATION_FAILED crashes during getApp().
 */
import {
  isVercelRuntime,
  isProductionLike,
  useLocalAuthProvider,
  hasSocialCredentials,
  allowLocalAuthInProduction,
} from "./runtime";

export function assertRuntimeEnv(): void {
  const missing: string[] = [];
  const hasDb = Boolean(
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  );
  if (!hasDb) missing.push("DATABASE_URL (or NEON_DATABASE_URL)");
  if (!process.env.SESSION_SECRET) missing.push("SESSION_SECRET");

  const isProd = isProductionLike();
  const useLocalAuth = useLocalAuthProvider();

  if (isProd) {
    if (process.env.LOCAL_DEV === "true") {
      throw new Error(
        "LOCAL_DEV=true is not allowed when NODE_ENV=production / Vercel. Set LOCAL_DEV=false.",
      );
    }

    if (
      process.env.AUTH_PROVIDER === "local" &&
      !allowLocalAuthInProduction()
    ) {
      throw new Error(
        "AUTH_PROVIDER=local on production requires ALLOW_LOCAL_AUTH_IN_PRODUCTION=true (break-glass only).",
      );
    }

    if (useLocalAuth) {
      // Explicit break-glass local operator login
    } else if (process.env.AUTH_PROVIDER === "social") {
      if (!hasSocialCredentials()) {
        missing.push(
          "GOOGLE_CLIENT_ID/SECRET (or GitHub/Microsoft/Apple) — required when AUTH_PROVIDER=social",
        );
      }
    } else if (hasSocialCredentials()) {
      // credentials present — social auth will be used
    } else {
      if (!process.env.REPL_ID) missing.push("REPL_ID");
      if (!process.env.REPLIT_DOMAINS) {
        missing.push(
          "REPLIT_DOMAINS (hostname only) — or set AUTH_PROVIDER=social with OAuth credentials",
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
