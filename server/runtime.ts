/**
 * Runtime detection helpers for long-running hosts vs Vercel Functions.
 */

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

/** Production-like host: public deployment must not use passwordless local auth by accident. */
export function isProductionLike(): boolean {
  return process.env.NODE_ENV === "production" || isVercelRuntime();
}

/**
 * Explicit break-glass for operator local login on production-like hosts.
 * Requires AUTH_PROVIDER=local AND ALLOW_LOCAL_AUTH_IN_PRODUCTION=true.
 */
export function allowLocalAuthInProduction(): boolean {
  return process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION === "true";
}

/** True when at least one social OAuth provider has credentials configured. */
export function hasSocialCredentials(): boolean {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
      (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ||
      (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) ||
      (process.env.APPLE_CLIENT_ID &&
        process.env.APPLE_TEAM_ID &&
        process.env.APPLE_KEY_ID &&
        process.env.APPLE_PRIVATE_KEY),
  );
}

/**
 * Operator / passwordless local login.
 * Never auto-enabled on Vercel/production — only AUTH_PROVIDER=local
 * (plus ALLOW_LOCAL_AUTH_IN_PRODUCTION on prod-like hosts).
 */
export function useLocalAuthProvider(): boolean {
  if (process.env.AUTH_PROVIDER === "local") {
    if (isProductionLike() && !allowLocalAuthInProduction()) {
      return false;
    }
    return true;
  }
  if (
    process.env.AUTH_PROVIDER === "replit" ||
    process.env.AUTH_PROVIDER === "oidc" ||
    process.env.AUTH_PROVIDER === "social"
  ) {
    return false;
  }
  if (hasSocialCredentials()) return false;
  // Do NOT fall back to passwordless local on Vercel when misconfigured.
  return false;
}

export function useSocialAuthProvider(): boolean {
  if (process.env.AUTH_PROVIDER === "social") return true;
  if (process.env.AUTH_PROVIDER === "local") return false;
  if (process.env.AUTH_PROVIDER === "replit" || process.env.AUTH_PROVIDER === "oidc") {
    return false;
  }
  return hasSocialCredentials();
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
