import { describe, expect, it } from "vitest";
import { classifyIntent } from "../voice/intent-engine";
import { extractEntities } from "../voice/entity-extraction";
import { validateVoiceExtraction } from "../voice/validation-engine";
import { composeVoiceResponse } from "../voice/response";
import { buildProposedAction } from "../voice/action-orchestrator";
import {
  LEGAL_VOICE_REFUSAL,
  requiresConfirmation,
  confidenceBand,
} from "../../shared/voice-orchestration";

describe("Voice intent engine", () => {
  it("classifies producer agreement draft requests", () => {
    const r = classifyIntent(
      "Create a producer agreement for the new track. The producer gets three points on the master.",
    );
    expect(r.intent).toBe("create_agreement_draft");
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it("routes legal questions to legal_question boundary", () => {
    const r = classifyIntent("Is this clause legally binding in Ontario?");
    expect(r.intent).toBe("legal_question");
  });

  it("classifies rights retrieval", () => {
    expect(classifyIntent("Who owns the master for this track?").intent).toBe("retrieve_rights");
  });
});

describe("Voice entity extraction", () => {
  it("separates master points from composition splits", () => {
    const entities = extractEntities(
      "Create a producer agreement. Producer gets three points on the master and we're splitting the composition 50/50.",
    );
    expect(entities.some((e) => e.type === "points" && e.value === 3)).toBe(true);
    expect(entities.some((e) => e.type === "ownership" && String(e.value).includes("50"))).toBe(true);
    expect(entities.some((e) => e.type === "agreement_type" && e.value === "producer")).toBe(true);
    expect(entities.some((e) => e.type === "right_type" && e.value === "master")).toBe(true);
    expect(entities.some((e) => e.type === "right_type" && e.value === "composition")).toBe(true);
  });

  it("flags ambiguous bare numbers", () => {
    const entities = extractEntities("The producer gets fifteen.");
    expect(entities.some((e) => e.type === "ambiguous_number" && e.value === 15)).toBe(true);
  });
});

describe("Voice validation + confirmation", () => {
  it("blocks ambiguous economic terms", () => {
    const entities = extractEntities("The producer gets fifteen.");
    const intent = classifyIntent("The producer gets fifteen.");
    const v = validateVoiceExtraction({
      intent: intent.intent,
      intentConfidence: intent.confidence,
      transcriptConfidence: 0.9,
      entities,
    });
    expect(v.conflict).toBe(true);
    expect(v.issues.some((i) => i.code === "ambiguous_number")).toBe(true);
  });

  it("requires confirmation for consequential create_agreement_draft", () => {
    expect(requiresConfirmation("create_agreement_draft", "high")).toBe(true);
    expect(requiresConfirmation("retrieve_rights", "high")).toBe(false);
    expect(confidenceBand(0.9)).toBe("high");
    expect(confidenceBand(0.5, true)).toBe("conflict");
  });

  it("never returns legal conclusions for legal questions", () => {
    const text = composeVoiceResponse({
      intent: "legal_question",
      transcript: "Is this enforceable?",
      entities: [],
      issues: [],
      band: "high",
      legalBoundaryTriggered: true,
    });
    expect(text).toContain(LEGAL_VOICE_REFUSAL);
    expect(text.toLowerCase()).not.toContain("you are legally protected");
  });

  it("proposes draft-only create actions with confirmation", () => {
    const transcript =
      "Create a producer agreement for the new track. The producer gets three points on the master and we're splitting the composition 50/50.";
    const entities = extractEntities(transcript);
    const action = buildProposedAction({
      intent: "create_agreement_draft",
      entities,
      transcript,
      confidence: 0.9,
    });
    expect(action?.actionType).toBe("create_agreement_draft");
    expect(action?.requiresConfirmation).toBe(true);
    expect(action?.payload.agreementType).toBe("producer");
  });
});
