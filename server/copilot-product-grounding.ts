/**
 * Copilot product grounding — translate catalog/product facts faithfully to users.
 * Never invent features, rights conclusions, or legal sufficiency claims.
 */
import {
  CATALOG_TEMPLATES,
  LEGAL_DISCLAIMER,
  type CatalogTemplateSeed,
} from "@shared/agreement-catalog";
import {
  MVP_TEMPLATE_SPECS,
  MVP_TEMPLATE_TYPES,
  mvpStatusForType,
  type MvpTemplateSpec,
} from "@shared/agreement-mvp";
import { findCatalogTemplateHint } from "./copilot-knowledge";

export type CopilotQueryKind =
  | "legal_advice"
  | "template_fact"
  | "ledger_or_ownership_data"
  | "pricing"
  | "workflow"
  | "general";

export const COPILOT_KNOWN_PAGES = [
  "/",
  "/clients",
  "/projects",
  "/contracts",
  "/templates",
  "/ownership",
  "/billing",
  "/analytics",
  "/admin",
] as const;

const BANNED_LEGAL_CLAIMS =
  /\b(legally\s+binding|attorney[- ]approved|enforceable\s+in\s+|you\s+are\s+legally\s+protected|this\s+protects\s+you\s+in\s+court|guarantees?\s+enforceability|valid\s+in\s+all\s+jurisdictions|i\s+am\s+a\s+lawyer)\b/i;

const LEDGER_DATA_ASK =
  /\b(who\s+owns|what\s+(?:is|are)\s+(?:my|our|the)\s+(?:split|ownership|points)|ownership\s+(?:of|for|on)\s+(?:this|my|the)|master\s+for\s+this|composition\s+for\s+this|my\s+song|project\s+[a-z0-9-]{4,})\b/i;

const LEGAL_ASK =
  /\b(legal\s+advice|lawyer|attorney|law\s+firm|should\s+i\s+sue|am\s+i\s+protected|is\s+this\b.+\b(?:legally\s+)?(?:valid|binding|enforceable)|does\s+this\s+(?:clause|provision)\s+(?:protect|hold\s+up))\b/i;

/** Human-readable product translation of a catalog + MVP record. */
export function buildProductFactCard(template: CatalogTemplateSeed): string {
  const mvp = MVP_TEMPLATE_SPECS.find((s) => s.type === template.type);
  const launchStatus = mvpStatusForType(template.type);
  const isMvp = MVP_TEMPLATE_TYPES.includes(template.type);

  const lines = [
    `PRODUCT FACT CARD (answer ONLY from these fields — do not invent):`,
    `• Name: ${template.name}`,
    `• Type slug: \`${template.type}\``,
    `• Category: ${template.category}`,
    `• Description: ${template.description}`,
    `• Required parties: ${template.requiredParties.join(", ") || "—"}`,
    `• Optional parties: ${template.optionalParties.join(", ") || "—"}`,
    `• Rights tags (product labels, not a legal ownership finding): ${template.rightsCategories.join(", ") || "—"}`,
    `• Risk level (workflow flag): ${template.riskLevel}`,
    `• Catalog status: ${template.status}`,
    `• Legal-review status (product field): ${template.legalReviewStatus}`,
    `• Launch activation: ${isMvp ? `active create path (${launchStatus})` : "not in the active create set — Phase 2 / draft"}`,
    `• Create path: /contract/${template.type} or Templates → ${template.name}`,
  ];

  if (mvp) {
    lines.push(
      `• Transaction (product intent): ${mvp.transaction}`,
      `• Generation mode: ${mvp.generationMode}`,
      `• Lawyer review before execution (product rule): ${mvp.lawyerReviewBeforeExecution ? "yes" : "recommended when unsure"}`,
      `• Jurisdiction review required (product rule): ${mvp.jurisdictionReviewRequired ? "yes" : "as needed"}`,
      `• Ownership fields tracked: ${mvp.ownershipInfo}`,
      `• Compensation fields tracked: ${mvp.compensationInfo}`,
    );
  }

  lines.push(
    `• Safe user phrasing: “In SplitSheet, this template is used to document …” — never “this legally means …”`,
    `• Required disclaimer: ${LEGAL_DISCLAIMER}`,
  );

  return lines.join("\n");
}

