/**
 * GenericOIDCProvider — Auth0 / Clerk / Cognito / WorkOS via env (Priority 2.1).
 * Env: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI
 */
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import memoize from "memoizee";
import type { Express, Request, Response } from "express";
import type { AuthUserClaims, IAuthProvider } from "../IAuthProvider";
import { createSessionMiddleware } from "../session";
import { upsertUserFromClaims } from "../upsertUser";

const STRATEGY_NAME = "generic-oidc";

const getConfig = memoize(
  async () => {
    const issuer = process.env.OIDC_ISSUER;
    const clientId = process.env.OIDC_CLIENT_ID;
    if (!issuer || !clientId) {
      throw new Error("OIDC_ISSUER and OIDC_CLIENT_ID are required when AUTH_PROVIDER=oidc");
    }
    return client.discovery(new URL(issuer), clientId, {
      client_secret: process.env.OIDC_CLIENT_SECRET,
    });
  },
  { maxAge: 3600 * 1000 },
);

function updateUserSession(user: any, tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers) {
  const claims = tokens.claims();
  user.claims = {
    sub: String(claims.sub),
    email: (claims.email as string) ?? (claims.preferred_username as string),
    first_name: (claims.given_name as string) ?? (claims.name as string),
    last_name: claims.family_name as string | undefined,
    profile_image_url: claims.picture as string | undefined,
    exp: claims.exp,
  };
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = claims.exp;
}

export class GenericOIDCProvider implements IAuthProvider {
  async setup(app: Express): Promise<void> {
    app.set("trust proxy", 1);
    app.use(createSessionMiddleware());
    app.use(passport.initialize());
    app.use(passport.session());

    const config = await getConfig();
    const redirectUri =
      process.env.OIDC_REDIRECT_URI ??
      `${process.env.APP_BASE_URL ?? "http://localhost:5000"}/api/callback`;

    const verify: VerifyFunction = async (tokens, verified) => {
      const user: any = {};
      updateUserSession(user, tokens);
      await upsertUserFromClaims(user.claims);
      verified(null, user);
    };

    passport.use(
      new Strategy(
        {
          name: STRATEGY_NAME,
          config,
          scope: "openid email profile offline_access",
          callbackURL: redirectUri,
        },
        verify,
      ),
    );

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res, next) => this.initiate(req, res, next));
    app.get("/api/callback", (req, res, next) => this.callback(req, res, next));
    app.get("/api/logout", (req, res) => this.logout(req, res));
  }

  initiate(req: Request, res: Response, next?: any): void {
    passport.authenticate(STRATEGY_NAME, {
      prompt: "login",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  }

  callback(req: Request, res: Response, next?: any): void {
    passport.authenticate(STRATEGY_NAME, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  }

  logout(req: Request, res: Response): void {
    req.logout(() => res.redirect("/"));
  }

  getUserFromRequest(req: Request): AuthUserClaims | null {
    return (req as any).user?.claims ?? null;
  }

  async refreshIfNeeded(user: any): Promise<boolean> {
    if (!user.refresh_token) return false;
    try {
      const config = await getConfig();
      const tokenResponse = await client.refreshTokenGrant(config, user.refresh_token);
      updateUserSession(user, tokenResponse);
      return true;
    } catch {
      return false;
    }
  }
}
