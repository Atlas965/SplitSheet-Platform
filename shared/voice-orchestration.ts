/**
 * SoundLedger Copilot Voice Assistant — shared orchestration contracts.
 * Voice is a controlled orchestration layer over structured rights infrastructure.
 * Not a lawyer. Not a database of record.
 */

export const VOICE_INTENTS = [
  "search",
  "summarize",
  "retrieve_rights",
  "retrieve_agreement",
  "create_agreement_draft",
  "update_agreement_fields",
  "identify_missing_fields",
  "identify_conflicts",
  "extract_rights",
  "create_rights_record",
  "flag_for_review",
  "prepare_for_counsel",
  "clarify",
  "confirm_action",
  "reject_action",
  "legal_question",
  "unknown",
] as const;
export type VoiceIntent = (typeof VOICE_INTENTS)[number];

export const CONSEQUENTIAL_INTENTS: VoiceIntent[] = [
  "create_agreement_draft",
  "update_agreement_fields",
  "create_rights_record",
  "extract_rights",
  "flag_for_review",
];

export const LOW_RISK_INTENTS: VoiceIntent[] = [
  "search",
  "summarize",
  "retrieve_rights",
  "retrieve_agreement",
  "identify_missing_fields",
  "identify_conflicts",
  "prepare_for_counsel",
  "clarify",
];

export type ConfidenceBand = "high" | "medium" | "low" | "conflict";

export const CONFIDENCE_THRESHOLDS = {
  high: 0.85,
  medium: 0.6,
  low: 0.35,
} as const;

export function confidenceBand(score: number, conflict = false): ConfidenceBand {
  if (conflict) return "conflict";
  if (score >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

export const RIGHTS_TERMINOLOGY = [
  "master",
  "composition",
  "publishing",
  "split",
  "points",
  "royalty",
  "producer points",
  "mechanical",
  "performance",
  "synchronization",
  "sync",
  "license",
  "territory",
  "term",
  "exclusive",
  "non-exclusive",
  "ownership",
  "assignment",
  "work-for-hire",
  "work for hire",
  "featured artist",
  "neighboring rights",
] as const;

export type ExtractedEntity = {
  type:
    | "party"
    | "role"
    | "song"
    | "recording"
    | "percentage"
    | "points"
    | "currency"
    | "royalty"
    | "ownership"
    | "right_type"
    | "agreement_type"
    | "territory"
    | "term"
    | "exclusivity"
    | "date"
    | "ambiguous_number";
  value: string | number;
  raw: string;
  confidence: number;
  notes?: string;
};

export type VoiceValidationIssue = {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
  field?: string;
};

export type ProposedAction = {
  actionType: string;
  summary: string;
  payload: Record<string, unknown>;
  requiresConfirmation: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
};

export type VoiceTurnResult = {
  transcript: string;
  transcriptConfidence: number;
  intent: VoiceIntent;
  intentConfidence: number;
  entities: ExtractedEntity[];
  validation: { ok: boolean; issues: VoiceValidationIssue[] };
  confidenceBand: ConfidenceBand;
  proposedAction?: ProposedAction;
  pendingActionId?: string;
  responseText: string;
  rightsContext?: Record<string, unknown> | null;
  legalBoundaryTriggered?: boolean;
};

export const LEGAL_VOICE_REFUSAL =
  "I can identify the relevant provision and prepare the information for review, but I can't determine whether this provision is legally appropriate for your transaction.";

export const PLATFORM_VOICE_DISCLAIMER =
  "SoundLedger Copilot helps with workflow and structured documentation. It is not a lawyer and does not provide legal advice.";

/** Ambiguous numeric phrases that must never be auto-mapped to ownership/royalty/currency */
export const AMBIGUOUS_NUMBER_PATTERNS = [
  /\b(gets?|give|giving|at)\s+(\d+(?:\.\d+)?)\b/i,
  /\b(\d+(?:\.\d+)?)\s+(points?|percent|%|bucks|dollars)?\b/i,
];

export function requiresConfirmation(intent: VoiceIntent, band: ConfidenceBand): boolean {
  if (band === "conflict" || band === "low") return true;
  if (CONSEQUENTIAL_INTENTS.includes(intent)) return true;
  if (band === "medium" && !LOW_RISK_INTENTS.includes(intent)) return true;
  return false;
}

export const VOICE_RETENTION = {
  /** Default hours to retain raw audio references (if any); transcripts may be shorter-lived */
  audioHours: 24,
  transcriptHours: 168, // 7 days
  pendingActionMinutes: 30,
  sessionHours: 4,
} as const;
