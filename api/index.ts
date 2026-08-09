/**
 * Vercel Serverless entry (committed so `functions` / `api/*` detection matches).
 * Bundled by `@vercel/node` from this file's import graph.
 */
import express, { type Express } from "express";
import { getApp } from "../server/app";

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
