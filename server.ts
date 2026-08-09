/**
 * Vercel Express entry — default-export the existing Express application.
 * Local / Docker / Fly continue to use `server/index.ts` + listen().
 *
 * Vercel detects Express only if this file imports `express` directly.
 * App modules are loaded via dynamic import so missing env fails inside try/catch
 * (db.ts throws at import time if DATABASE_URL is unset).
 *
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import express, { type Express } from "express";

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
  const { getApp } = await import("./server/app");
  ({ app } = await getApp());
} catch (err) {
  app = bootFailureApp(err);
}

export default app;
