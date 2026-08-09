/**
 * Express application factory.
 *
 * Used by:
 * - `server/index.ts` (local / Docker / Fly) — getApp() then listen
 * - root `server.ts` (Vercel) — export default app
 */
import "./loadEnv";
import express, { type Express, type Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { registerRoutes } from "./routes";
import { registerChatbotRoutes } from "./chatbotRoutes";
import { setupVite, serveStatic, log } from "./vite";
import { seedContractTemplates } from "./seedData";
import { applyTransportSecurity } from "./transport-security";
import { sanitizeMiddleware, createPgRateLimiter } from "./security";
import {
  runCoreSchemaMigrations,
  runSecurityEngineMigrations,
  runLegalDocumentMigrations,
} from "./db-migrations";
import { logger } from "./logger";
import {
  isVercelRuntime,
  shouldSkipBootMigrations,
} from "./runtime";
import { assertRuntimeEnv } from "./boot-check";

export type AppBundle = {
  app: Express;
  server: Server;
};

let cached: Promise<AppBundle> | null = null;

const STRIPE_WEBHOOK_PATHS = new Set([
  "/api/stripe/webhook",
  "/api/stripe/connect-webhook",
]);

function isStripeWebhookPath(req: Request): boolean {
  return STRIPE_WEBHOOK_PATHS.has(req.path);
}

async function runBootMigrations(): Promise<void> {
  await runCoreSchemaMigrations();
  await runSecurityEngineMigrations();
  await runLegalDocumentMigrations();
  log("Database schema up to date");
}

async function buildApp(): Promise<AppBundle> {
  assertRuntimeEnv();

  const app = express();
  applyTransportSecurity(app);

  console.log("Environment loaded");
  console.log(
    "OpenAI API (CoPilot):",
    process.env.OPENAI_API_KEY ? "Configured" : "Missing — offline fallback only",
  );
  console.log(
    "Message encryption:",
    process.env.FIELD_ENCRYPTION_SECRET || process.env.SESSION_SECRET
      ? "AES-256-GCM at rest"
      : "Dev key — set FIELD_ENCRYPTION_SECRET for production",
  );

  // Skip JSON/urlencoded for Stripe webhooks so route-level express.raw
  // can supply the raw Buffer required for signature verification.
  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    return express.json({ limit: "1mb" })(req, res, next);
  });
  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    return express.urlencoded({ extended: false })(req, res, next);
  });

  app.use(sanitizeMiddleware);
  app.use("/api", createPgRateLimiter(300, 60_000, "global-api"));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;
    const sensitive =
      path.startsWith("/api/messages") || path.startsWith("/api/conversations");

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

  // AUTH_PROVIDER=local on Vercel still needs schema (users/sessions) for login.
  const skipMigrations =
    shouldSkipBootMigrations() && process.env.AUTH_PROVIDER !== "local";

  if (skipMigrations) {
    log("Skipping boot migrations (SKIP_BOOT_MIGRATIONS or Vercel runtime)");
  } else {
    try {
      await runBootMigrations();
    } catch (err: any) {
      logger.fatal("startup.migration_failed", {
        message: err?.message,
        stack: err?.stack,
      });
      console.error("FATAL: database migrations failed:", err);
      if (isVercelRuntime()) {
        throw err;
      }
      process.exit(1);
    }
  }

  if (!skipMigrations) {
    await seedContractTemplates();
  }

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

  // Vite HMR only on long-running local/dev hosts (not Vercel).
  if (!isVercelRuntime() && app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app, { optional: isVercelRuntime() });
  }

  return { app, server };
}

/** Memoized Express app + HTTP server (safe across concurrent cold starts). */
export function getApp(): Promise<AppBundle> {
  if (!cached) {
    cached = buildApp().catch((err) => {
      cached = null;
      throw err;
    });
  }
  return cached;
}
