import crypto from "crypto";

export const CONFIRMATION_TTL_MS = 72 * 60 * 60 * 1000;

/** 64-char hex — cryptographically random, unguessable. */
export function generateConfirmationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function confirmationExpiresAt(from = Date.now()): Date {
  return new Date(from + CONFIRMATION_TTL_MS);
}

/** Public contributor path — opaque token only (no database IDs). */
export function opaqueConfirmPath(token: string, viaQr = false): string {
  const path = `/confirm/${token}`;
  return viaQr ? `${path}?via=qr` : path;
}

export function opaqueConfirmUrl(baseUrl: string, token: string, viaQr = false): string {
  return `${baseUrl.replace(/\/$/, "")}${opaqueConfirmPath(token, viaQr)}`;
}

export function accessMethodFromRequest(via: unknown, bodyMethod?: unknown): "qr" | "link" {
  if (via === "qr" || bodyMethod === "qr") return "qr";
  return "link";
}
