/**
 * Multi-provider social authentication for SplitSheet.
 * Providers: Google, Apple, GitHub, Microsoft (enabled when env credentials exist).
 *
 * Session shape matches existing passport users: { claims, expires_at, provider }.
 */
import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import * as client from "openid-client";
import { Strategy as OidcStrategy, type VerifyFunction } from "openid-client/passport";
import { db } from "./db";
import { users } from "@shared/schema";
import { storage } from "./storage";

export type SocialProviderId = "google" | "apple" | "github" | "microsoft";

export type SocialProviderInfo = {
  id: SocialProviderId;
  label: string;
  enabled: boolean;
  authPath: string;
};

const SESSION_TTL_SEC = 7 * 24 * 60 * 60;

function appBaseUrl(req?: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (req) {
    const host = req.get("host") || req.hostname;
    const proto =
      host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${proto}://${host}`;
  }
  return "http://localhost:5000";
}

function callbackUrl(provider: SocialProviderId, req?: Request): string {
  return `${appBaseUrl(req)}/api/auth/${provider}/callback`;
}

export function listSocialProviders(): SocialProviderInfo[] {
  return [
    {
      id: "google",
      label: "Continue with Google",
      enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      authPath: "/api/auth/google",
    },
    {
      id: "apple",
      label: "Continue with Apple",
      enabled: Boolean(
        process.env.APPLE_CLIENT_ID &&
          process.env.APPLE_TEAM_ID &&
          process.env.APPLE_KEY_ID &&
          process.env.APPLE_PRIVATE_KEY,
      ),
      authPath: "/api/auth/apple",
    },
    {
      id: "github",
      label: "Continue with GitHub",
      enabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
      authPath: "/api/auth/github",
    },
    {
      id: "microsoft",
      label: "Continue with Microsoft",
      enabled: Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
      authPath: "/api/auth/microsoft",
    },
  ];
}

export function hasAnySocialProvider(): boolean {
  return listSocialProviders().some((p) => p.enabled);
}

async function getUserByEmail(email: string) {
  const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return row;
}

async function upsertSocialUser(input: {
  provider: SocialProviderId;
  providerUserId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}) {
  const preferredId = `${input.provider}:${input.providerUserId}`;
  const email = input.email?.trim().toLowerCase() || null;

  let existing = await storage.getUser(preferredId);
  if (!existing && email) {
    existing = await getUserByEmail(email);
  }

  if (existing) {
    await storage.updateUser(existing.id, {
      email: email || existing.email,
      firstName: input.firstName || existing.firstName,
      lastName: input.lastName || existing.lastName,
      profileImageUrl: input.profileImageUrl || existing.profileImageUrl,
    });
    return existing.id;
  }

  await db.insert(users).values({
    id: preferredId,
    email,
    firstName: input.firstName || null,
    lastName: input.lastName || null,
    profileImageUrl: input.profileImageUrl || null,
  });
  return preferredId;
}

function sessionUserFromClaims(claims: Record<string, any>, provider: SocialProviderId) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  return {
    claims: {
      ...claims,
      exp,
      provider,
    },
    expires_at: exp,
    provider,
  };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Apple requires a short-lived client secret JWT signed with the .p8 key. */
function createAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID!;
  const clientId = process.env.APPLE_CLIENT_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const privateKey = (process.env.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const payload = base64url(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 60 * 60 * 24 * 180,
      aud: "https://appleid.apple.com",
      sub: clientId,
    }),
  );
  const data = `${header}.${payload}`;
  const signer = crypto.createSign("SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${data}.${base64url(signature)}`;
}

function oauthStateCookieName(provider: string) {
  return `oauth_state_${provider}`;
}

function setOAuthState(res: Response, provider: string, state: string) {
  const name = oauthStateCookieName(provider);
  const secure =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
      ? "; Secure"
      : "";
  res.append(
    "Set-Cookie",
    `${name}=${encodeURIComponent(state)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`,
  );
}

