import type {
  ExtractedEntity,
  ProposedAction,
  VoiceIntent,
} from "@shared/voice-orchestration";

export function buildProposedAction(input: {
  intent: VoiceIntent;
  entities: ExtractedEntity[];
  transcript: string;
  projectId?: string | null;
  contractId?: string | null;
  confidence: number;
}): ProposedAction | undefined {
  const agreementType =
    (input.entities.find((e) => e.type === "agreement_type")?.value as string) || undefined;

  const ownership = input.entities.filter((e) => e.type === "ownership");
  const points = input.entities.filter((e) => e.type === "points");
  const song = input.entities.find((e) => e.type === "song");

  if (input.intent === "create_agreement_draft") {
    const data: Record<string, unknown> = {
      sourceTranscript: input.transcript,
      compositionOwnership: ownership.map((o) => o.value),
      masterPoints: points.map((p) => ({
        value: p.value,
        scope: p.notes?.replace("on:", "") || "unspecified",
      })),
      roles: input.entities.filter((e) => e.type === "role").map((e) => e.value),
      rightTypes: input.entities.filter((e) => e.type === "right_type").map((e) => e.value),
    };
    if (song) data.songTitle = song.value;

    const typeLabel = agreementType || "agreement";
    return {
      actionType: "create_agreement_draft",
      summary: `Prepare a draft ${typeLabel} from your voice request (not executed until you confirm).`,
      payload: {
        agreementType: agreementType || "producer",
        title: song ? `${song.value} — ${typeLabel}` : undefined,
        projectId: input.projectId,
        contractId: input.contractId,
        data,
      },
      requiresConfirmation: true,
      riskLevel: "high",
      confidence: input.confidence,
    };
  }

  if (input.intent === "update_agreement_fields") {
    return {
      actionType: "update_agreement_fields",
      summary: "Update agreement fields from voice (requires confirmation; will not silently modify rights).",
      payload: {
        contractId: input.contractId,
        projectId: input.projectId,
        fields: {
          ownership,
          points,
          exclusivity: input.entities.find((e) => e.type === "exclusivity")?.value,
        },
      },
      requiresConfirmation: true,
      riskLevel: "high",
      confidence: input.confidence,
    };
  }

  if (input.intent === "create_rights_record") {
    return {
      actionType: "create_rights_record",
      summary: "Create a Rights Ledger record from confirmed structured data (append-only).",
      payload: { projectId: input.projectId, contractId: input.contractId, ownership, points },
      requiresConfirmation: true,
      riskLevel: "critical",
      confidence: input.confidence,
    };
  }

  if (input.intent === "flag_for_review") {
    return {
      actionType: "flag_for_review",
      summary: "Flag this matter for qualified counsel review.",
      payload: {
        targetId: input.contractId || input.projectId,
        note: input.transcript,
      },
      requiresConfirmation: true,
      riskLevel: "medium",
      confidence: input.confidence,
    };
  }

  if (input.intent === "prepare_for_counsel") {
    return {
      actionType: "prepare_for_counsel",
      summary: "Assemble a counsel preparation package from stored records only.",
      payload: {
        package: {
          contractId: input.contractId,
          projectId: input.projectId,
          transcript: input.transcript,
        },
      },
      requiresConfirmation: true,
      riskLevel: "medium",
      confidence: input.confidence,
    };
  }

  return undefined;
}
