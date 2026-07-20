import "./loadEnv";
import "./otel"; // Priority 5.1 — no-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerChatbotRoutes } from "./chatbotRoutes";
import { setupVite, serveStatic, log } from "./vite";
import { seedContractTemplates } from "./seedData";
import { applyTransportSecurity } from "./transport-security";
import { sanitizeMiddleware, createPgRateLimiter } from "./security";
import { runCoreSchemaMigrations, runSecurityEngineMigrations, runLegalDocumentMigrations, runSubprocessorMigrations, runCopilotUsageMigrations } from "./db-migrations";
import { logger } from "./logger";
import { runStripePreflight } from "./scripts/stripe-preflight";
import { startPayoutReconcileScheduler } from "./jobs/reconcile-payouts";

process.on("unhandledRejection", (reason) => {
  logger.error("process.unhandled_rejection", { reason: reason instanceof Error ? reason.message : String(reason), stack: (reason as Error)?.stack });
});
process.on("uncaughtException", (err) => {
  logger.fatal("process.uncaught_exception", { message: err.message, stack: err.stack });
  // Per Node.js docs, the process is in an undefined state after an
  // uncaught exception — leaving it running (e.g. after a failed port
  // bind) silently zombies the server instead of failing loudly.
  process.exit(1);
});

const app = express();
applyTransportSecurity(app);
console.log(
  "Environment loaded"
  );
  
  console.log(
  "OpenAI API (CoPilot):",
  process.env.OPENAI_API_KEY
  ? "Configured"
  : "Missing — offline fallback only"
  );
console.log(
  "Message encryption:",
  process.env.FIELD_ENCRYPTION_SECRET || process.env.SESSION_SECRET
    ? "AES-256-GCM at rest"
    : "Dev key — set FIELD_ENCRYPTION_SECRET for production"
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(sanitizeMiddleware);
// Global, Postgres-backed baseline rate limit (multi-instance safe) — an
// extra layer beneath the finer-grained per-route limiters in security-routes.ts.
app.use("/api", createPgRateLimiter(300, 60_000, "global-api"));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  const sensitive = path.startsWith("/api/messages") || path.startsWith("/api/conversations");

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (!sensitive) capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      } else if (sensitive) {
        logLine += " :: [redacted]";
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Bootstrap any tables/columns from shared/schema.ts (and the raw-SQL
  // security engine tables) that don't exist yet in this database.
  try {
    await runCoreSchemaMigrations();
    await runSecurityEngineMigrations();
    await runLegalDocumentMigrations();
    await runSubprocessorMigrations();
    await runCopilotUsageMigrations();
    log("Database schema up to date");
  } catch (err: any) {
    logger.fatal("startup.migration_failed", { message: err?.message, stack: err?.stack });
    console.error("FATAL: database migrations failed:", err);
    process.exit(1);
  }

  // Priority 3.3 — fail production boot if Stripe live-mode preflight fails
  if (process.env.NODE_ENV === "production") {
    const preflight = await runStripePreflight();
    for (const w of preflight.warnings) console.warn("[stripe-preflight]", w);
    if (!preflight.ok) {
      console.error("[stripe-preflight] FATAL:", preflight.errors);
      process.exit(1);
    }
    log("Stripe preflight OK");
  }

  // Priority 3.4 — optional hourly payout reconciliation
  startPayoutReconcileScheduler();

  // Seed contract templates
  await seedContractTemplates();

  const server = await registerRoutes(app);
  registerChatbotRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error("request.unhandled_error", {
      route: req.path,
      method: req.method,
      status,
      message,
      stack: err.stack,
    });

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: "0.0.0.0",
  };
  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }
  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();