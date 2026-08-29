/**
 * Rights State Machine — deterministic workflow states for SplitSheet projects.
 *
 * Adapted to existing product facts (contracts.status, split_confirmations,
 * ownership_records) rather than a parallel state column. The frontend must
 * never be trusted to decide whether a transition is valid.
 *
 * This records operational workflow. It does not determine legal ownership.
 */

import type { ValidationResult } from "./split-validation";

export const RIGHTS_STATES = [
  "DRAFT",
  "INVALID",
  "VALIDATED",
  "AGREEMENT_READY",
  "CONFIRMATION_REQUESTED",
  "ACCESSED",
  "REVIEWED",
  "CONFIRMED",
  "EVIDENCE_RECORDED",
  "RIGHTS_RECORDED",
  "FINALIZED",
  "CHANGE_REQUESTED",
  "EXPIRED",
  "REVOKED",
  "CANCELLED",
] as const;

export type RightsState = (typeof RIGHTS_STATES)[number];

export const RIGHTS_EVENTS = [
  "VALIDATE_SPLITS",
  "REQUEST_CONFIRMATIONS",
  "ACCESS_CONFIRMATION",
  "REVIEW_CONFIRMATION",
  "SUBMIT_CONFIRMATION",
  "REQUEST_CHANGE",
  "REVOKE_TOKEN",
  "GENERATE_QR",
  "RECORD_EVIDENCE",
  "RECORD_RIGHTS",
  "FINALIZE",
  "CANCEL",
] as const;

export type RightsEvent = (typeof RIGHTS_EVENTS)[number];

/** Explicit transition map: event → states from which it is allowed. */
export const EVENT_ALLOWED_FROM: Record<RightsEvent, readonly RightsState[]> = {
  VALIDATE_SPLITS: [
    "DRAFT",
    "INVALID",
    "VALIDATED",
    "AGREEMENT_READY",
    "CHANGE_REQUESTED",
  ],
  REQUEST_CONFIRMATIONS: [
    "VALIDATED",
    "AGREEMENT_READY",
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
    "EXPIRED",
    "REVOKED",
  ],
  ACCESS_CONFIRMATION: [
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
  ],
  REVIEW_CONFIRMATION: [
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
  ],
  SUBMIT_CONFIRMATION: [
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
  ],
  REQUEST_CHANGE: [
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
  ],
  REVOKE_TOKEN: [
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
    "EXPIRED",
  ],
  GENERATE_QR: [
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
    "EXPIRED",
    "REVOKED",
  ],
  RECORD_EVIDENCE: ["CONFIRMED", "EVIDENCE_RECORDED"],
  RECORD_RIGHTS: ["CONFIRMED", "EVIDENCE_RECORDED", "RIGHTS_RECORDED"],
  FINALIZE: ["EVIDENCE_RECORDED", "RIGHTS_RECORDED", "FINALIZED"],
  CANCEL: [
    "DRAFT",
    "INVALID",
    "VALIDATED",
    "AGREEMENT_READY",
    "CONFIRMATION_REQUESTED",
    "ACCESSED",
    "REVIEWED",
    "CHANGE_REQUESTED",
    "EXPIRED",
    "REVOKED",
  ],
};

export const TERMINAL_STATES: readonly RightsState[] = ["FINALIZED", "CANCELLED"];

export type ConfirmationFacts = {
  status: string;
  revokedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  firstAccessedAt?: Date | string | null;
  confirmedAt?: Date | string | null;
  ipAddress?: string | null;
};

export type WorkflowSnapshot = {
  contractStatus: string;
  organizationId?: string | null;
  createdBy: string;
  hasCollaborators: boolean;
  splitsValid: boolean;
  validation: ValidationResult;
  confirmations: ConfirmationFacts[];
  rightsLedgerSynced: boolean;
  now?: Date;
};

export function canTransition(from: RightsState, event: RightsEvent): boolean {
  if (TERMINAL_STATES.includes(from) && event !== "FINALIZE") {
    return event === "FINALIZE" && from === "FINALIZED";
  }
  return EVENT_ALLOWED_FROM[event]?.includes(from) ?? false;
}

export function assertTransition(from: RightsState, event: RightsEvent): void {
  if (!canTransition(from, event)) {
    throw new Error(`Invalid state transition: ${from} cannot accept ${event}`);
  }
}

export function isRevokedConfirmation(c: ConfirmationFacts): boolean {
  return c.status === "revoked" || Boolean(c.revokedAt);
}

export function isExpiredConfirmation(c: ConfirmationFacts, now: Date): boolean {
  if (!c.expiresAt) return false;
  return new Date(c.expiresAt).getTime() < now.getTime();
}

/**
 * Derive project workflow state from existing tables.
 * Priority: cancelled → all-confirmed chain → change/revoke/expire → access → requested → splits.
 */
