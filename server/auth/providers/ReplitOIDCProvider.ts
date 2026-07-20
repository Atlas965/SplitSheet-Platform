/**
 * ReplitOIDCProvider — existing Replit OIDC flow extracted (Priority 2.1).
 */
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import memoize from "memoizee";
import type { Express, Request, Response } from "express";
import type { AuthUserClaims, IAuthProvider } from "../IAuthProvider";
import { createSessionMiddleware } from "../session";
import { upsertUserFromClaims } from "../upsertUser";

const getOidcConfig = memoize(
  async () =>
    client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!,
    ),
  { maxAge: 3600 * 1000 },
);

function callbackUrlForDomain(domain: string): string {
  const protocol =
    domain.startsWith("localhost") || domain.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${domain}/api/callback`;
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

export class ReplitOIDCProvider implements IAuthProvider {
  async setup(app: Express): Promise<void> {
    app.set("trust proxy", 1);
    app.use(createSessionMiddleware());
    app.use(passport.initialize());
    app.use(passport.session());

    const config = await getOidcConfig();

    const verify: VerifyFunction = async (tokens, verified) => {
      const user: any = {};
      updateUserSession(user, tokens);
      const claims = tokens.claims();
      await upsertUserFromClaims({
        sub: String(claims.sub),
        email: claims.email as string | undefined,
        first_name: claims.first_name as string | undefined,
        last_name: claims.last_name as string | undefined,
        profile_image_url: claims.profile_image_url as string | null | undefined,
        exp: claims.exp as number | undefined,
      });
      verified(null, user);
    };

    const domains =
      process.env.REPLIT_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean) ?? [];

    if (domains.length === 0) {
      throw new Error(
        "REPLIT_DOMAINS must be set for Replit OIDC auth (comma-separated hostnames).",
      );
    }

    for (const domain of domains) {
      passport.use(
        new Strategy(
          {
            name: `replitauth:${domain}`,
            config,
            scope: "openid email profile offline_access",
            callbackURL: callbackUrlForDomain(domain),
          },
          verify,
        ),
      );
    }

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res, next) => this.initiate(req, res, next));
    app.get("/api/callback", (req, res, next) => this.callback(req, res, next));
    app.get("/api/logout", (req, res) => this.logout(req, res));
  }

  initiate(req: Request, res: Response, next?: any): void {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  }

  callback(req: Request, res: Response, next?: any): void {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const config = await getOidcConfig();
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href,
      );
    });
  }

  getUserFromRequest(req: Request): AuthUserClaims | null {
    const user = (req as any).user;
    return user?.claims ?? null;
  }

  /** Used by isAuthenticated middleware for token refresh. */
  async refreshIfNeeded(user: any): Promise<boolean> {
    const refreshToken = user.refresh_token;
    if (!refreshToken) return false;
    try {
      const config = await getOidcConfig();
      const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
      updateUserSession(user, tokenResponse);
      return true;
    } catch {
      return false;
    }
  }
}

export { getOidcConfig };
