import { describe, expect, it } from "vitest";
import {
  CATALOG_TEMPLATES,
  RIGHTS_TAXONOMY,
  PARTY_TYPES,
  TEMPLATE_CATEGORIES,
  catalogToDbRow,
  isCreatableStatus,
  isDraftableStatus,
  recommendAgreements,
  validateOwnershipPercents,
  validateTemplateFieldValues,
} from "../../shared/agreement-catalog";
import {
  MVP_TEMPLATE_SPECS,
  PHASE2_WAIT_TEMPLATES,
  HIGH_RISK_HOLD_TEMPLATES,
  mvpStatusForType,
} from "../../shared/agreement-mvp";

describe("Entertainment Agreement Template Catalog", () => {
  it("includes 56 unique templates", () => {
    expect(CATALOG_TEMPLATES).toHaveLength(56);
    const types = CATALOG_TEMPLATES.map((t) => t.type);
    expect(new Set(types).size).toBe(56);
  });

  it("covers the six active music categories", () => {
    const active = new Set(
      TEMPLATE_CATEGORIES.filter((c) => !(c as any).reserved).map((c) => c.id),
    );
    for (const t of CATALOG_TEMPLATES) {
      expect(active.has(t.category)).toBe(true);
    }
  });

  it("maps rights and parties from the shared taxonomies", () => {
    for (const t of CATALOG_TEMPLATES) {
      for (const r of t.rightsCategories) {
        expect(RIGHTS_TAXONOMY).toContain(r);
      }
      for (const p of t.requiredParties) {
        expect(PARTY_TYPES).toContain(p);
      }
    }
  });

  it("builds DB rows with field-engine JSON", () => {
    const row = catalogToDbRow(CATALOG_TEMPLATES[0]);
    expect(row.slug).toBeTruthy();
    expect(row.template.fieldEngine).toBe(true);
    expect(Array.isArray(row.template.fields)).toBe(true);
    expect(row.template.disclaimer).toMatch(/not a law firm/i);
  });
});

describe("MVP template gate", () => {
  it("activates exactly 12 MVP templates", () => {
    expect(MVP_TEMPLATE_SPECS).toHaveLength(12);
    for (const spec of MVP_TEMPLATE_SPECS) {
      expect(mvpStatusForType(spec.type)).toBe("active");
      expect(CATALOG_TEMPLATES.some((t) => t.type === spec.type)).toBe(true);
    }
  });

  it("keeps Phase 2 and high-risk hold templates out of active MVP status", () => {
    for (const t of PHASE2_WAIT_TEMPLATES) {
      if (!MVP_TEMPLATE_SPECS.some((m) => m.type === t.type)) {
        expect(mvpStatusForType(t.type)).toBe("draft");
      }
    }
    for (const t of HIGH_RISK_HOLD_TEMPLATES) {
      if (t.type === "work-for-hire-music") {
        expect(mvpStatusForType(t.type)).toBe("active");
      } else {
        expect(mvpStatusForType(t.type)).toBe("draft");
      }
    }
  });

  it("demotes legacy performance/management from MVP active set", () => {
    expect(mvpStatusForType("performance")).toBe("draft");
    expect(mvpStatusForType("management")).toBe("draft");
    expect(mvpStatusForType("split-sheet")).toBe("active");
    expect(mvpStatusForType("producer")).toBe("active");
  });
});

describe("Template validation", () => {
  it("requires ownership to total 100%", () => {
    expect(validateOwnershipPercents([{ percentage: 50 }, { percentage: 40 }]).ok).toBe(false);
    expect(validateOwnershipPercents([{ percentage: 60 }, { percentage: 40 }]).ok).toBe(true);
  });

  it("validates required fields and royalty ranges", () => {
    const fields = [
      { name: "title", label: "Title", type: "text" as const, required: true },
      { name: "royaltyPercentage", label: "Royalty %", type: "royalty" as const, required: true },
    ];
    expect(validateTemplateFieldValues(fields, {}).ok).toBe(false);
    expect(
      validateTemplateFieldValues(fields, { title: "Song", royaltyPercentage: 150 }).errors,
    ).toContain("Royalty % must be a percentage between 0 and 100");
    expect(
      validateTemplateFieldValues(fields, { title: "Song", royaltyPercentage: 15 }).ok,
    ).toBe(true);
  });

  it("treats active/approved as creatable and internal_review as draftable", () => {
    expect(isCreatableStatus("active")).toBe(true);
    expect(isCreatableStatus("internal_review")).toBe(false);
    expect(isDraftableStatus("internal_review")).toBe(true);
    expect(isDraftableStatus("archived")).toBe(false);
  });
});

describe("Recommendation engine", () => {
  it("recommends producer + split sheet for writer/producer projects", () => {
    const recs = recommendAgreements({
      roles: ["songwriter", "producer"],
      songwriterCount: 2,
      hasProducer: true,
      hasMaster: true,
      hasPublishing: true,
    });
    const types = recs.map((r) => r.template);
    expect(types).toContain("split-sheet");
    expect(types).toContain("producer");
    expect(types).toContain("master-ownership");
    expect(types).not.toContain("publishing-admin");
    expect(recs.find((r) => r.template === "producer")?.required).toBe(true);
  });

  it("recommends sync license for audiovisual use", () => {
    const recs = recommendAgreements({ hasSyncUse: true });
    expect(recs.some((r) => r.template === "sync-license")).toBe(true);
  });
});
