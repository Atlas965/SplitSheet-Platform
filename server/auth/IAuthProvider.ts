/**
 * server/auth/IAuthProvider.ts
 * Priority 2.1 — Auth provider abstraction for off-Replit portability.
 */
import type { Express, Request, Response } from "express";

export interface AuthUserClaims {
  sub: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string | null;
  exp?: number;
}

export interface IAuthProvider {
  /** Register login/callback/logout routes and session middleware. */
  setup(app: Express): Promise<void>;
  /** Start login (optional — most providers register /api/login in setup). */
  initiate(req: Request, res: Response): void | Promise<void>;
  callback(req: Request, res: Response): void | Promise<void>;
  logout(req: Request, res: Response): void | Promise<void>;
  /** Extract claims from an authenticated request, or null. */
  getUserFromRequest(req: Request): AuthUserClaims | null;
}

export type AuthProviderName = "replit" | "oidc" | "local";

/** Resolve AUTH_PROVIDER with backward-compatible defaults. */
export function resolveAuthProviderName(): AuthProviderName {
  const explicit = process.env.AUTH_PROVIDER?.toLowerCase();
  if (explicit === "replit" || explicit === "oidc" || explicit === "local") {
    return explicit;
  }
  if (process.env.NODE_ENV === "development" && process.env.LOCAL_DEV === "true") {
    return "local";
  }
  return "replit";
}
