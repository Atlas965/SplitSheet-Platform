/**
 * Rights State & Evidence Engine (RSEE)
 *
 * Internal workflow layer under the existing SplitSheet product.
 * Reuses: contracts, contract_collaborators, split_confirmations, audit_log,
 * song_assets, ownership_records. Does not create a second Rights Ledger.
 *
 * Server is authoritative. AI must not drive these transitions.
 */
import type { Request } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { auditLog } from "./security";
import { resourceBelongsToOrg } from "./authz-helpers";
import { syncAgreementToRightsLedger } from "./agreement-ledger";
import { LEGAL_DISCLAIMER } from "@shared/agreement-catalog";
import { validateSplits, type ValidationResult } from "@shared/split-validation";
import {
  assertTransition,
  canTransition,
  deriveRightsState,
  timelineLabelForAction,
  workflowSteps,
  RIGHTS_STATE_LABELS,
  type ConfirmationFacts,
  type RightsEvent,
  type RightsState,
  type WorkflowSnapshot,
} from "@shared/rights-state";

export { canTransition, assertTransition, deriveRightsState };

export const RSEE_ACTIONS = {
  PROJECT_CREATED: "RSEE_PROJECT_CREATED",
  SPLIT_VALIDATED: "RSEE_SPLIT_VALIDATED",
  CONFIRMATION_REQUESTED: "RSEE_CONFIRMATION_REQUESTED",
  QR_GENERATED: "RSEE_QR_GENERATED",
  CONFIRMATION_ACCESSED: "RSEE_CONFIRMATION_ACCESSED",
  CONFIRMATION_REVIEWED: "RSEE_CONFIRMATION_REVIEWED",
  CONFIRMATION_COMPLETED: "RSEE_CONFIRMATION_COMPLETED",
  EVIDENCE_RECORDED: "RSEE_EVIDENCE_RECORDED",
  RIGHTS_RECORDED: "RSEE_RIGHTS_RECORDED",
  RIGHTS_FINALIZED: "RSEE_RIGHTS_FINALIZED",
  CHANGE_REQUESTED: "RSEE_CHANGE_REQUESTED",
  TOKEN_REVOKED: "RSEE_TOKEN_REVOKED",
  TOKEN_EXPIRED: "RSEE_TOKEN_EXPIRED",
} as const;

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export function rightsLedgerAlreadySynced(metadata: unknown): boolean {
  const sync = asRecord(asRecord(metadata).rightsLedgerSync);
  return sync.ownershipVersion != null || sync.licenseId != null;
}

export type TransitionCheck = {
  ok: boolean;
  from: RightsState;
  event: RightsEvent;
  error?: string;
  code?: string;
  validation?: ValidationResult;
};

export function evaluateEvent(
  snapshot: WorkflowSnapshot,
  event: RightsEvent,
  opts: { requireValidSplits?: boolean } = {},
): TransitionCheck {
  const from = deriveRightsState(snapshot);
  if (opts.requireValidSplits ?? event === "REQUEST_CONFIRMATIONS") {
    if (!snapshot.splitsValid) {
      return {
        ok: false,
        from,
        event,
        error: snapshot.validation.errors[0]?.message ?? "Splits must total 100% before this step.",
        code: snapshot.validation.errors[0]?.code ?? "SPLIT_TOTAL_INVALID",
        validation: snapshot.validation,
      };
    }
  }
  if (!canTransition(from, event)) {
    return {
      ok: false,
      from,
      event,
      error: `This project cannot perform that action in its current status (${RIGHTS_STATE_LABELS[from]}).`,
      code: "INVALID_TRANSITION",
    };
  }
  return { ok: true, from, event, validation: snapshot.validation };
}

export function authorizeOperatorAccess(params: {
  organizationId?: string | null;
  createdBy: string;
  actorOrgId: string | null | undefined;
  actorUserId: string;
}): boolean {
  return resourceBelongsToOrg(
    { organizationId: params.organizationId, createdBy: params.createdBy },
    params.actorOrgId,
    params.actorUserId,
  );
}

