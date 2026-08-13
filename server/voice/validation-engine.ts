import type {
  ExtractedEntity,
  VoiceIntent,
  VoiceValidationIssue,
  ConfidenceBand,
} from "@shared/voice-orchestration";
import { confidenceBand, CONSEQUENTIAL_INTENTS } from "@shared/voice-orchestration";

export type ValidationResult = {
  ok: boolean;
  issues: VoiceValidationIssue[];
  band: ConfidenceBand;
  overallConfidence: number;
  conflict: boolean;
};

export function validateVoiceExtraction(input: {
  intent: VoiceIntent;
  intentConfidence: number;
  transcriptConfidence: number;
  entities: ExtractedEntity[];
}): ValidationResult {
  const issues: VoiceValidationIssue[] = [];
  let conflict = false;

  const ambiguous = input.entities.filter((e) => e.type === "ambiguous_number");
  for (const a of ambiguous) {
    issues.push({
      code: "ambiguous_number",
      severity: "blocking",
      message: `I heard “${a.raw}” but I’m not sure whether that means ownership %, royalty points, revenue share, or an amount of money. Please clarify.`,
      field: "economic_term",
    });
    conflict = true;
  }

  const ownership = input.entities.filter((e) => e.type === "ownership" || (e.type === "percentage" && e.notes?.includes("composition")));
  const points = input.entities.filter((e) => e.type === "points");
  const rights = input.entities.filter((e) => e.type === "right_type").map((e) => String(e.value));

  // Master points vs composition ownership confusion check
  if (points.length && ownership.length) {
    const masterScoped = points.some((p) => p.notes?.includes("master"));
    const compositionScoped = ownership.some((o) => String(o.notes || "").includes("composition") || String(o.value).includes("/"));
    if (!masterScoped && rights.includes("master") && rights.includes("composition")) {
      issues.push({
        code: "master_composition_distinction",
        severity: "warning",
        message: "I detected both master and composition terms. I’ll keep master royalty points separate from composition ownership unless you say otherwise.",
      });
    }
    if (compositionScoped && masterScoped) {
      issues.push({
        code: "dual_economics",
        severity: "info",
        message: "Recorded composition ownership and master royalty points as separate fields.",
      });
    }
  }

  if (points.length && !points.some((p) => p.notes?.includes("master") || p.notes?.includes("composition"))) {
    issues.push({
      code: "points_unscoped",
      severity: "warning",
      message: "You mentioned points without saying whether they apply to the master or composition. Please confirm.",
      field: "points",
    });
  }

  if (input.intent === "create_agreement_draft") {
    const agreementType = input.entities.find((e) => e.type === "agreement_type");
    if (!agreementType) {
      issues.push({
        code: "missing_agreement_type",
        severity: "blocking",
        message: "Which agreement template should I draft? For example: Producer Agreement or Split Sheet.",
        field: "agreement_type",
      });
    }
  }

  if (CONSEQUENTIAL_INTENTS.includes(input.intent) && input.transcriptConfidence < 0.7) {
    issues.push({
      code: "low_transcript_confidence",
      severity: "warning",
      message: "Speech recognition confidence is moderate. Please confirm the transcript before any changes.",
    });
  }

  const entityConf =
    input.entities.length === 0
      ? input.intentConfidence
      : input.entities.reduce((s, e) => s + e.confidence, 0) / input.entities.length;

  const overall =
    input.intentConfidence * 0.45 + input.transcriptConfidence * 0.25 + entityConf * 0.3;

  const blocking = issues.some((i) => i.severity === "blocking");
  const band = confidenceBand(overall, conflict || blocking);

  return {
    ok: !blocking && band !== "conflict" && band !== "low",
    issues,
    band,
    overallConfidence: Number(overall.toFixed(4)),
    conflict: conflict || blocking,
  };
}
