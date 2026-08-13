import { describe, expect, it } from "vitest";
import {
  buildProductFactCard,
  classifyCopilotQuery,
  legalAdviceRefusal,
  ledgerDataRedirect,
  sanitizeCopilotResponse,
  summarizeProductTemplate,
  tryDeterministicProductAnswer,
} from "../copilot-product-grounding";
import { findCatalogTemplateHint } from "../copilot-knowledge";
import { LEGAL_DISCLAIMER } from "../../shared/agreement-catalog";

describe("Copilot product grounding", () => {
  it("classifies template, legal, and ledger queries", () => {
    expect(classifyCopilotQuery("What is a Producer Agreement?")).toBe("template_fact");
    expect(classifyCopilotQuery("Is this clause legally binding?")).toBe("legal_advice");
    expect(classifyCopilotQuery("Who owns the master for this track?")).toBe(
      "ledger_or_ownership_data",
    );
  });

  it("returns catalog-faithful template summaries with disclaimer", () => {
    const text = summarizeProductTemplate("producer agreement");
    expect(text).toBeTruthy();
    expect(text!).toContain("Producer");
    expect(text!).toContain("workflow template");
    expect(text!).toContain(LEGAL_DISCLAIMER);
    expect(text!.toLowerCase()).not.toContain("legally owns");
  });

  it("builds a fact card from catalog fields only", () => {
    const t = findCatalogTemplateHint("sync license");
    expect(t).toBeTruthy();
    const card = buildProductFactCard(t!);
    expect(card).toContain(t!.name);
    expect(card).toContain(t!.type);
    expect(card).toContain("PRODUCT FACT CARD");
    expect(card).toContain(LEGAL_DISCLAIMER);
  });

  it("answers high-risk queries deterministically", () => {
    expect(tryDeterministicProductAnswer("Is this enforceable?")!).toContain("not a law firm");
    expect(tryDeterministicProductAnswer("Who owns my song Midnight?")!).toContain(
      "won’t invent ownership",
    );
    const producer = tryDeterministicProductAnswer("Explain the Producer Agreement");
    expect(producer).toContain("workflow template");
  });

  it("sanitizes banned legal overclaims", () => {
    const { text, flagged } = sanitizeCopilotResponse(
      "This producer agreement is legally binding and attorney-approved.",
      { templateMentioned: true },
    );
    expect(flagged).toBe(true);
    expect(text.toLowerCase()).not.toMatch(/legally binding/);
    expect(text).toContain(LEGAL_DISCLAIMER.slice(0, 40));
  });

  it("exposes stable legal and ledger redirects", () => {
    expect(legalAdviceRefusal()).toMatch(/not.*a lawyer/i);
    expect(ledgerDataRedirect()).toContain("Rights Ledger");
  });
});
