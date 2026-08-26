/**
 * Auth0 Universal Login (OIDC) for SplitSheet operators.
 * Uses cookie PKCE (Vercel-safe) — same pattern as Google social auth.
 * Contributors remain accountless via confirmation tokens.
 */
import type { Express, Request, Response } from "express";
import * as client from "openid-client";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";
import { establishSession, destroySession } from "./session-security";
import { createPgRateLimiter } from "./security";

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;
const OAUTH_COOKIE = "oauth_state_auth0";

function isPgUniqueViolation(err: unknown): boolean {
  const e = err as any;
  const msg = String(e?.message || e?.cause?.message || e?.detail || "");
  return e?.code === "23505" || /users_email_unique|unique constraint/i.test(msg);
}

export function hasAuth0Credentials(): boolean {
  return Boolean(
    process.env.AUTH0_DOMAIN &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET,
  );
}

function auth0IssuerUrl(): URL {
  const domain = (process.env.AUTH0_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  return new URL(`https://${domain}/`);
}

function appBaseUrl(req?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.AUTH0_BASE_URL) return process.env.AUTH0_BASE_URL.replace(/\/$/, "");
  if (req) {
    const host = req.get("host") || req.hostname;
    const proto =
      host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:5000";
}

function callbackUrl(req?: Request): string {
  return `${appBaseUrl(req)}/api/auth/auth0/callback`;
}

function cookieSecure(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true"
  );
}

type Auth0CookiePayload = {
  state: string;
  codeVerifier: string;
  redirectUri: string;
  nonce: string;
};

function setAuth0Cookie(res: Response, payload: Auth0CookiePayload) {
  const secure = cookieSecure() ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
  );
}

function clearAuth0Cookie(res: Response) {
  const secure = cookieSecure() ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `${OAUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}

function readAuth0Cookie(req: Request): Auth0CookiePayload | undefined {
  const raw = (req as any).cookies?.[OAUTH_COOKIE];
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Auth0CookiePayload;
    if (parsed?.state && parsed?.codeVerifier && parsed?.redirectUri && parsed?.nonce) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

async function ensureAuth0Schema(): Promise<void> {
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS auth0_sub varchar;
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth0_sub
      ON users (auth0_sub)
      WHERE auth0_sub IS NOT NULL;
  `);
}

async function getUserByAuth0Sub(auth0Sub: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.auth0Sub, auth0Sub))
    .limit(1);
  return row;
}

async function getUserByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;
  const [row] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return row;
}

/**
 * Map Auth0 identity → SplitSheet user.
 * Prefer auth0_sub / preferred id; on email conflict, link verified emails to
 * the existing row so login never dies on users_email_unique.
 */
async function upsertAuth0User(input: {
  auth0Sub: string;
  email?: string | null;
  emailVerified?: boolean;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}): Promise<string> {
  const preferredId = `auth0:${input.auth0Sub}`;
  const email = input.email?.trim().toLowerCase() || null;
  const disallowLink =
    process.env.DISALLOW_EMAIL_ACCOUNT_LINKING === "true" ||
    process.env.DISALLOW_EMAIL_ACCOUNT_LINKING === "1";

  let existing = await getUserByAuth0Sub(input.auth0Sub);
  if (!existing) {
    existing = await storage.getUser(preferredId);
  }

  if (!existing && email) {
    const byEmail = await getUserByEmail(email);
    if (byEmail) {
      const sameAuth0 =
        byEmail.auth0Sub === input.auth0Sub || byEmail.id.startsWith("auth0:");
      if (sameAuth0 || (input.emailVerified && !disallowLink)) {
        if (!sameAuth0) {
          console.warn(
            `[auth0] Linking Auth0 sub to existing user ${byEmail.id} via verified email`,
          );
        }
        existing = byEmail;
      } else {
        throw new Error(
          "This email is already registered with a different sign-in method. Use the original provider or contact support.",
        );
      }
    }
  }

  if (existing) {
    await storage.updateUser(existing.id, {
      auth0Sub: input.auth0Sub,
      email: email || existing.email,
      firstName: input.firstName || existing.firstName,
      lastName: input.lastName || existing.lastName,
      profileImageUrl: input.profileImageUrl || existing.profileImageUrl,
    } as any);
    return existing.id;
  }

  try {
    await db.insert(users).values({
      id: preferredId,
      auth0Sub: input.auth0Sub,
      email,
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      profileImageUrl: input.profileImageUrl || null,
    } as any);
    return preferredId;
  } catch (err) {
    if (isPgUniqueViolation(err) && email) {
      const byEmail = await getUserByEmail(email);
      if (byEmail && !disallowLink) {
        console.warn(`[auth0] Recovered from users_email_unique; reusing ${byEmail.id}`);
        await storage.updateUser(byEmail.id, {
          auth0Sub: input.auth0Sub,
          email: email || byEmail.email,
          firstName: input.firstName || byEmail.firstName,
          lastName: input.lastName || byEmail.lastName,
          profileImageUrl: input.profileImageUrl || byEmail.profileImageUrl,
        } as any);
        return byEmail.id;
      }
      throw new Error(
        "This email is already registered with a different sign-in method. Use the original provider or contact support.",
      );
    }
    throw err;
  }
}

