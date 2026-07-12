/**
 * server/logger.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Structured logging + error monitoring.
 * - Every log line is a single JSON object on stdout (easy to pipe into
 *   Datadog / CloudWatch / Grafana Loki in production).
 * - error()/fatal() also persist to the `error_logs` table so operators can
 *   review recent failures from the database without a log aggregator.
 * - If SENTRY_DSN is set, errors are also forwarded there (best-effort,
 *   optional dependency — never blocks the request if the package/DSN
 *   isn't available).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { db } from "./db";
import { errorLogs } from "@shared/schema";

type Level = "info" | "warn" | "error" | "fatal";

function emit(level: Level, message: string, meta?: Record<string, unknown>) {
  const line = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  const out = JSON.stringify(line);
  if (level === "error" || level === "fatal") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

async function persist(level: Level, message: string, meta?: Record<string, unknown>): Promise<void> {
  try {
    await db.insert(errorLogs).values({
      level,
      message: message.slice(0, 4000),
      stack: meta?.stack ? String(meta.stack).slice(0, 8000) : null,
      route: meta?.route ? String(meta.route) : null,
      userId: meta?.userId ? String(meta.userId) : null,
      metadata: meta ?? null,
    });
  } catch {
    // Never let logging failures cascade into the request lifecycle.
  }
}

async function forwardToSentry(message: string, meta?: Record<string, unknown>): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    // Optional dependency — only touched when SENTRY_DSN is actually configured.
    const sentryModuleName = "@sentry/node";
    const Sentry = await import(sentryModuleName).catch(() => null);
    if (!Sentry) return;
    (Sentry as any).captureException?.(new Error(message), { extra: meta });
  } catch {
    // Sentry is best-effort; ignore.
  }
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: Record<string, unknown>) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: Record<string, unknown>) {
    emit("error", message, meta);
    void persist("error", message, meta);
    void forwardToSentry(message, meta);
  },
  fatal(message: string, meta?: Record<string, unknown>) {
    emit("fatal", message, meta);
    void persist("fatal", message, meta);
    void forwardToSentry(message, meta);
  },
};