export async function recordWorkflowEvent(input: {
  action: string;
  projectId: string;
  previousState?: RightsState | string | null;
  newState?: RightsState | string | null;
  actorType?: "operator" | "contributor" | "system";
  actorId?: string | null;
  entityType?: string;
  entityId?: string | null;
  accessMethod?: "link" | "qr";
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  const ip =
    input.req
      ? ((input.req as any).ip ||
          input.req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() ||
          input.req.socket?.remoteAddress)
      : undefined;
  await auditLog({
    userId: input.actorType === "operator" ? input.actorId ?? undefined : undefined,
    action: input.action,
    resourceType: "project",
    resourceId: input.projectId,
    beforeState: input.previousState ? { state: input.previousState } : undefined,
    afterState: {
      newState: input.newState ?? null,
      actorType: input.actorType ?? "system",
      actorId: input.actorType === "contributor" ? undefined : input.actorId ?? null,
      entityType: input.entityType ?? "project",
      entityId: input.entityId ?? null,
      accessMethod: input.accessMethod,
      ...(input.metadata ?? {}),
    },
    ipAddress: typeof ip === "string" ? ip : undefined,
    userAgent: input.req?.headers["user-agent"]?.toString(),
    requestId: (input.req as any)?.requestId,
  });
}

function mapConfirmationRow(row: Record<string, unknown>): ConfirmationFacts {
  return {
    status: String(row.status ?? "not_sent"),
    revokedAt: (row.revoked_at as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    firstAccessedAt: (row.first_accessed_at as string) ?? null,
    confirmedAt: (row.confirmed_at as string) ?? null,
    ipAddress: (row.ip_address as string) ?? null,
  };
}

export async function loadWorkflowSnapshot(contractId: string): Promise<(WorkflowSnapshot & {
  title: string;
  collaborators: Array<{
    id: string;
    name: string;
    email: string | null;
    role: string;
    ownershipPercentage: string | number | null;
  }>;
  confirmationRows: Array<Record<string, unknown>>;
  organizationId: string | null;
  createdBy: string;
  metadata: Record<string, unknown>;
}) | null> {
  const contract = await storage.getContract(contractId);
  if (!contract) return null;
  const collabs = await storage.getContractCollaborators(contractId);
  const validation = validateSplits(
    collabs.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      ownershipPercentage: c.ownershipPercentage,
    })),
  );
  const confRows = await db.execute(sql`
    SELECT id, collaborator_id, status, revoked_at, expires_at, first_accessed_at,
           confirmed_at, ip_address, access_method
    FROM split_confirmations
    WHERE contract_id = ${contractId}
  `);
  const confirmationRows = confRows.rows as Record<string, unknown>[];
  return {
    contractStatus: contract.status ?? "draft",
    organizationId: contract.organizationId ?? null,
    createdBy: contract.createdBy,
    hasCollaborators: collabs.length > 0,
    splitsValid: validation.valid,
    validation,
    confirmations: confirmationRows.map(mapConfirmationRow),
    rightsLedgerSynced: rightsLedgerAlreadySynced(contract.metadata),
    title: contract.title,
    collaborators: collabs.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email ?? null,
      role: c.role,
      ownershipPercentage: c.ownershipPercentage,
    })),
    confirmationRows,
    metadata: asRecord(contract.metadata),
  };
}

