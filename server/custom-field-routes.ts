import type { Express, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireActivePermission } from "./rbac-middleware";
import type { OrgAuthedRequest } from "./rbac-middleware";
import { customFieldDefSchema, validateCustomFieldValue } from "@shared/feature-policy";
import { storage } from "./storage";
import { resourceBelongsToOrg, resolveRequestOrgId } from "./authz-helpers";
import { ensureProductionFeatureSchema } from "./feature-schema";
import { logger } from "./logger";

function mapField(r: Record<string, unknown>) {
  return {
    id: String(r.id),
    templateType: String(r.template_type ?? "split-sheet"),
    label: String(r.label ?? ""),
    fieldType: String(r.field_type ?? "text"),
    required: Boolean(r.required),
    placeholder: String(r.placeholder ?? ""),
    options: (r.options as string[]) ?? [],
    defaultValue: String(r.default_value ?? ""),
    displayOrder: Number(r.display_order ?? 0),
  };
}

export function registerCustomFieldRoutes(app: Express): void {
  app.get("/api/custom-fields", ...requireActivePermission("agreement.read"), async (req: OrgAuthedRequest, res: Response) => {
    await ensureProductionFeatureSchema();
    const userId = (req as any).user.claims.sub;
    const templateType = String(req.query.templateType ?? "split-sheet");
    const rows = await db.execute(sql`
      SELECT * FROM operator_custom_fields
      WHERE created_by = ${userId}
        AND template_type = ${templateType}
      ORDER BY display_order ASC, created_at ASC
    `);
    res.json((rows.rows as Record<string, unknown>[]).map(mapField));
  });

  app.post("/api/custom-fields", ...requireActivePermission("agreement.update"), async (req: OrgAuthedRequest, res: Response) => {
    const parsed = customFieldDefSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid field." });
      return;
    }
    if (parsed.data.fieldType === "select" && !parsed.data.options?.length) {
      res.status(400).json({ message: "Select fields need at least one option." });
      return;
    }
    await ensureProductionFeatureSchema();
    const userId = (req as any).user.claims.sub;
    const inserted = await db.execute(sql`
      INSERT INTO operator_custom_fields (
        organization_id, created_by, template_type, label, field_type, required,
        placeholder, options, default_value, display_order
      ) VALUES (
        ${req.orgAuth?.organizationId ?? null},
        ${userId},
        ${parsed.data.templateType || "split-sheet"},
        ${parsed.data.label},
        ${parsed.data.fieldType},
        ${parsed.data.required ?? false},
        ${parsed.data.placeholder ?? null},
        ${JSON.stringify(parsed.data.options ?? [])}::jsonb,
        ${parsed.data.defaultValue ?? null},
        ${parsed.data.displayOrder ?? 0}
      ) RETURNING *
    `);
    logger.info("custom_field.created", { userId, fieldId: (inserted.rows[0] as any)?.id });
    res.status(201).json(mapField(inserted.rows[0] as Record<string, unknown>));
  });

  app.put("/api/custom-fields/:id", ...requireActivePermission("agreement.update"), async (req: OrgAuthedRequest, res: Response) => {
    const parsed = customFieldDefSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid field." });
      return;
    }
    const userId = (req as any).user.claims.sub;
    const updated = await db.execute(sql`
      UPDATE operator_custom_fields SET
        label = ${parsed.data.label},
        field_type = ${parsed.data.fieldType},
        required = ${parsed.data.required ?? false},
        placeholder = ${parsed.data.placeholder ?? null},
        options = ${JSON.stringify(parsed.data.options ?? [])}::jsonb,
        default_value = ${parsed.data.defaultValue ?? null},
        display_order = ${parsed.data.displayOrder ?? 0},
        updated_at = now()
      WHERE id = ${req.params.id} AND created_by = ${userId}
      RETURNING *
    `);
    if (!updated.rows.length) {
      res.status(404).json({ message: "Field not found" });
      return;
    }
    res.json(mapField(updated.rows[0] as Record<string, unknown>));
  });

  app.delete("/api/custom-fields/:id", ...requireActivePermission("agreement.update"), async (req: OrgAuthedRequest, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const deleted = await db.execute(sql`
      DELETE FROM operator_custom_fields WHERE id = ${req.params.id} AND created_by = ${userId} RETURNING id
    `);
    if (!deleted.rows.length) {
      res.status(404).json({ message: "Field not found" });
      return;
    }
    res.json({ success: true });
  });

  app.put("/api/projects/:id/custom-fields", ...requireActivePermission("project.update"), async (req: OrgAuthedRequest, res: Response) => {
    const userId = (req as any).user.claims.sub;
    const contract = await storage.getContract(req.params.id);
    if (!contract) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    const orgId = req.orgAuth?.organizationId ?? (await resolveRequestOrgId(req));
    if (!resourceBelongsToOrg(contract, orgId, userId)) {
      res.status(403).json({ message: "Not authorized" });
      return;
    }
    const defs = await db.execute(sql`
      SELECT * FROM operator_custom_fields WHERE created_by = ${userId} AND template_type = ${contract.type}
      ORDER BY display_order ASC
    `);
    const fields = (defs.rows as Record<string, unknown>[]).map(mapField);
    const incoming = (req.body?.values ?? {}) as Record<string, unknown>;
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      const checked = validateCustomFieldValue(field, incoming[field.id]);
      if (!checked.ok) {
        res.status(400).json({ message: checked.message });
        return;
      }
      values[field.id] = checked.value;
    }
    const data = {
      ...(contract.data as Record<string, unknown>),
      customFieldValues: values,
      customFieldSnapshot: fields,
    };
    const updated = await storage.updateContract(contract.id, { data });
    res.json({
      values,
      fields: (updated.data as any)?.customFieldSnapshot ?? fields,
    });
  });
}