export function deriveRightsState(snap: WorkflowSnapshot): RightsState {
  const now = snap.now ?? new Date();
  const st = (snap.contractStatus || "draft").toLowerCase();
  if (st === "cancelled" || st === "archived") return "CANCELLED";

  const confs = snap.confirmations;
  const active = confs.filter((c) => !isRevokedConfirmation(c));
  const confirmed = active.filter((c) => c.status === "confirmed");
  const changeReq = active.filter((c) => c.status === "change_requested");
  const outstanding = active.filter((c) => c.status !== "confirmed");
  const expiredOutstanding = outstanding.filter((c) => isExpiredConfirmation(c, now));
  const accessed = confs.some((c) => Boolean(c.firstAccessedAt));
  const hasEvidence = confirmed.some((c) => Boolean(c.ipAddress) || Boolean(c.confirmedAt));

  if (confs.length === 0) {
    if (!snap.hasCollaborators) return "DRAFT";
    if (!snap.splitsValid) return "INVALID";
    return "AGREEMENT_READY";
  }

  if (active.length > 0 && confirmed.length === active.length) {
    if (snap.rightsLedgerSynced) return "FINALIZED";
    if (hasEvidence) return "EVIDENCE_RECORDED";
    return "CONFIRMED";
  }

  if (changeReq.length > 0) return "CHANGE_REQUESTED";
  if (confs.length > 0 && active.length === 0) return "REVOKED";
  if (outstanding.length > 0 && expiredOutstanding.length === outstanding.length) return "EXPIRED";
  if (accessed) return "ACCESSED";
  return "CONFIRMATION_REQUESTED";
}

/** Operator-facing labels — no FSM jargon in the UI. */
export const RIGHTS_STATE_LABELS: Record<RightsState, string> = {
  DRAFT: "Draft",
  INVALID: "Splits need attention",
  VALIDATED: "Splits validated",
  AGREEMENT_READY: "Ready for confirmation",
  CONFIRMATION_REQUESTED: "Waiting for confirmations",
  ACCESSED: "Contributors reviewing",
  REVIEWED: "Contributors reviewing",
  CONFIRMED: "All contributors confirmed",
  EVIDENCE_RECORDED: "Confirmation evidence recorded",
  RIGHTS_RECORDED: "Rights record saved",
  FINALIZED: "Complete",
  CHANGE_REQUESTED: "Change requested",
  EXPIRED: "Confirmation links expired",
  REVOKED: "Confirmation links revoked",
  CANCELLED: "Cancelled",
};

export type WorkflowStep = {
  id: string;
  label: string;
  done: boolean;
  current: boolean;
};

export function workflowSteps(snap: WorkflowSnapshot, state: RightsState): WorkflowStep[] {
  const confs = snap.confirmations;
  const active = confs.filter((c) => !isRevokedConfirmation(c));
  const allConfirmed = active.length > 0 && active.every((c) => c.status === "confirmed");
  const hasAccess = confs.some((c) => Boolean(c.firstAccessedAt));
  const hasEvidence = active.some(
    (c) => c.status === "confirmed" && (Boolean(c.ipAddress) || Boolean(c.confirmedAt)),
  );

  const steps: Array<{ id: string; label: string; done: boolean }> = [
    { id: "created", label: "Project created", done: true },
    { id: "splits", label: "Splits validated", done: snap.splitsValid },
    { id: "agreement", label: "Agreement prepared", done: snap.hasCollaborators && snap.splitsValid },
    { id: "requested", label: "Confirmation requested", done: confs.length > 0 },
    { id: "review", label: "Contributors reviewing", done: hasAccess || allConfirmed },
    { id: "confirmed", label: "Confirmations complete", done: allConfirmed },
    { id: "evidence", label: "Evidence recorded", done: hasEvidence || snap.rightsLedgerSynced },
    { id: "ledger", label: "Rights record saved", done: snap.rightsLedgerSynced },
  ];

  const firstOpen = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({
    ...s,
    current: !TERMINAL_STATES.includes(state) && (i === firstOpen || (firstOpen === -1 && i === steps.length - 1)),
  }));
}

export const RSEE_EVENT_LABELS: Record<string, string> = {
  RSEE_PROJECT_CREATED: "Project created",
  RSEE_SPLIT_VALIDATED: "Ownership validated",
  RSEE_CONFIRMATION_REQUESTED: "Confirmation request created",
  RSEE_QR_GENERATED: "QR generated",
  RSEE_CONFIRMATION_ACCESSED: "Contributor accessed confirmation",
  RSEE_CONFIRMATION_REVIEWED: "Contributor reviewed split",
  RSEE_CONFIRMATION_COMPLETED: "Contributor confirmed",
  RSEE_EVIDENCE_RECORDED: "Evidence recorded",
  RSEE_RIGHTS_RECORDED: "Rights recorded",
  RSEE_RIGHTS_FINALIZED: "Rights record completed",
  RSEE_CHANGE_REQUESTED: "Change requested",
  RSEE_TOKEN_REVOKED: "Confirmation link revoked",
  RSEE_TOKEN_EXPIRED: "Confirmation link expired",
  AUTH_CONFIRM_VIEW: "Contributor accessed confirmation",
  AUTH_CONFIRM_SUBMIT: "Contributor submitted confirmation",
  AUTH_QR_GENERATED: "QR generated",
  AUTH_QR_ACCESSED: "Contributor accessed confirmation via QR",
  AUTH_QR_REVOKED: "Confirmation link revoked",
  AUTH_QR_REGENERATED: "QR regenerated",
  AUTH_CONFIRM_REVOKE: "Confirmation link revoked",
};

export function timelineLabelForAction(action: string): string {
  return RSEE_EVENT_LABELS[action] ?? action.replace(/^RSEE_|^AUTH_/, "").replace(/_/g, " ").toLowerCase();
}