function clearOAuthState(res: Response, provider: string) {
  const name = oauthStateCookieName(provider);
  res.append(
    "Set-Cookie",
    `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function readOAuthState(req: Request, provider: string): string | undefined {
  return (req as any).cookies?.[oauthStateCookieName(provider)];
}

async function finishLogin(
  req: Request,
  res: Response,
  profile: {
    provider: SocialProviderId;
    providerUserId: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    profileImageUrl?: string | null;
  },
) {
  const userId = await upsertSocialUser(profile);
  const user = sessionUserFromClaims(
    {
      sub: userId,
      email: profile.email,
      first_name: profile.firstName,
      last_name: profile.lastName,
      profile_image_url: profile.profileImageUrl,
    },
    profile.provider,
  );

  await new Promise<void>((resolve, reject) => {
    req.login(user, (err) => (err ? reject(err) : resolve()));
  });
  res.redirect("/");
}

function loginFailure(res: Response, message: string) {
  const q = encodeURIComponent(message);
  res.redirect(`/login?error=${q}`);
}

// ── Google (OIDC via openid-client) ───────────────────────────────────────────

async function registerGoogle(app: Express) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (!clientId.endsWith(".apps.googleusercontent.com")) {
    console.warn(
      "[auth/google] GOOGLE_CLIENT_ID does not look like a Web client ID (…apps.googleusercontent.com). Check Google Cloud Console + Vercel env.",
    );
  }
  const config = await client.discovery(
    new URL("https://accounts.google.com"),
    clientId,
    { client_secret: clientSecret },
  );

  const verify: VerifyFunction = async (tokens, verified) => {
    try {
      const claims = tokens.claims();
      const sub = String(claims.sub);
      const email = (claims.email as string) || null;
      const name = (claims.name as string) || "";
      const [firstName, ...rest] = name.split(" ");
      const userId = await upsertSocialUser({
        provider: "google",
        providerUserId: sub,
        email,
        firstName: firstName || (claims.given_name as string) || null,
        lastName: rest.join(" ") || (claims.family_name as string) || null,
        profileImageUrl: (claims.picture as string) || null,
      });
      verified(
        null,
        sessionUserFromClaims(
          {
            sub: userId,
            email,
            first_name: firstName || null,
            last_name: rest.join(" ") || null,
            profile_image_url: (claims.picture as string) || null,
          },
          "google",
        ),
      );
    } catch (err) {
      verified(err as Error);
    }
  };

  // Register strategy per callback host using APP_URL when set
  const strategyName = "google";
  passport.use(
    strategyName,
    new OidcStrategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile",
        callbackURL: callbackUrl("google"),
      },
      verify,
    ),
  );

  app.get("/api/auth/google", (req, res, next) => {
    passport.authenticate(strategyName, {
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login?error=Google%20sign-in%20failed",
    })(req, res, next);
  });
}

// ── Microsoft (OIDC) ──────────────────────────────────────────────────────────

async function registerMicrosoft(app: Express) {
  const clientId = process.env.MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  const config = await client.discovery(
    new URL(`https://login.microsoftonline.com/${tenant}/v2.0`),
    clientId,
    clientSecret,
  );

  const verify: VerifyFunction = async (tokens, verified) => {
    try {
      const claims = tokens.claims();
      const sub = String(claims.sub || claims.oid);
      const email =
        (claims.email as string) ||
        (claims.preferred_username as string) ||
        null;
      const name = (claims.name as string) || "";
      const [firstName, ...rest] = name.split(" ");
      const userId = await upsertSocialUser({
        provider: "microsoft",
        providerUserId: sub,
        email,
        firstName: firstName || null,
        lastName: rest.join(" ") || null,
        profileImageUrl: null,
      });
      verified(
        null,
        sessionUserFromClaims(
          {
            sub: userId,
            email,
            first_name: firstName || null,
            last_name: rest.join(" ") || null,
          },
          "microsoft",
        ),
      );
    } catch (err) {
      verified(err as Error);
    }
  };

  const strategyName = "microsoft";
  passport.use(
    strategyName,
    new OidcStrategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: callbackUrl("microsoft"),
      },
      verify,
    ),
  );

  app.get("/api/auth/microsoft", (req, res, next) => {
    passport.authenticate(strategyName, {
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/auth/microsoft/callback", (req, res, next) => {
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/login?error=Microsoft%20sign-in%20failed",
    })(req, res, next);
  });
}

// ── GitHub (OAuth 2.0) ────────────────────────────────────────────────────────