export function summarizeProductTemplate(query: string): string | null {
  const t = findCatalogTemplateHint(query);
  if (!t) return null;
  const mvp = MVP_TEMPLATE_SPECS.find((s) => s.type === t.type);
  const isMvp = MVP_TEMPLATE_TYPES.includes(t.type);

  return [
    `**${t.name}** (\`${t.type}\`) is a SplitSheet **workflow template** in the **${t.category}** category.`,
    "",
    t.description,
    "",
    `• Required parties: ${t.requiredParties.join(", ") || "—"}`,
    `• Rights tags (product labels): ${t.rightsCategories.join(", ") || "—"}`,
    `• Risk level: ${t.riskLevel} · Catalog status: ${t.status} · Legal-review field: ${t.legalReviewStatus}`,
    `• Active for normal create: ${isMvp ? "yes" : "no (browse/Phase 2)"}`,
    mvp
      ? `• Product intent: ${mvp.transaction}. Generation mode: ${mvp.generationMode}.`
      : null,
    "",
    `Open **Templates** or go to \`/contract/${t.type}\` to create a **documentation draft** — not a certified legal instrument.`,
    "",
    `_${LEGAL_DISCLAIMER}_`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function classifyCopilotQuery(message: string): CopilotQueryKind {
  const q = message.toLowerCase().trim();
  if (!q) return "general";
  if (LEGAL_ASK.test(q)) return "legal_advice";
  if (LEDGER_DATA_ASK.test(q)) return "ledger_or_ownership_data";
  if (/\b(pricing|plan|cost|how much|tier|subscription|billing)\b/.test(q)) return "pricing";

  const named = findCatalogTemplateHint(q);
  if (
    named &&
    /\b(template|agreement|license|what is|what's|explain|tell me|when do|when should|use|producer|split|sync|master|publishing)\b/.test(
      q,
    )
  ) {
    return "template_fact";
  }
  if (named && (q.includes(named.type) || q.includes(named.name.toLowerCase()))) {
    return "template_fact";
  }

  if (/\b(how do i|workflow|confirm|project|client|pdf|export|get started)\b/.test(q)) {
    return "workflow";
  }
  return "general";
}

export function legalAdviceRefusal(): string {
  return [
    "I can help you navigate SplitSheet’s **product workflows and stored documentation fields**, but I am **not** a lawyer and SplitSheet is **not** a law firm.",
    "",
    "I won’t say whether a provision is legally appropriate, enforceable, or sufficient for your transaction.",
    "I can point you to the relevant template fields and suggest preparing the record for qualified entertainment counsel.",
    "",
    `_${LEGAL_DISCLAIMER}_`,
  ].join("\n");
}

export function ledgerDataRedirect(): string {
  return [
    "I don’t have live access to your project or Rights Ledger records in this chat, so I won’t invent ownership, splits, or points.",
    "",
    "To see **stored product data** (not a legal ownership determination):",
    "• Open the project or contract in SplitSheet, or",
    "• Use the **Rights Ledger** (/ownership), or",
    "• Use Copilot Voice with confirmation — it reads authorized stored records only.",
    "",
    "Ask me about **templates, pricing, or workflow steps** and I’ll answer from SplitSheet’s product catalog.",
  ].join("\n");
}

/**
 * Prefer deterministic product answers for high-risk query kinds.
 * Returns null when the LLM may proceed with a grounded system augment.
 */
export function tryDeterministicProductAnswer(message: string): string | null {
  const kind = classifyCopilotQuery(message);
  if (kind === "legal_advice") return legalAdviceRefusal();
  if (kind === "ledger_or_ownership_data") return ledgerDataRedirect();
  if (kind === "template_fact") {
    return summarizeProductTemplate(message);
  }
  return null;
}

/** Per-request system augment with verified product facts only. */
export function buildGroundedSystemAugment(message: string): string {
  const kind = classifyCopilotQuery(message);
  const named = findCatalogTemplateHint(message);
  const parts: string[] = [
    "",
    "═══ PRODUCT FIDELITY RULES (this turn) ═══════════════════════════════════",
    `- Query kind: ${kind}`,
    `- Catalog size: ${CATALOG_TEMPLATES.length} templates; active create set: ${MVP_TEMPLATE_TYPES.length}`,
    "- Translate product fields literally. Do not upgrade workflow status into legal conclusions.",
    "- Rights tags / ownership % in the product are **stored documentation fields**, not court findings.",
    "- If a fact is not in PLATFORM KNOWLEDGE or a PRODUCT FACT CARD below, say you don’t know.",
    "- Never invent template names, pricing, or features.",
    "- Do not answer who owns a specific song/project from memory — redirect to Rights Ledger / project UI.",
  ];

  if (named) {
    parts.push("", buildProductFactCard(named));
  }

  if (kind === "legal_advice") {
    parts.push("", "This turn is a legal-advice request: refuse and quote the disclaimer; offer workflow help only.");
  }

  return parts.join("\n");
}

/** Strip/neutralize high-risk legal overclaims; append disclaimer when templates discussed. */
export function sanitizeCopilotResponse(
  text: string,
  opts?: { templateMentioned?: boolean },
): { text: string; flagged: boolean } {
  let out = text;
  let flagged = false;

  if (BANNED_LEGAL_CLAIMS.test(out)) {
    flagged = true;
    out = out.replace(BANNED_LEGAL_CLAIMS, "[product guidance only — not a legal determination]");
    if (!out.includes(LEGAL_DISCLAIMER.slice(0, 40))) {
      out = `${out.trim()}\n\n_${LEGAL_DISCLAIMER}_`;
    }
  }

  // Invented template names: unknown **Title** Agreement patterns are hard; check type backticks
  const slugMentions = [...out.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]);
  const knownTypes = new Set(CATALOG_TEMPLATES.map((t) => t.type));
  const invented = slugMentions.filter(
    (s) =>
      s.includes("-") &&
      !knownTypes.has(s) &&
      !["en-ca", "en-us", "cad", "usd"].includes(s) &&
      s.length > 3,
  );
  if (invented.length) {
    flagged = true;
    out = `${out.trim()}\n\n_Note: I can only confirm templates in SplitSheet’s catalog. Unrecognized type codes were ignored: ${invented.join(", ")}_`;
  }

  if (opts?.templateMentioned && !out.includes("not a law firm") && !out.includes(LEGAL_DISCLAIMER.slice(0, 32))) {
    out = `${out.trim()}\n\n_${LEGAL_DISCLAIMER}_`;
  }

  return { text: out, flagged };
}

export function listActiveTemplateNames(): string[] {
  return MVP_TEMPLATE_SPECS.map((s: MvpTemplateSpec) => s.name);
}
