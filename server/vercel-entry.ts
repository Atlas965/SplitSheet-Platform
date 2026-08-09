/**
 * Source entry bundled for Vercel → api/index.js
 *
 * Vercel's per-file TS compile breaks extensionless ESM imports
 * (e.g. "./loadEnv"). Bundling inlines the server graph instead.
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
        "Check Vercel Environment Variables for Production vs Preview, then Redeploy. See Runtime Logs for details.",
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
