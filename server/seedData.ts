import { eq } from "drizzle-orm";
import { db } from "./db";
import { contractTemplates } from "@shared/schema";
import { CATALOG_TEMPLATES, catalogToDbRow } from "@shared/agreement-catalog";
import {
  isMvpTemplateType,
  mvpLegalReviewForType,
  mvpStatusForType,
  MVP_TEMPLATE_SPECS,
} from "@shared/agreement-mvp";

/**
 * Upsert the Entertainment Agreement Template Library by `type`.
 * MVP (12) templates are activated for production create; Phase 2+ remain draft.
 */
export async function seedContractTemplates() {
  try {
    console.log("Seeding entertainment agreement template library (MVP-gated)...");

    const existing = await db.select().from(contractTemplates);
    const byType = new Map(existing.map((t) => [t.type, t]));

    let inserted = 0;
    let updated = 0;

    for (const seed of CATALOG_TEMPLATES) {
      const row = catalogToDbRow(seed);
      // Enforce MVP activation policy (do not activate all 56)
      const status = mvpStatusForType(seed.type);
      row.status = status;
      row.isActive = status === "active";
      row.legalReviewStatus = mvpLegalReviewForType(seed.type);
      if (isMvpTemplateType(seed.type)) {
        const spec = MVP_TEMPLATE_SPECS.find((s) => s.type === seed.type);
        if (spec?.generationMode === "counsel_required") {
          row.workflowType = "counsel-required";
        } else if (spec?.generationMode === "controlled_workflow") {
          row.workflowType = "controlled-workflow";
        }
      }

      const current = byType.get(seed.type);

      if (!current) {
        await db.insert(contractTemplates).values(row);
        inserted += 1;
        continue;
      }

      const preserveLegacyJson = Boolean(seed.legacy && current.template);
      await db
        .update(contractTemplates)
        .set({
          name: row.name,
          slug: row.slug,
          description: row.description,
          category: row.category,
          subcategory: row.subcategory,
          industry: row.industry,
          agreementType: row.agreementType,
          version: row.version,
          status: row.status,
          jurisdiction: row.jurisdiction,
          legalReviewStatus: row.legalReviewStatus,
          rightsCategories: row.rightsCategories,
          requiredParties: row.requiredParties,
          optionalParties: row.optionalParties,
          riskLevel: row.riskLevel,
          workflowType: row.workflowType,
          supportedTransactions: row.supportedTransactions,
          isActive: row.isActive,
          template: preserveLegacyJson ? current.template : row.template,
          updatedAt: new Date(),
        })
        .where(eq(contractTemplates.id, current.id));
      updated += 1;
    }

    console.log(
      `Contract templates seed complete: ${inserted} inserted, ${updated} updated, catalog ${CATALOG_TEMPLATES.length}, MVP active ${MVP_TEMPLATE_SPECS.length}`,
    );
  } catch (error) {
    console.error("Error seeding contract templates:", error);
  }
}