export async function getProjectWorkflow(contractId: string) {
  const snap = await loadWorkflowSnapshot(contractId);
  if (!snap) return null;
  const state = deriveRightsState(snap);
  const active = snap.confirmationRows.filter((r) => r.status !== "revoked" && !r.revoked_at);
  const confirmed = active.filter((r) => r.status === "confirmed");
  const confirmedPercent =
    active.length > 0 ? Math.round((confirmed.length / active.length) * 100) : 0;

  const contributorStatus = snap.collaborators.map((c) => {
    const conf = snap.confirmationRows.find((r) => r.collaborator_id === c.id);
    const status = String(conf?.status ?? "not_requested");
    return {
      name: c.name,
      role: c.role,
      ownershipPercentage: String(c.ownershipPercentage ?? "0"),
      status,
      confirmed: status === "confirmed",
      awaiting: status !== "confirmed" && status !== "revoked",
    };
  });

  const timelineRows = await db.execute(sql`
    SELECT action, before_state, after_state, created_at
    FROM audit_log
    WHERE resource_id = ${contractId}
      AND (
        action LIKE 'RSEE_%'
        OR action LIKE 'AUTH_CONFIRM%'
        OR action LIKE 'AUTH_QR_%'
      )
    ORDER BY created_at ASC
    LIMIT 80
  `);

  const timeline = (timelineRows.rows as Record<string, unknown>[]).map((row) => {
    const at = row.created_at ? new Date(String(row.created_at)) : null;
    return {
      at: at?.toISOString() ?? null,
      label: timelineLabelForAction(String(row.action ?? "")),
      eventType: row.action,
    };
  });

  const sync = asRecord(snap.metadata.rightsLedgerSync);

  return {
    state,
    label: RIGHTS_STATE_LABELS[state],
    steps: workflowSteps(snap, state),
    validation: snap.validation,
    contributors: contributorStatus,
    confirmedPercent,
    rightsLedger: {
      synced: snap.rightsLedgerSynced,
      assetId: sync.assetId ?? null,
      ownershipVersion: sync.ownershipVersion ?? null,
    },
    timeline,
    disclaimer: LEGAL_DISCLAIMER,
  };
}

/**
 * After every active confirmation is complete: mark signed, record evidence,
 * sync the existing Rights Ledger (idempotent), finalize.
 */
export async function completeConfirmedProject(params: {
  contractId: string;
  actorId?: string | null;
  actorType?: "operator" | "contributor" | "system";
  accessMethod?: "link" | "qr";
  req?: Request;
}): Promise<{ finalized: boolean; ledger?: Awaited<ReturnType<typeof syncAgreementToRightsLedger>> }> {
  const snap = await loadWorkflowSnapshot(params.contractId);
  if (!snap) return { finalized: false };
  const from = deriveRightsState(snap);
  if (from !== "CONFIRMED" && from !== "EVIDENCE_RECORDED" && from !== "RIGHTS_RECORDED" && from !== "FINALIZED") {
    return { finalized: false };
  }

  await db.execute(sql`
    UPDATE contracts SET status = 'signed', updated_at = NOW()
    WHERE id = ${params.contractId}
      AND status IS DISTINCT FROM 'cancelled'
  `);

  if (from === "CONFIRMED" || from === "EVIDENCE_RECORDED") {
    await recordWorkflowEvent({
      action: RSEE_ACTIONS.EVIDENCE_RECORDED,
      projectId: params.contractId,
      previousState: from,
      newState: "EVIDENCE_RECORDED",
      actorType: params.actorType ?? "system",
      actorId: params.actorId,
      accessMethod: params.accessMethod,
      req: params.req,
    });
  }

  if (snap.rightsLedgerSynced) {
    if (from !== "FINALIZED") {
      await recordWorkflowEvent({
        action: RSEE_ACTIONS.RIGHTS_FINALIZED,
        projectId: params.contractId,
        previousState: "RIGHTS_RECORDED",
        newState: "FINALIZED",
        actorType: "system",
        req: params.req,
      });
    }
    return { finalized: true };
  }

  const evidenceCheck = evaluateEvent({ ...snap, contractStatus: "signed" }, "RECORD_RIGHTS");
  if (!evidenceCheck.ok && from !== "EVIDENCE_RECORDED" && from !== "CONFIRMED") {
    return { finalized: false };
  }

  const ledger = await syncAgreementToRightsLedger(params.contractId, params.actorId ?? undefined);
  if (ledger.synced) {
    await recordWorkflowEvent({
      action: RSEE_ACTIONS.RIGHTS_RECORDED,
      projectId: params.contractId,
      previousState: "EVIDENCE_RECORDED",
      newState: "RIGHTS_RECORDED",
      actorType: "system",
      actorId: params.actorId,
      metadata: {
        ownershipVersion: ledger.ownershipVersion ?? null,
        assetId: ledger.assetId ?? null,
      },
      req: params.req,
    });
    await recordWorkflowEvent({
      action: RSEE_ACTIONS.RIGHTS_FINALIZED,
      projectId: params.contractId,
      previousState: "RIGHTS_RECORDED",
      newState: "FINALIZED",
      actorType: "system",
      req: params.req,
    });
  }
  return { finalized: ledger.synced, ledger };
}
