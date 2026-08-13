/**
 * Voice orchestration pipeline:
 * Speech → Intent → Entities → Rights context → Validation → Proposal → Confirmation gate → Audit → Response
 *
 * Voice never silently creates/modifies/signs agreements.
 * Canonical rights records always beat conversational memory.
 */
import {
  type VoiceTurnResult,
  requiresConfirmation,
  PLATFORM_VOICE_DISCLAIMER,
} from "@shared/voice-orchestration";
import { classifyIntent } from "./intent-engine";
import { extractEntities } from "./entity-extraction";
import { validateVoiceExtraction } from "./validation-engine";
import { buildProposedAction } from "./action-orchestrator";
import { composeVoiceResponse } from "./response";
import { retrieveRightsContext } from "./rights-context";
import {
  createPendingAction,
  createVoiceSession,
  getVoiceSession,
  listAuthorizedMemory,
  recordVoiceTurn,
  resolvePendingAction,
  writeProvenance,
} from "./store";
import { transcribeVoiceInput } from "./speech";

export async function startVoiceSession(input: {
  userId: string;
  pageContext?: string;
  projectId?: string;
  contractId?: string;
  organizationId?: string;
  locale?: string;
}) {
  const session = await createVoiceSession(input);
  const memory = await listAuthorizedMemory(input.userId);
  return {
    sessionId: session.id,
    expiresAt: session.expiresAt,
    memoryKeys: memory.map((m) => m.key),
    principles: {
      voiceIsNotLawyer: true,
      voiceIsNotDatabaseOfRecord: true,
      confirmationRequiredForConsequentialActions: true,
      canonicalRightsPrevail: true,
      disclaimer: PLATFORM_VOICE_DISCLAIMER,
    },
  };
}

export async function processVoiceTurn(input: {
  userId: string;
  sessionId: string;
  transcript?: string;
  audioBase64?: string;
  mimeType?: string;
}): Promise<VoiceTurnResult & { turnId: string; sessionId: string }> {
  const session = await getVoiceSession(input.sessionId, input.userId);
  if (!session || session.status !== "active") {
    throw Object.assign(new Error("Voice session not found or inactive"), { status: 404 });
  }
  if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
    throw Object.assign(new Error("Voice session expired"), { status: 410 });
  }

  const stt = await transcribeVoiceInput({
    transcript: input.transcript,
    audioBase64: input.audioBase64,
    mimeType: input.mimeType,
    locale: session.locale || "en-CA",
  });

  if (!stt.transcript) {
    throw Object.assign(new Error("No transcript available. Provide transcript or configure speech recognition."), {
      status: 400,
    });
  }

  const intentResult = classifyIntent(stt.transcript);
  const entities = extractEntities(stt.transcript);
  const validation = validateVoiceExtraction({
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    transcriptConfidence: stt.confidence,
    entities,
  });

  const songQuery = entities.find((e) => e.type === "song")?.value as string | undefined;
  const rightsContext = await retrieveRightsContext({
    userId: input.userId,
    projectId: session.projectId,
    contractId: session.contractId,
    songQuery,
  });

  const legalBoundaryTriggered = intentResult.intent === "legal_question";

  let proposedAction = buildProposedAction({
    intent: intentResult.intent,
    entities,
    transcript: stt.transcript,
    projectId: session.projectId,
    contractId: session.contractId,
    confidence: validation.overallConfidence,
  });

  const needsConfirm =
    !legalBoundaryTriggered &&
    (requiresConfirmation(intentResult.intent, validation.band) ||
      proposedAction?.requiresConfirmation ||
      validation.conflict);

  if (proposedAction && !needsConfirm && validation.band === "high") {
    // Still force confirmation for consequential proposals — never silent execute
    if (proposedAction.requiresConfirmation) {
      // keep
    }
  }

  // Force confirmation whenever a proposed consequential action exists
  if (proposedAction) {
    proposedAction = { ...proposedAction, requiresConfirmation: true };
  }

  const responseText = composeVoiceResponse({
    intent: intentResult.intent,
    transcript: stt.transcript,
    entities,
    issues: validation.issues,
    band: validation.band,
    proposedAction,
    rightsContext,
    legalBoundaryTriggered,
  });

  const userTurn = await recordVoiceTurn({
    sessionId: session.id,
    userId: input.userId,
    role: "user",
    transcript: stt.transcript,
    transcriptConfidence: stt.confidence,
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    entities,
    validation,
    riskLevel: proposedAction?.riskLevel || (legalBoundaryTriggered ? "high" : "low"),
    requiresConfirmation: Boolean(proposedAction),
  });

  let pendingActionId: string | undefined;
  if (proposedAction && !legalBoundaryTriggered && !validation.conflict) {
    const pending = await createPendingAction({
      sessionId: session.id,
      turnId: userTurn.id,
      userId: input.userId,
      action: proposedAction,
    });
    pendingActionId = pending.id;
  }

  for (const entity of entities) {
    await writeProvenance({
      sessionId: session.id,
      turnId: userTurn.id,
      userId: input.userId,
      source: input.audioBase64 ? "voice" : "text",
      fieldPath: `entities.${entity.type}`,
      extractedValue: entity,
      confidence: entity.confidence,
      confirmationStatus: proposedAction ? "pending" : "none",
    });
  }

  await recordVoiceTurn({
    sessionId: session.id,
    userId: input.userId,
    role: "assistant",
    responseText,
    intent: intentResult.intent,
    requiresConfirmation: Boolean(pendingActionId),
  });

  return {
    sessionId: session.id,
    turnId: userTurn.id,
    transcript: stt.transcript,
    transcriptConfidence: stt.confidence,
    intent: intentResult.intent,
    intentConfidence: intentResult.confidence,
    entities,
    validation: { ok: validation.ok, issues: validation.issues },
    confidenceBand: validation.band,
    proposedAction,
    pendingActionId,
    responseText,
    rightsContext,
    legalBoundaryTriggered,
  };
}

export async function confirmVoiceAction(input: {
  userId: string;
  sessionId: string;
  pendingActionId: string;
  decision: "confirmed" | "rejected";
}) {
  const session = await getVoiceSession(input.sessionId, input.userId);
  if (!session) {
    throw Object.assign(new Error("Voice session not found"), { status: 404 });
  }

  const result = await resolvePendingAction(input.pendingActionId, input.userId, input.decision);
  if (!result.ok) {
    throw Object.assign(new Error(result.error), { status: 400 });
  }

  const responseText =
    input.decision === "rejected"
      ? "Canceled. No changes were made to your agreements or rights records."
      : result.executed && (result.executed as any).contractId
        ? `Draft created. Agreement id ${(result.executed as any).contractId} is saved as a draft only — not signed or executed. ${PLATFORM_VOICE_DISCLAIMER}`
        : `Confirmed. ${JSON.stringify(result.executed)} ${PLATFORM_VOICE_DISCLAIMER}`;

  await recordVoiceTurn({
    sessionId: session.id,
    userId: input.userId,
    role: "assistant",
    responseText,
    intent: input.decision === "confirmed" ? "confirm_action" : "reject_action",
  });

  if (input.decision === "confirmed" && (result.executed as any)?.contractId) {
    await writeProvenance({
      sessionId: session.id,
      userId: input.userId,
      source: "voice",
      fieldPath: "action.create_agreement_draft",
      extractedValue: result.executed,
      confirmationStatus: "confirmed",
      resultRef: String((result.executed as any).contractId),
      confidence: 1,
    });
  }

  return {
    decision: input.decision,
    result: result.executed,
    responseText,
  };
}
