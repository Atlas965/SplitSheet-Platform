/**
 * Vercel Express entry — default-export the existing Express application.
 * Local / Docker / Fly continue to use `server/index.ts` + listen().
 *
 * Vercel detects Express only if this file imports `express` directly.
 * Use a static import (not dynamic) so the Express bundler includes `server/app`.
 *
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import express, { type Express } from "express";
import { getApp } from "./server/app.js";

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