function registerGitHub(app: Express) {
  app.get("/api/auth/github", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    setOAuthState(res, "github", state);
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID!);
    url.searchParams.set("redirect_uri", callbackUrl("github", req));
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      const expected = readOAuthState(req, "github");
      clearOAuthState(res, "github");
      if (!code || !state || !expected || state !== expected) {
        return loginFailure(res, "GitHub sign-in state mismatch. Try again.");
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: callbackUrl("github", req),
        }),
      });
      const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!tokenJson.access_token) {
        return loginFailure(res, tokenJson.error || "GitHub token exchange failed");
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "SplitSheet",
        },
      });
      const ghUser = (await userRes.json()) as {
        id: number;
        login: string;
        name?: string;
        email?: string;
        avatar_url?: string;
      };

      let email = ghUser.email || null;
      if (!email) {
        const emailsRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenJson.access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "SplitSheet",
          },
        });
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified);
        email = primary?.email || null;
      }

      const name = ghUser.name || ghUser.login || "";
      const [firstName, ...rest] = name.split(" ");
      await finishLogin(req, res, {
        provider: "github",
        providerUserId: String(ghUser.id),
        email,
        firstName: firstName || ghUser.login,
        lastName: rest.join(" ") || null,
        profileImageUrl: ghUser.avatar_url || null,
      });
    } catch (err: any) {
      console.error("[auth/github]", err);
      loginFailure(res, err?.message || "GitHub sign-in failed");
    }
  });
}

// ── Apple (Sign in with Apple) ────────────────────────────────────────────────

function registerApple(app: Express) {
  app.get("/api/auth/apple", (req, res) => {
    const state = crypto.randomBytes(16).toString("hex");
    setOAuthState(res, "apple", state);
    const url = new URL("https://appleid.apple.com/auth/authorize");
    url.searchParams.set("client_id", process.env.APPLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", callbackUrl("apple", req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "form_post");
    url.searchParams.set("scope", "name email");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  const handleAppleCallback = async (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const query = req.query || {};
      const code = (body.code || query.code) as string | undefined;
      const state = (body.state || query.state) as string | undefined;
      const userJson = body.user as string | undefined;
      const expected = readOAuthState(req, "apple");
      clearOAuthState(res, "apple");

      if (!code || !state || !expected || state !== expected) {
        return loginFailure(res, "Apple sign-in state mismatch. Try again.");
      }

      const clientSecret = createAppleClientSecret();
      const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.APPLE_CLIENT_ID!,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: callbackUrl("apple", req),
        }),
      });
      const tokenJson = (await tokenRes.json()) as {
        id_token?: string;
        error?: string;
        error_description?: string;
      };
      if (!tokenJson.id_token) {
        return loginFailure(
          res,
          tokenJson.error_description || tokenJson.error || "Apple token exchange failed",
        );
      }

      const payloadPart = tokenJson.id_token.split(".")[1];
      const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
        sub: string;
        email?: string;
      };

      let firstName: string | null = null;
      let lastName: string | null = null;
      if (userJson) {
        try {
          const parsed = JSON.parse(userJson) as {
            name?: { firstName?: string; lastName?: string };
          };
          firstName = parsed.name?.firstName || null;
          lastName = parsed.name?.lastName || null;
        } catch {
          /* ignore */
        }
      }

      await finishLogin(req, res, {
        provider: "apple",
        providerUserId: payload.sub,
        email: payload.email || null,
        firstName,
        lastName,
        profileImageUrl: null,
      });
    } catch (err: any) {
      console.error("[auth/apple]", err);
      loginFailure(res, err?.message || "Apple sign-in failed");
    }
  };

  // Apple uses form_post by default
  app.post("/api/auth/apple/callback", handleAppleCallback);
  app.get("/api/auth/apple/callback", handleAppleCallback);
}

/**
 * Register whatever social providers have credentials configured.
 * Call after passport.initialize() / session middleware.
 */
export async function registerSocialAuth(app: Express): Promise<SocialProviderInfo[]> {
  const providers = listSocialProviders();
  const enabled = providers.filter((p) => p.enabled);

  if (enabled.some((p) => p.id === "google")) {
    await registerGoogle(app);
    console.log("[auth] Google OAuth enabled");
  }
  if (enabled.some((p) => p.id === "microsoft")) {
    await registerMicrosoft(app);
    console.log("[auth] Microsoft OAuth enabled");
  }
  if (enabled.some((p) => p.id === "github")) {
    registerGitHub(app);
    console.log("[auth] GitHub OAuth enabled");
  }
  if (enabled.some((p) => p.id === "apple")) {
    registerApple(app);
    console.log("[auth] Apple Sign In enabled");
  }

  app.get("/api/auth/providers", (_req, res) => {
    res.json({
      providers: listSocialProviders(),
      localDev: process.env.AUTH_PROVIDER === "local",
    });
  });

  return enabled;
}

/** Cookie parser for OAuth state — lightweight, no extra dependency. */
export function simpleCookieParser(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (header) {
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx === -1) continue;
      const k = part.slice(0, idx).trim();
      const v = decodeURIComponent(part.slice(idx + 1).trim());
      out[k] = v;
    }
  }
  (req as any).cookies = out;
  next();
}
