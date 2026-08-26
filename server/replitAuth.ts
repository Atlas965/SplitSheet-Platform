import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import {
  isVercelRuntime,
  isProductionLike,
  useLocalAuthProvider,
  useSocialAuthProvider,
  useAuth0Provider,
  hasAuth0Credentials,
} from "./runtime";
import {
  registerSocialAuth,
  simpleCookieParser,
  hasAnySocialProvider,
  listSocialProviders,
} from "./social-auth";
import { registerAuth0Auth } from "./auth0-auth";
import { establishSession, destroySession } from "./session-security";
import { createPgRateLimiter } from "./security";

/** Cursor/local: NODE_ENV=development + LOCAL_DEV=true */
const isLocalDev =
  process.env.NODE_ENV === "development" &&
  process.env.LOCAL_DEV === "true";

/**
 * Explicit operator login without OAuth.
 * Use locally: AUTH_PROVIDER=local (or LOCAL_DEV=true).
 * Do not use credential-less local auth for public production when social is available.
 */
const useLocalAuth = isLocalDev || useLocalAuthProvider();

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

function callbackUrlForDomain(domain: string): string {
  const protocol =
    domain.startsWith("localhost") || domain.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${domain}/api/callback`;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    // OAuth + login must persist the session cookie on first write (Vercel).
    saveUninitialized: true,
    proxy: true,
    name: "splitsheet.sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || isVercelRuntime(),
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  const existingUser = await storage.getUser(claims["sub"]);

  if (existingUser) {
    await storage.updateUser(claims["sub"], {
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  } else {
    await db.insert(users).values({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  }
}

function mountSessionStack(app: Express) {
  app.set("trust proxy", 1);
  app.use(simpleCookieParser);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));
}

async function setupLocalDevAuth(app: Express) {
  if (isProductionLike() && process.env.ALLOW_LOCAL_AUTH_IN_PRODUCTION !== "true") {
    throw new Error(
      "Local passwordless auth is blocked on production-like hosts without ALLOW_LOCAL_AUTH_IN_PRODUCTION=true",
    );
  }

  mountSessionStack(app);

  const authLimiter = createPgRateLimiter(20, 60_000, "auth-local");
  app.use("/api/login", authLimiter);

  // Still expose provider metadata + any configured social routes for testing
  if (hasAnySocialProvider()) {
    await registerSocialAuth(app);
  } else {
    app.get("/api/auth/providers", (_req, res) => {
      res.json({ providers: listSocialProviders(), localDev: true });
    });
  }

  const devClaims = {
    sub: "local-dev-operator",
    email: "dev@localhost",
    first_name: "Local",
    last_name: "Operator",
    profile_image_url: null,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  };

  app.get("/api/login", async (req, res) => {
    // Prefer the login page when social providers exist alongside local
    if (hasAnySocialProvider() && req.query.local !== "1") {
      return res.redirect("/login");
    }
    try {
      await upsertUser(devClaims);
      const user = {
        claims: devClaims,
        expires_at: devClaims.exp,
        provider: "local",
      };
      await establishSession(req, user as Express.User);
      res.redirect("/");
    } catch (err) {
      console.error("[auth] local login failed:", err);
      res.status(500).json({
        message: "Login failed",
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });

  app.get("/api/logout", async (req, res) => {
    await destroySession(req, res);
    res.redirect("/");
  });
}

async function setupSocialAuth(app: Express) {
  mountSessionStack(app);

  const authLimiter = createPgRateLimiter(30, 60_000, "auth-social");
  app.use("/api/auth", authLimiter);
  app.use("/api/login", authLimiter);

  const enabled = await registerSocialAuth(app);

  if (enabled.length === 0) {
    throw new Error(
      "AUTH_PROVIDER=social (or auto) but no provider credentials found. " +
        "Set GOOGLE_CLIENT_ID/SECRET, and/or GITHUB_*, MICROSOFT_*, APPLE_* env vars. " +
        "Passwordless local fallback is disabled on production-like hosts.",
    );
  }

  console.log(
    `[auth] Social login enabled: ${enabled.map((p) => p.id).join(", ")}`,
  );

  // /api/login sends users to the branded login page (provider buttons)
  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });

  app.get("/api/logout", async (req, res) => {
    await destroySession(req, res);
    res.redirect("/");
  });
}

async function setupReplitOidcAuth(app: Express) {
  mountSessionStack(app);

  // Also register social if credentials present (optional alongside Replit)
  if (hasAnySocialProvider()) {
    await registerSocialAuth(app);
  } else {
    app.get("/api/auth/providers", (_req, res) => {
      res.json({ providers: listSocialProviders(), localDev: false });
    });
  }

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const domains =
    process.env.REPLIT_DOMAINS?.split(",").map((d) => d.trim()).filter(Boolean) ??
    [];

  if (domains.length === 0) {
    throw new Error(
      "REPLIT_DOMAINS must be set for Replit OIDC auth (comma-separated hostnames). " +
        "Or set AUTH_PROVIDER=social with Google/Apple/GitHub credentials, or AUTH_PROVIDER=local.",
    );
  }

  for (const domain of domains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: callbackUrlForDomain(domain),
      },
      verify,
    );
    passport.use(strategy);
  }

  app.get("/api/login", (req, res, next) => {
    if (hasAnySocialProvider() && req.query.replit !== "1") {
      return res.redirect("/login");
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login?error=Sign-in%20failed",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    await destroySession(req, res);
    res.redirect(
      client.buildEndSessionUrl(config, {
        client_id: process.env.REPL_ID!,
        post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
      }).href,
    );
  });
}

async function setupAuth0Auth(app: Express) {
  mountSessionStack(app);
  await registerAuth0Auth(app);
}

export async function setupAuth(app: Express) {
  if (useLocalAuth) {
    console.log(
      "[auth] Using AUTH_PROVIDER=local (operator login via /api/login?local=1)",
    );
    await setupLocalDevAuth(app);
    return;
  }

  if (useAuth0Provider()) {
    if (!hasAuth0Credentials()) {
      throw new Error(
        "AUTH_PROVIDER=auth0 (or auto) but AUTH0_DOMAIN / AUTH0_CLIENT_ID / AUTH0_CLIENT_SECRET are missing.",
      );
    }
    console.log("[auth] Using Auth0 Universal Login");
    try {
      await setupAuth0Auth(app);
      return;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("[auth] Auth0 setup failed:", msg);
      // Do not brick the whole site when AUTH0_DOMAIN is wrong/unreachable.
      if (hasAnySocialProvider()) {
        console.warn(
          "[auth] Falling back to social OAuth after Auth0 failure. Fix AUTH0_DOMAIN in Vercel, then redeploy.",
        );
        await setupSocialAuth(app);
        return;
      }
      throw new Error(
        `Auth0 OIDC discovery failed (${msg}). Verify AUTH0_DOMAIN resolves ` +
          `(https://YOUR_DOMAIN/.well-known/openid-configuration). ` +
          `Or set AUTH_PROVIDER=social with Google credentials to restore login.`,
      );
    }
  }

  if (useSocialAuthProvider()) {
    if (!hasAnySocialProvider()) {
      if (isProductionLike()) {
        throw new Error(
          "AUTH_PROVIDER=social but no OAuth credentials configured. " +
            "Add GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET (etc.). Local passwordless fallback is disabled.",
        );
      }
      console.warn(
        "[auth] Social credentials missing in non-production — enabling local operator login for development only.",
      );
      await setupLocalDevAuth(app);
      return;
    }
    await setupSocialAuth(app);
    return;
  }

  console.log("[auth] Using Replit OIDC");
  await setupReplitOidcAuth(app);
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  if (useLocalAuth || user.provider) {
    // Social sessions use fixed TTL; expired → re-auth
    return res.status(401).json({ message: "Unauthorized" });
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
