/**
 * server/replitAuth.ts — compatibility facade (Priority 2.1).
 * Existing imports (`setupAuth`, `isAuthenticated`, `getSession`) keep working.
 * Provider selection: AUTH_PROVIDER=replit|oidc|local (defaults preserve prior behavior).
 */
import type { Express, RequestHandler } from "express";
import { getAuthProvider, resolveAuthProviderName } from "./auth";
import { createSessionMiddleware } from "./auth/session";
import { ReplitOIDCProvider } from "./auth/providers/ReplitOIDCProvider";
import { GenericOIDCProvider } from "./auth/providers/GenericOIDCProvider";

export function getSession() {
  return createSessionMiddleware();
}

export async function setupAuth(app: Express): Promise<void> {
  const provider = getAuthProvider();
  await provider.setup(app);
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const name = resolveAuthProviderName();
  if (name === "local") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const provider = getAuthProvider();
  if (provider instanceof ReplitOIDCProvider || provider instanceof GenericOIDCProvider) {
    const ok = await provider.refreshIfNeeded(user);
    if (ok) return next();
  }

  return res.status(401).json({ message: "Unauthorized" });
};
