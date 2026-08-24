/**
 * Express application factory.
 *
 * Used by:
 * - `server/index.ts` (local / Docker / Fly) — getApp() then listen
 * - `server/vercel-entry.ts` → bundled `api/index.js` on Vercel
 *
 * Important: do not statically import `./vite` here — that pulls in `vite.config.ts`
 * (top-level await) and crashes the Vercel serverless isolate on module load.
 */
import "./loadEnv";
import express, { type Express, type Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { registerRoutes } from "./routes";
import { registerChatbotRoutes } from "./chatbotRoutes";
import { log, serveStatic } from "./static-serve";
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
  useLocalAuthProvider,
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
  const path = req.path || "";
  const original = (req.originalUrl || "").split("?")[0];
  return (
    STRIPE_WEBHOOK_PATHS.has(path) ||
    STRIPE_WEBHOOK_PATHS.has(original) ||
    path.endsWith("/stripe/webhook") ||
    path.endsWith("/stripe/connect-webhook") ||
    original.endsWith("/stripe/webhook") ||
    original.endsWith("/stripe/connect-webhook")
  );
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
  if (useLocalAuthProvider()) {
    console.log("[auth] AUTH_PROVIDER=local (operator /api/login)");
  }

  // Skip JSON/urlencoded for Stripe webhooks so route-level express.raw
  // can supply the raw Buffer required for signature verification.
  // Voice turns may include base64 audio — allow a larger body on those paths.
  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    const limit = req.path.startsWith("/api/copilot/voice") ? "6mb" : "1mb";
    return express.json({ limit })(req, res, next);
  });
  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    return express.urlencoded({ extended: false })(req, res, next);
  });

  app.use((req, res, next) => {
    if (isStripeWebhookPath(req)) return next();
    return sanitizeMiddleware(req, res, next);
  });
  // Stripe webhooks stay under the global /api limiter (300/min is ample for Stripe retries)
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

  // Local-auth on Vercel still needs users/sessions tables.
  const skipMigrations =
    shouldSkipBootMigrations() && !useLocalAuthProvider();

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

  if (isVercelRuntime()) {
    // Static SPA is served by Vercel `outputDirectory` (dist/public).
    log("Vercel runtime: API-only Express (static via outputDirectory)");
  } else if (app.get("env") === "development") {
    // Non-literal import so esbuild does NOT bundle vite.config (top-level await)
    // into the Vercel api/index.js isolate.
    const viteModule = "./vite";
    const { setupVite } = await import(viteModule);
    await setupVite(app, server);
  } else {
    serveStatic(app);
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
