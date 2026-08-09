/**
 * Bundled by `npm run build:vercel` → api/index.js
 */
import express, { type Express } from "express";
import { getApp } from "./app";

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
        "Set Production env: DATABASE_URL/NEON_DATABASE_URL, SESSION_SECRET, LOCAL_DEV=false, AUTH_PROVIDER=local. Redeploy.",
    });
  });
  return app;
}

let app: Express;
try {
  ({ app } = await getApp());
} catch (err) {
  app = bootFailureApp(err);
}

export default app;
