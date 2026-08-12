import { eq } from "drizzle-orm";
import { db } from "./db";
import { contractTemplates } from "@shared/schema";
import { CATALOG_TEMPLATES, catalogToDbRow } from "@shared/agreement-catalog";

/**
 * Upsert the Entertainment Agreement Template Library by `type`.
 * - Inserts missing templates
 * - Refreshes metadata for existing rows
 * - Preserves legacy template JSON field layouts for the original 4 types
 *   when they already exist (so customized DBs are not clobbered)
 */
export async function seedContractTemplates() {
  try {
    console.log("Seeding entertainment agreement template library...");

    const existing = await db.select().from(contractTemplates);
    const byType = new Map(existing.map((t) => [t.type, t]));

    let inserted = 0;
    let updated = 0;

    for (const seed of CATALOG_TEMPLATES) {
      const row = catalogToDbRow(seed);
      const current = byType.get(seed.type);

      if (!current) {
        await db.insert(contractTemplates).values(row);
        inserted += 1;
        continue;
      }

      // Always refresh catalog metadata; keep legacy field JSON if already present
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
      `Contract templates seed complete: ${inserted} inserted, ${updated} updated, catalog size ${CATALOG_TEMPLATES.length}`,
    );
  } catch (error) {
    console.error("Error seeding contract templates:", error);
  }
}
