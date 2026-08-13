import { and, desc, eq } from "drizzle-orm";
import { db } from "../db";
import {
  voicePendingActions,
  voiceProvenance,
  voiceSessions,
  voiceTurns,
  voiceUserMemory,
} from "@shared/schema";
import { VOICE_RETENTION } from "@shared/voice-orchestration";
import type { ExtractedEntity, ProposedAction, VoiceIntent } from "@shared/voice-orchestration";
import { storage } from "../storage";

export async function createVoiceSession(input: {
  userId: string;
  pageContext?: string;
  projectId?: string;
  contractId?: string;
  organizationId?: string;
  locale?: string;
}) {
  const expiresAt = new Date(Date.now() + VOICE_RETENTION.sessionHours * 3600_000);
  const [session] = await db
    .insert(voiceSessions)
    .values({
      userId: input.userId,
      pageContext: input.pageContext,
      projectId: input.projectId,
      contractId: input.contractId,
      organizationId: input.organizationId,
      locale: input.locale || "en-CA",
      status: "active",
      expiresAt,
      metadata: {},
    })
    .returning();
  return session;
}

export async function getVoiceSession(sessionId: string, userId: string) {
  const [session] = await db
    .select()
    .from(voiceSessions)
    .where(and(eq(voiceSessions.id, sessionId), eq(voiceSessions.userId, userId)));
  return session;
}

export async function recordVoiceTurn(input: {
  sessionId: string;
  userId: string;
  role: "user" | "assistant" | "system";
  transcript?: string;
  transcriptConfidence?: number;
  intent?: VoiceIntent;
  intentConfidence?: number;
  entities?: ExtractedEntity[];
  validation?: unknown;
  responseText?: string;
  riskLevel?: string;
  requiresConfirmation?: boolean;
}) {
  const audioUntil = new Date(Date.now() + VOICE_RETENTION.audioHours * 3600_000);
  const [turn] = await db
    .insert(voiceTurns)
    .values({
      sessionId: input.sessionId,
      userId: input.userId,
      role: input.role,
      transcript: input.transcript,
      transcriptConfidence: input.transcriptConfidence != null ? String(input.transcriptConfidence) : null,
      intent: input.intent,
      intentConfidence: input.intentConfidence != null ? String(input.intentConfidence) : null,
      entities: input.entities as any,
      validation: input.validation as any,
      responseText: input.responseText,
      riskLevel: input.riskLevel,
      requiresConfirmation: input.requiresConfirmation ?? false,
      audioRetentionUntil: audioUntil,
    })
    .returning();
  return turn;
}

export async function writeProvenance(input: {
  sessionId: string;
  turnId?: string;
  userId: string;
  source: "voice" | "text" | "system";
  fieldPath: string;
  extractedValue: unknown;
  confidence?: number;
  confirmationStatus?: string;
  resultRef?: string;
}) {
  const [row] = await db
    .insert(voiceProvenance)
    .values({
      sessionId: input.sessionId,
      turnId: input.turnId,
      userId: input.userId,
      source: input.source,
      fieldPath: input.fieldPath,
      extractedValue: input.extractedValue as any,
      confidence: input.confidence != null ? String(input.confidence) : null,
      confirmationStatus: input.confirmationStatus ?? "none",
      resultRef: input.resultRef,
    })
    .returning();
  return row;
}

export async function createPendingAction(input: {
  sessionId: string;
  turnId?: string;
  userId: string;
  action: ProposedAction;
}) {
  const expiresAt = new Date(Date.now() + VOICE_RETENTION.pendingActionMinutes * 60_000);
  const [row] = await db
    .insert(voicePendingActions)
    .values({
      sessionId: input.sessionId,
      turnId: input.turnId,
      userId: input.userId,
      actionType: input.action.actionType,
      payload: {
        summary: input.action.summary,
        riskLevel: input.action.riskLevel,
        ...input.action.payload,
      },
      status: "pending",
      confidence: String(input.action.confidence),
      expiresAt,
    })
    .returning();
  return row;
}

export async function getPendingAction(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(voicePendingActions)
    .where(and(eq(voicePendingActions.id, id), eq(voicePendingActions.userId, userId)));
  return row;
}

