/**
 * server/copilot-safety.ts — Priority 6.2 classifier + 6.3 redaction.
 */
import { auditLog } from "./security";

const LEGAL_ADVICE_PATTERNS = [
  /\blegal advice\b/i,
  /\battorney\b/i,
  /\blawyer\b/i,
  /\bis (this|it) (legally )?(binding|enforceable)\b/i,
  /\b(sue|lawsuit|litigation)\b/i,
  /\bgoverning law\b/i,
  /\b(ontario|california|new york) (law|statute)\b/i,
  /\bcan i (force|compel)\b/i,
  /\bwhat are my (legal )?rights\b/i,
];

export type CopilotClassification = "general" | "seeking_legal_advice";

export function classifyCopilotQuestion(text: string): CopilotClassification {
  for (const p of LEGAL_ADVICE_PATTERNS) {
    if (p.test(text)) return "seeking_legal_advice";
  }
  return "general";
}

export const LEGAL_ADVICE_SYSTEM_SUFFIX = `

CRITICAL LEGAL-SAFETY MODE:
The user appears to be seeking legal advice. You MUST:
1. Start with: "I'm not a lawyer and SplitSheet cannot provide legal advice."
2. Refuse jurisdiction-specific legal conclusions.
3. Recommend consulting a qualified entertainment / music-rights lawyer (e.g. counsel in Ontario, Canada for SoundLedger users).
4. You may explain how SplitSheet's workflow/features work, but not how the law applies to their facts.
`;

/** Strip PII / secrets before persisting CoPilot logs (Priority 6.3). */
export function redactCopilotText(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
    .replace(/\b\d{9}\b/g, "[IPI]")
    .replace(/\b(cus|acct|pi|tr|price|prod)_[A-Za-z0-9]+\b/g, "[STRIPE_ID]");
}

export async function logCopilotClassification(
  userId: string,
  category: CopilotClassification,
): Promise<void> {
  try {
    await auditLog({
      userId,
      action: "copilot.classification",
      resourceType: "copilot",
      resourceId: userId,
      afterState: { category, at: new Date().toISOString() },
    });
  } catch {
    // non-fatal
  }
}
