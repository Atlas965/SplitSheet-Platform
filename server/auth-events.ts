/**
 * Phase 11 — AUTH_* security events (no secrets in payloads).
 */
import type { Request } from "express";
import { auditLog } from "./security";

export const AUTH_EVENTS = {
  LOGIN_SUCCESS: "AUTH_LOGIN_SUCCESS",
  LOGIN_FAILURE: "AUTH_LOGIN_FAILURE",
  LOGOUT: "AUTH_LOGOUT",
  MFA_REQUIRED: "AUTH_MFA_REQUIRED",
  MFA_SATISFIED: "AUTH_MFA_SATISFIED",
  SESSION_ESTABLISHED: "AUTH_SESSION_ESTABLISHED",
  CONFIRM_VIEW: "AUTH_CONFIRM_VIEW",
  CONFIRM_SUBMIT: "AUTH_CONFIRM_SUBMIT",
  CONFIRM_REVOKE: "AUTH_CONFIRM_REVOKE",
  QR_GENERATED: "AUTH_QR_GENERATED",
  QR_ACCESSED: "AUTH_QR_ACCESSED",
  QR_REVOKED: "AUTH_QR_REVOKED",
  QR_REGENERATED: "AUTH_QR_REGENERATED",
  TERMS_ACCEPT: "AUTH_TERMS_ACCEPT",
} as const;

export type AuthEventAction = (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS];

function clientMeta(req?: Request) {
  if (!req) return {};
  return {
    ipAddress:
      (req as any).ip ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
      req.socket?.remoteAddress,
    userAgent: req.headers["user-agent"]?.toString(),
    requestId: (req as any).requestId,
  };
}

/** Never pass tokens, passwords, refresh tokens, or raw OAuth codes. */
export async function logAuthEvent(input: {
  action: AuthEventAction;
  userId?: string | null;
  resourceType?: string;
  resourceId?: string;
  afterState?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  const safeAfter = input.afterState
    ? Object.fromEntries(
        Object.entries(input.afterState).filter(
          ([k]) =>
            !/token|secret|password|code|refresh|authorization/i.test(k),
        ),
      )
    : undefined;

  await auditLog({
    userId: input.userId ?? undefined,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    afterState: safeAfter,
    ...clientMeta(input.req),
  });
}
