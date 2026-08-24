import fs from "fs";
import path from "path";

/** Strip accidental quotes/whitespace from env values (common Vercel paste mistake). */
function sanitizeEnvValue(value: string): string {
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

const OAUTH_ENV_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_TENANT_ID",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "APP_URL",
  "AUTH_PROVIDER",
] as const;

function sanitizeOAuthEnv(): void {
  for (const key of OAUTH_ENV_KEYS) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.length > 0) {
      process.env[key] = sanitizeEnvValue(raw);
    }
  }
}

/**
 * Apply env defaults that must run on every host (including Vercel with no .env file).
 */
function applyRuntimeDefaults(): void {
  sanitizeOAuthEnv();

  if (!process.env.DATABASE_URL && process.env.NEON_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
  }

  // Vercel: prefer social OAuth when credentials exist; otherwise local operator login.
  if (
    (process.env.VERCEL === "1" || process.env.VERCEL === "true") &&
    !process.env.AUTH_PROVIDER
  ) {
    const hasSocial = Boolean(
      (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
        (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) ||
        (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) ||
        (process.env.APPLE_CLIENT_ID &&
          process.env.APPLE_TEAM_ID &&
          process.env.APPLE_KEY_ID &&
          process.env.APPLE_PRIVATE_KEY),
    );
    process.env.AUTH_PROVIDER = hasSocial ? "social" : "local";
  }

  // Corporate networks / SSL inspection can block Neon WebSocket TLS locally.
  if (
    process.env.LOCAL_DEV === "true" &&
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }
}

/**
 * Load `.env` for local development (Replit injects secrets automatically).
 * Safe to call multiple times; only loads once.
 */
export function loadEnv(): void {
  if (process.env.__ENV_LOADED__) return;

  const envPath = path.resolve(import.meta.dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const contents = fs.readFileSync(envPath, "utf-8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;

      const key = trimmed.slice(0, eq).trim();
      const value = sanitizeEnvValue(trimmed.slice(eq + 1));

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }

  applyRuntimeDefaults();
  process.env.__ENV_LOADED__ = "1";
}

loadEnv();
