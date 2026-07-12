/**
 * Transport-layer security for production deployments.
 * Encryption in transit is provided by TLS (HTTPS); this module enforces it
 * and sets HSTS + security headers on every response.
 */
import type { Request, Response, NextFunction } from "express";
import { securityHeaders } from "./security";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Trust X-Forwarded-Proto from reverse proxies (Replit, nginx, etc.). */
export function configureTrustProxy(app: { set: (key: string, value: unknown) => void }): void {
  if (IS_PRODUCTION) {
    app.set("trust proxy", 1);
  }
}

/** Reject non-HTTPS API and page requests in production. */
export function requireHttps(req: Request, res: Response, next: NextFunction): void {
  if (!IS_PRODUCTION) {
    next();
    return;
  }

  const proto =
    req.headers["x-forwarded-proto"]?.toString().split(",")[0].trim() ??
    req.protocol;

  if (proto !== "https") {
    res.status(403).json({
      message: "HTTPS is required. All messaging and API traffic must use TLS.",
    });
    return;
  }

  next();
}

/** HSTS — tell browsers to always use HTTPS for this domain. */
export function hstsHeader(_req: Request, res: Response, next: NextFunction): void {
  if (IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

export function applyTransportSecurity(app: {
  use: (fn: (req: Request, res: Response, next: NextFunction) => void) => void;
}): void {
  configureTrustProxy(app as any);
  app.use(hstsHeader);
  app.use(securityHeaders);
  if (IS_PRODUCTION) {
    app.use(requireHttps);
  }
}