function loginFailure(res: Response, message: string) {
  res.redirect(`/login?error=${encodeURIComponent(message)}`);
}

function oauthErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== "object") return fallback;
  const e = err as Record<string, any>;
  const code = e.error || e.cause?.error;
  const desc = e.error_description || e.cause?.error_description;
  if (code && desc) return `${code}: ${desc}`;
  if (desc) return String(desc);
  if (code) return String(code);
  if (typeof e.message === "string" && e.message && !e.message.includes("response body")) {
    return e.message;
  }
  return fallback;
}

export async function registerAuth0Auth(app: Express): Promise<void> {
  if (!hasAuth0Credentials()) {
    throw new Error(
      "Auth0 requires AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_CLIENT_SECRET",
    );
  }

  await ensureAuth0Schema();

  const clientId = process.env.AUTH0_CLIENT_ID!.trim();
  const clientSecret = process.env.AUTH0_CLIENT_SECRET!.trim();
  const audience = (process.env.AUTH0_AUDIENCE || "").trim();

  let config: client.Configuration;
  try {
    config = await client.discovery(auth0IssuerUrl(), clientId, {
      client_secret: clientSecret,
    });
  } catch (err: any) {
    const domain = (process.env.AUTH0_DOMAIN || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    throw new Error(
      `Auth0 discovery failed for https://${domain}/ (${err?.message || err}). ` +
        `Open Auth0 Dashboard → Applications → copy Domain exactly. ` +
        `Test: https://${domain}/.well-known/openid-configuration`,
    );
  }

  const limiter = createPgRateLimiter(30, 60_000, "auth-auth0");
  app.use("/api/auth/auth0", limiter);

  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      providers: [
        {
          id: "auth0",
          label: "Sign in",
          enabled: true,
          authPath: "/api/auth/auth0",
        },
      ],
      localDev: false,
      mode: "auth0",
    });
  });

  app.get("/api/auth/auth0", async (req, res) => {
    try {
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      const state = client.randomState();
      const nonce = client.randomNonce();
      const redirectUri = callbackUrl(req);
      setAuth0Cookie(res, { state, codeVerifier, redirectUri, nonce });

      const params = new URLSearchParams({
        redirect_uri: redirectUri,
        scope: "openid profile email offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        nonce,
        // Auth0 Universal Login — connections (Google, DB, etc.) configured in Auth0 dashboard
        prompt: "login",
      });
      if (audience) params.set("audience", audience);

      const url = client.buildAuthorizationUrl(config, params);
      res.redirect(url.href);
    } catch (err: any) {
      console.error("[auth/auth0] start failed:", err);
      loginFailure(res, oauthErrorMessage(err, "Auth0 sign-in failed to start"));
    }
  });

  app.get("/api/auth/auth0/callback", async (req, res) => {
    try {
      const payload = readAuth0Cookie(req);
      clearAuth0Cookie(res);

      if (typeof req.query.error === "string") {
        return loginFailure(
          res,
          String(req.query.error_description || req.query.error),
        );
      }

      const code = typeof req.query.code === "string" ? req.query.code : undefined;
      const state = typeof req.query.state === "string" ? req.query.state : undefined;
      if (!code || !payload || state !== payload.state) {
        return loginFailure(
          res,
          "Auth0 sign-in session expired. Close the tab and try again.",
        );
      }

      const currentUrl = new URL(payload.redirectUri);
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === "string") currentUrl.searchParams.set(key, value);
      }

      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        pkceCodeVerifier: payload.codeVerifier,
        expectedState: payload.state,
        expectedNonce: payload.nonce,
        idTokenExpected: true,
      });

      const claims = tokens.claims() || {};
      const auth0Sub = String(claims.sub || "");
      if (!auth0Sub) {
        return loginFailure(res, "Auth0 did not return a user id");
      }

      const email = (claims.email as string) || null;
      const name = (claims.name as string) || "";
      const [firstName, ...rest] = name.split(" ");
      const userId = await upsertAuth0User({
        auth0Sub,
        email,
        emailVerified:
          claims.email_verified === true || claims.email_verified === "true",
        firstName: firstName || (claims.given_name as string) || null,
        lastName: rest.join(" ") || (claims.family_name as string) || null,
        profileImageUrl: (claims.picture as string) || null,
      });

      const exp =
        typeof claims.exp === "number"
          ? claims.exp
          : Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;

      await establishSession(req, {
        claims: {
          sub: userId,
          email,
          first_name: firstName || null,
          last_name: rest.join(" ") || null,
          profile_image_url: (claims.picture as string) || null,
          exp,
          provider: "auth0",
          auth0_sub: auth0Sub,
          amr: claims.amr,
          acr: claims.acr,
          mfa: Array.isArray(claims.amr)
            ? (claims.amr as string[]).some((v) => String(v).toLowerCase().includes("mfa"))
            : false,
        },
        expires_at: exp,
        provider: "auth0",
        amr: claims.amr,
        acr: claims.acr,
        mfa: Array.isArray(claims.amr)
          ? (claims.amr as string[]).some((v) => String(v).toLowerCase().includes("mfa"))
          : false,
        // Keep refresh only in server session — never expose to clients
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
      } as Express.User);

      try {
        const { ensurePersonalOrganization } = await import("./org-context");
        await ensurePersonalOrganization(userId);
      } catch (orgErr) {
        console.warn("[auth/auth0] personal org ensure skipped:", orgErr);
      }

      try {
        const { logAuthEvent, AUTH_EVENTS } = await import("./auth-events");
        await logAuthEvent({
          action: AUTH_EVENTS.LOGIN_SUCCESS,
          userId,
          afterState: { provider: "auth0", mfa: !!(Array.isArray(claims.amr) && (claims.amr as string[]).some((v) => /mfa/i.test(String(v)))) },
          req,
        });
      } catch {
        /* audit best-effort */
      }

      res.redirect("/");
    } catch (err: any) {
      console.error("[auth/auth0] callback failed:", err);
      try {
        const { logAuthEvent, AUTH_EVENTS } = await import("./auth-events");
        await logAuthEvent({
          action: AUTH_EVENTS.LOGIN_FAILURE,
          afterState: { provider: "auth0" },
          req,
        });
      } catch {
        /* ignore */
      }
      loginFailure(res, oauthErrorMessage(err, "Auth0 sign-in failed"));
    }
  });

  app.get("/api/login", (_req, res) => {
    res.redirect("/login");
  });

  app.get("/api/logout", async (req, res) => {
    const returnTo = appBaseUrl(req);
    const domain = (process.env.AUTH0_DOMAIN || "")
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    const userId = (req as any).user?.claims?.sub;
    try {
      const { logAuthEvent, AUTH_EVENTS } = await import("./auth-events");
      await logAuthEvent({ action: AUTH_EVENTS.LOGOUT, userId, afterState: { provider: "auth0" }, req });
    } catch {
      /* ignore */
    }
    await destroySession(req, res);
    const logout = new URL(`https://${domain}/v2/logout`);
    logout.searchParams.set("client_id", clientId);
    logout.searchParams.set("returnTo", returnTo);
    res.redirect(logout.href);
  });

  console.log("[auth] Auth0 Universal Login enabled");
}