export async function resolvePendingAction(
  id: string,
  userId: string,
  decision: "confirmed" | "rejected",
) {
  const pending = await getPendingAction(id, userId);
  if (!pending) return { ok: false as const, error: "Pending action not found" };
  if (pending.status !== "pending") {
    return { ok: false as const, error: `Action already ${pending.status}` };
  }
  if (pending.expiresAt && pending.expiresAt.getTime() < Date.now()) {
    await db
      .update(voicePendingActions)
      .set({ status: "expired" })
      .where(eq(voicePendingActions.id, id));
    return { ok: false as const, error: "Pending action expired — please repeat the request" };
  }

  if (decision === "rejected") {
    const [row] = await db
      .update(voicePendingActions)
      .set({ status: "rejected", confirmedAt: new Date() })
      .where(eq(voicePendingActions.id, id))
      .returning();
    return { ok: true as const, pending: row, executed: null };
  }

  // Confirmed — execute only draft/safe orchestrated actions
  const payload = (pending.payload || {}) as Record<string, any>;
  let result: Record<string, unknown> = {};

  try {
    if (pending.actionType === "create_agreement_draft") {
      const type = String(payload.agreementType || "split-sheet");
      const title = String(payload.title || `Voice draft — ${type}`);
      const data = payload.data || {};
      const contract = await storage.createContract({
        title,
        type,
        status: "draft",
        createdBy: userId,
        data: {
          ...data,
          voiceOrigin: true,
          provenanceNote: "Created via Copilot Voice after explicit confirmation",
        },
        metadata: {
          createdFrom: "voice_copilot",
          pendingActionId: id,
          requiresLegalReview: true,
        },
        templateVersion: payload.templateVersion ?? null,
      } as any);
      result = { contractId: contract.id, status: contract.status, type: contract.type };
    } else if (pending.actionType === "flag_for_review") {
      result = {
        flagged: true,
        targetId: payload.targetId || null,
        note: payload.note || "Flagged via Copilot Voice for qualified counsel review",
      };
    } else if (pending.actionType === "prepare_for_counsel") {
      result = {
        package: payload.package || {},
        message: "Counsel preparation package assembled from stored records only.",
      };
    } else {
      result = {
        deferred: true,
        message:
          "This action type requires the standard SplitSheet workflow UI/API and was not auto-executed.",
      };
    }

    const [row] = await db
      .update(voicePendingActions)
      .set({
        status: "executed",
        confirmedAt: new Date(),
        executedAt: new Date(),
        result: result as any,
      })
      .where(eq(voicePendingActions.id, id))
      .returning();

    return { ok: true as const, pending: row, executed: result };
  } catch (err: any) {
    await db
      .update(voicePendingActions)
      .set({ status: "failed", result: { error: String(err?.message || err) } as any })
      .where(eq(voicePendingActions.id, id));
    return { ok: false as const, error: "Failed to execute confirmed action" };
  }
}

export async function listAuthorizedMemory(userId: string) {
  return db
    .select()
    .from(voiceUserMemory)
    .where(and(eq(voiceUserMemory.userId, userId), eq(voiceUserMemory.authorized, true)))
    .orderBy(desc(voiceUserMemory.updatedAt));
}

export async function upsertAuthorizedMemory(input: {
  userId: string;
  key: string;
  value: unknown;
  category?: string;
}) {
  // Never persist secrets/PII dumps — only small preference keys
  const blocked = /password|ssn|sin|bank|card|secret|signature/i;
  if (blocked.test(input.key) || blocked.test(JSON.stringify(input.value))) {
    throw new Error("That information cannot be stored in Copilot memory");
  }
  const existing = await db
    .select()
    .from(voiceUserMemory)
    .where(and(eq(voiceUserMemory.userId, input.userId), eq(voiceUserMemory.key, input.key)));

  if (existing[0]) {
    const [row] = await db
      .update(voiceUserMemory)
      .set({ value: input.value as any, updatedAt: new Date(), category: input.category || existing[0].category })
      .where(eq(voiceUserMemory.id, existing[0].id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(voiceUserMemory)
    .values({
      userId: input.userId,
      key: input.key,
      value: input.value as any,
      category: input.category || "preference",
      authorized: true,
    })
    .returning();
  return row;
}
