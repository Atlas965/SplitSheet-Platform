import fs from "fs";
import path from "path";

/**
 * Load `.env` for local development (Replit injects secrets automatically).
 * Safe to call multiple times; only loads once.
 */
export function loadEnv(): void {
  if (process.env.__ENV_LOADED__) return;

  const envPath = path.resolve(import.meta.dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    process.env.__ENV_LOADED__ = "1";
    return;
  }

  const contents = fs.readFileSync(envPath, "utf-8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_URL && process.env.NEON_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.NEON_DATABASE_URL;
  }

  // Corporate networks / SSL inspection can block Neon WebSocket TLS locally.
  if (
    process.env.LOCAL_DEV === "true" &&
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === undefined
  ) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  process.env.__ENV_LOADED__ = "1";
}

loadEnv();
