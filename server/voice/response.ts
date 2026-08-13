import {
  LEGAL_VOICE_REFUSAL,
  PLATFORM_VOICE_DISCLAIMER,
  type ExtractedEntity,
  type ProposedAction,
  type VoiceIntent,
  type VoiceValidationIssue,
  type ConfidenceBand,
} from "@shared/voice-orchestration";

/** Concise, non-legalistic voice responses. Never convert stored data into legal conclusions. */
export function composeVoiceResponse(input: {
  intent: VoiceIntent;
  transcript: string;
  entities: ExtractedEntity[];
  issues: VoiceValidationIssue[];
  band: ConfidenceBand;
  proposedAction?: ProposedAction;
  rightsContext?: Record<string, unknown> | null;
  legalBoundaryTriggered?: boolean;
}): string {
  if (input.legalBoundaryTriggered || input.intent === "legal_question") {
    return `${LEGAL_VOICE_REFUSAL} ${PLATFORM_VOICE_DISCLAIMER}`;
  }

  const blocking = input.issues.filter((i) => i.severity === "blocking");
  if (blocking.length) {
    return blocking.map((b) => b.message).join(" ");
  }

  if (input.band === "conflict" || input.band === "low") {
    const hints = input.issues.map((i) => i.message).filter(Boolean);
    return (
      hints[0] ||
      "I’m not confident enough to act on that yet. Please clarify the parties, percentages, and whether you mean ownership or royalty points."
    );
  }

  if (input.intent === "retrieve_rights") {
    const ctx = input.rightsContext;
    if (!ctx || ctx.available === false) {
      return String(
        (ctx as any)?.reason ||
          "I couldn’t establish ownership from your stored records with enough confidence, so I won’t guess.",
      );
    }
    const ownership = (ctx.ownership as any[]) || [];
    if (!ownership.length) {
      return "I found the asset, but there is no current ownership record stored yet. That doesn’t mean there is no owner — only that SplitSheet has no ledger entry.";
    }
    const lines = ownership
      .slice(0, 6)
      .map((o) => `${o.name || o.userId}: ${o.ownershipPercentage}% (${o.role || o.ownershipType || "role n/a"})`)
      .join("; ");
    return `According to your stored Rights Ledger record, current entries are: ${lines}. This is stored data, not a legal ownership determination.`;
  }

  if (input.intent === "retrieve_agreement" || input.intent === "summarize") {
    const c = (input.rightsContext as any)?.contract;
    if (!c) {
      return "I couldn’t find an authorized agreement in context. Open a project or agreement first, or name it clearly.";
    }
    return `I found “${c.title}” (${c.type}, status ${c.status}). I can summarize stored fields or prepare a draft update — I won’t treat the record as a legal conclusion.`;
  }

  if (input.proposedAction?.requiresConfirmation) {
    const warnings = input.issues
      .filter((i) => i.severity === "warning" || i.severity === "info")
      .map((i) => i.message);
    const prefix = warnings.length ? `${warnings[0]} ` : "";
    return `${prefix}${input.proposedAction.summary} Say confirm to proceed with a draft-only action, or cancel to discard. ${PLATFORM_VOICE_DISCLAIMER}`;
  }

  if (input.intent === "identify_missing_fields") {
    return "I can check required template fields once an agreement type and draft are in context. Tell me which template you’re working on.";
  }

  if (input.intent === "search") {
    return "Tell me what you want to find — a song, agreement type, collaborator, or rights record — and I’ll search your authorized SplitSheet data.";
  }

  if (input.intent === "unknown") {
    return "I can help draft agreements, retrieve stored rights records, flag items for counsel, or clarify missing fields. What would you like to do?";
  }

  return `Understood. ${PLATFORM_VOICE_DISCLAIMER}`;
}
