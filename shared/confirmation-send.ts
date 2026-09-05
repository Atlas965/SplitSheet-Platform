/** Policy for bulk / resend confirmation emails. Delivery uses the existing SMTP helper. */

export const MAX_PROJECTS_PER_BULK = 10;
export const MAX_EMAILS_PER_REQUEST = 20;
export const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 30 * 1000;
export const SEND_TIME_BUDGET_MS = 45_000;

export type ConfirmationSendMode = "send" | "resend" | "remind";

export type ConfirmationSkipCode =
  | "already_confirmed"
  | "already_sent"
  | "session_completed"
  | "session_cancelled"
  | "revoked"
  | "no_email"
  | "invalid_splits"
  | "not_pending"
  | "not_yet_sent"
  | "deferred"
  | "unauthorized"
  | "not_found";

export function parseBulkProjectIds(body: unknown): { ok: true; ids: string[] } | { ok: false; message: string } {
  const raw = (body ?? {}) as Record<string, unknown>;
  const list = raw.projectIds ?? raw.sessionIds ?? raw.ids;
  if (!Array.isArray(list) || list.length === 0) {
    return { ok: false, message: "Select at least one project." };
  }
  if (list.length > MAX_PROJECTS_PER_BULK) {
    return { ok: false, message: `Select at most ${MAX_PROJECTS_PER_BULK} projects at a time.` };
  }
  const ids = list.map((id) => String(id ?? "").trim()).filter(Boolean);
  if (ids.length !== list.length) {
    return { ok: false, message: "Each project id must be a non-empty string." };
  }
  return { ok: true, ids: Array.from(new Set(ids)) };
}

export function isContractSendable(status?: string | null):
  | { ok: true }
  | { ok: false; code: Extract<ConfirmationSkipCode, "session_completed" | "session_cancelled"> } {
  const s = (status ?? "").toLowerCase();
  if (s === "cancelled") return { ok: false, code: "session_cancelled" };
  if (s === "signed" || s === "active") return { ok: false, code: "session_completed" };
  return { ok: true };
}

export function isConfirmationPending(
  confirmationStatus?: string | null,
  collaboratorStatus?: string | null,
): boolean {
  if (collaboratorStatus === "signed") return false;
  const status = (confirmationStatus ?? "not_sent").toLowerCase();
  if (status === "confirmed") return false;
  return true;
}

export function classifyRecipientSkip(input: {
  mode: ConfirmationSendMode;
  confirmationStatus?: string | null;
  collaboratorStatus?: string | null;
  email?: string | null;
  sentAt?: Date | string | null;
  now?: number;
}): { skip: true; code: ConfirmationSkipCode } | { skip: false } {
  const now = input.now ?? Date.now();
  const status = (input.confirmationStatus ?? "not_sent").toLowerCase();
  if (input.collaboratorStatus === "signed" || status === "confirmed") {
    return { skip: true, code: "already_confirmed" };
  }
  if (status === "revoked" && input.mode !== "resend") {
    return { skip: true, code: "revoked" };
  }
  if (!isConfirmationPending(status, input.collaboratorStatus)) {
    return { skip: true, code: "not_pending" };
  }
  if (!(input.email ?? "").trim()) {
    return { skip: true, code: "no_email" };
  }
  if (input.mode === "remind" && status === "not_sent") {
    return { skip: true, code: "not_yet_sent" };
  }

  const sentAtMs = input.sentAt ? new Date(input.sentAt).getTime() : NaN;
  const recentlySent = Number.isFinite(sentAtMs) && status === "sent";
  if (recentlySent) {
    const age = now - sentAtMs;
    if (input.mode === "resend" && age < RESEND_COOLDOWN_MS) {
      return { skip: true, code: "already_sent" };
    }
    if (input.mode !== "resend" && age < DUPLICATE_WINDOW_MS) {
      return { skip: true, code: "already_sent" };
    }
  }
  return { skip: false };
}
