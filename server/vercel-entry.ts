/**
 * Bundled by `npm run build:vercel` → api/index.js
 *
 * No top-level await — Vercel Node can crash the isolate if module init throws.
 * App boots lazily on the first request and returns a clear 503 on failure.
 */
import express, { type Express, type Request, type Response } from "express";

function bootFailureApp(err: unknown): Express {
  const message =
    err instanceof Error ? err.message : "Application failed to start";
  console.error("[vercel-boot] boot failed:", message);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }

  const app = express();
  app.use((_req, res) => {
    res.status(503).json({
      error: "SERVICE_UNAVAILABLE",
      message,
      hint:
        "Set Production env: DATABASE_URL or NEON_DATABASE_URL, SESSION_SECRET, LOCAL_DEV=false, AUTH_PROVIDER=social (with GOOGLE_CLIENT_ID/SECRET etc.) or AUTH_PROVIDER=local. Then Redeploy.",
    });
  });
  return app;
}

const bridge = express();
let realApp: Express | null = null;
let bootPromise: Promise<Express> | null = null;

async function ensureApp(): Promise<Express> {
  if (realApp) return realApp;
  if (!bootPromise) {
    bootPromise = (async () => {
      try {
        // Dynamic import so db/auth module init stays inside try/catch
        const { getApp } = await import("./app");
        const { app } = await getApp();
        realApp = app;
        return app;
      } catch (err) {
        realApp = bootFailureApp(err);
        return realApp;
      }
    })();
  }
  return bootPromise;
}

bridge.use(async (req: Request, res: Response, next) => {
  try {
    const app = await ensureApp();
    // Express Application is a request listener — do not pass `next`
    app(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(503).json({
        error: "SERVICE_UNAVAILABLE",
        message: err instanceof Error ? err.message : "Boot failed",
      });
    }
  }
});

export default bridge;
