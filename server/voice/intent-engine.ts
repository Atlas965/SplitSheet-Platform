/**
 * Intent classification for Copilot Voice — deterministic first-pass.
 * Provider/model can be swapped later without changing rights infrastructure.
 */
import type { VoiceIntent } from "@shared/voice-orchestration";

export type IntentResult = { intent: VoiceIntent; confidence: number; rationale: string };

export function classifyIntent(transcript: string): IntentResult {
  const q = transcript.toLowerCase().trim();

  if (!q) return { intent: "unknown", confidence: 0, rationale: "empty" };

  if (/\b(confirm|yes|do it|go ahead|approve)\b/.test(q) && q.length < 80) {
    return { intent: "confirm_action", confidence: 0.9, rationale: "affirmation" };
  }
  if (/\b(cancel|reject|no|don't|do not)\b/.test(q) && q.length < 80) {
    return { intent: "reject_action", confidence: 0.9, rationale: "negation" };
  }

  if (
    /\b(legal advice|should i sue|lawyer|attorney)\b/.test(q) ||
    /\bis this\b.+\b(legally\s+)?(valid|binding|enforceable)\b/.test(q) ||
    /\b(does this (clause|provision) (protect|hold up))\b/.test(q)
  ) {
    return { intent: "legal_question", confidence: 0.95, rationale: "legal_advice_boundary" };
  }

  if (/\b(who owns|ownership of|rights (to|for)|master for|composition for)\b/.test(q)) {
    return { intent: "retrieve_rights", confidence: 0.88, rationale: "rights_query" };
  }

  if (/\b(show|find|get|retrieve|open)\b.*\b(agreement|contract|split)\b/.test(q)) {
    return { intent: "retrieve_agreement", confidence: 0.82, rationale: "agreement_retrieve" };
  }

  if (/\b(summarize|summary|what does)\b.*\b(agreement|contract|deal)\b/.test(q)) {
    return { intent: "summarize", confidence: 0.8, rationale: "summarize" };
  }

  if (/\b(missing|incomplete|what's left|what is left)\b/.test(q)) {
    return { intent: "identify_missing_fields", confidence: 0.78, rationale: "missing_fields" };
  }

  if (/\b(conflict|mismatch|inconsist|disagree)\b/.test(q)) {
    return { intent: "identify_conflicts", confidence: 0.8, rationale: "conflicts" };
  }

  if (/\b(flag|send|prepare).*(counsel|lawyer|review)\b/.test(q) || /\b(legal review)\b/.test(q)) {
    return { intent: "flag_for_review", confidence: 0.85, rationale: "review_flag" };
  }

  if (/\b(prepare|package).*(counsel|lawyer)\b/.test(q)) {
    return { intent: "prepare_for_counsel", confidence: 0.84, rationale: "counsel_prep" };
  }

  if (
    /\b(create|start|draft|new)\b.*\b(producer|split|feature|sync|master|agreement|contract|license)\b/.test(q) ||
    /\b(producer agreement|split sheet|sync license)\b/.test(q)
  ) {
    return { intent: "create_agreement_draft", confidence: 0.86, rationale: "draft_create" };
  }

  if (/\b(update|change|set|modify)\b.*\b(royalty|points|ownership|split|fee|term|territory)\b/.test(q)) {
    return { intent: "update_agreement_fields", confidence: 0.84, rationale: "field_update" };
  }

  if (/\b(register|create).*(rights|ownership|ledger)\b/.test(q)) {
    return { intent: "create_rights_record", confidence: 0.8, rationale: "rights_create" };
  }

  if (/\b(search|look up|find)\b/.test(q)) {
    return { intent: "search", confidence: 0.7, rationale: "search" };
  }

  if (/\b(mean|clarify|what did you|which)\b/.test(q)) {
    return { intent: "clarify", confidence: 0.65, rationale: "clarify" };
  }

  return { intent: "unknown", confidence: 0.4, rationale: "fallback" };
}
