import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

/**
 * SESSION
 */
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;

  const pgStore = connectPg(session);

  return session({
    secret: process.env.SESSION_SECRET!,
    store: new pgStore({
      conString: process.env.DATABASE_URL!,
      tableName: "sessions",
      createTableIfMissing: true,
      ttl: sessionTtl,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

/**
 * SESSION MAPPER
 */
function updateUserSession(user: any, tokens: any) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

/**
 * FIXED UPSERT USER (NO STORAGE LAYER)
 */
async function upsertUser(claims: any) {
  const id = claims.sub;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  if (existing.length) {
    await db
      .update(users)
      .set({
        email: claims.email,
        firstName: claims.first_name,
        lastName: claims.last_name,
        profileImageUrl: claims.profile_image_url,
      })
      .where(eq(users.id, id));
  } else {
    await db.insert(users).values({
      id,
      email: claims.email,
      firstName: claims.first_name,
      lastName: claims.last_name,
      profileImageUrl: claims.profile_image_url,
    });
  }
}

/**
 * AUTH SETUP
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:5000";
  const STRATEGY_NAME = "replitauth";

  const verify: VerifyFunction = async (tokens, done) => {
    try {
      const user: any = {};
      updateUserSession(user, tokens);

      await upsertUser(tokens.claims());

      done(null, user);
    } catch (err) {
      done(err as Error);
    }
  };

  passport.use(
    new Strategy(
      {
        name: STRATEGY_NAME,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify
    )
  );

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));

  /**
   * LOGIN
   */
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(STRATEGY_NAME)(req, res, next);
  });

  /**
   * CALLBACK
   */
  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(STRATEGY_NAME, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  /**
   * LOGOUT
   */
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

/**
 * AUTH MIDDLEWARE (FIXED SAFE REFRESH)
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);

  if (now <= user.expires_at) return next();

  // ⚠️ SAFE FAIL: disable refresh to avoid invalid_grant crashes
  return res.status(401).json({
    message: "Session expired. Please login again.",
  });
};