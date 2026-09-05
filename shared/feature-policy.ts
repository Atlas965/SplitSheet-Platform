import { z } from "zod";

export const REMINDER_STAGES = [
  { stage: "day_3", afterMs: 3 * 24 * 60 * 60 * 1000 },
  { stage: "day_7", afterMs: 7 * 24 * 60 * 60 * 1000 },
  { stage: "day_14", afterMs: 14 * 24 * 60 * 60 * 1000 },
] as const;

export type ReminderStage = (typeof REMINDER_STAGES)[number]["stage"];

/** Age is measured from the actual first send, never from token expiry. */
export function dueReminderStage(
  sentAt: Date | string,
  alreadySent: Iterable<string>,
  now = Date.now(),
): ReminderStage | null {
  const sentMs = new Date(sentAt).getTime();
  if (!Number.isFinite(sentMs)) return null;
  const age = now - sentMs;
  const sent = new Set(alreadySent);
  let due: ReminderStage | null = null;
  for (const row of REMINDER_STAGES) {
    if (age >= row.afterMs && !sent.has(row.stage)) due = row.stage;
  }
  return due;
}

export const CUSTOM_FIELD_TYPES = ["text", "textarea", "number", "date", "select", "checkbox"] as const;

export const customFieldDefSchema = z.object({
  label: z.string().trim().min(1).max(120),
  fieldType: z.enum(CUSTOM_FIELD_TYPES),
  required: z.boolean().optional(),
  placeholder: z.string().trim().max(200).optional(),
  options: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  defaultValue: z.string().max(2000).optional(),
  displayOrder: z.number().int().min(0).max(500).optional(),
  templateType: z.string().trim().max(80).optional(),
});

export function validateCustomFieldValue(
  field: { fieldType: string; required?: boolean; options?: string[] | null; label: string },
  raw: unknown,
): { ok: true; value: string | boolean | number | null } | { ok: false; message: string } {
  const empty = raw === undefined || raw === null || raw === "";
  if (empty) {
    if (field.required) return { ok: false, message: `${field.label} is required.` };
    return { ok: true, value: null };
  }
  switch (field.fieldType) {
    case "checkbox":
      return { ok: true, value: raw === true || raw === "true" || raw === "on" };
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n)) return { ok: false, message: `${field.label} must be a number.` };
      return { ok: true, value: n };
    }
    case "date": {
      const s = String(raw);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false, message: `${field.label} must be a date.` };
      return { ok: true, value: s };
    }
    case "select": {
      const s = String(raw);
      if (field.options?.length && !field.options.includes(s)) {
        return { ok: false, message: `${field.label} is not a valid option.` };
      }
      return { ok: true, value: s };
    }
    default:
      return { ok: true, value: String(raw).slice(0, 4000) };
  }
}

export const MINUTES_SAVED_PER_CONFIRMED_PROJECT = 25;

export function estimatedMinutesSaved(confirmedProjects: number): number {
  return Math.max(0, confirmedProjects) * MINUTES_SAVED_PER_CONFIRMED_PROJECT;
}

export function previousPeriodDelta(current: number, previous: number): {
  current: number;
  previous: number;
  delta: number;
  label: string;
} {
  const delta = current - previous;
  return {
    current,
    previous,
    delta,
    label: previous === 0 && current === 0
      ? "Compared with your previous period"
      : `${delta >= 0 ? "+" : ""}${delta} vs previous period`,
  };
}

export function parseApiPage(query: Record<string, unknown>): { limit: number; offset: number } {
  const limit = Math.min(100, Math.max(1, Number(query.limit ?? 25) || 25));
  const offset = Math.max(0, Number(query.offset ?? 0) || 0);
  return { limit, offset };
}

export function mostCommonSplit(percentages: number[]): { label: string; count: number } | null {
  if (!percentages.length) return null;
  const counts = new Map<string, number>();
  for (const n of percentages) {
    const key = (Math.round(n * 100) / 100).toFixed(2);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  counts.forEach((count, key) => {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  });
  return { label: `${best}%`, count: bestCount };
}

export function titlesLookSimilar(a: string, b: string): boolean {
  const na = a.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const nb = b.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

/** Personal workspaces stay private until an operator sets a public slug. */
export function isPublishedStudio(input: {
  publicSlug?: string | null;
  verificationStatus?: string | null;
}): boolean {
  return Boolean(input.publicSlug && String(input.publicSlug).trim());
}

/** Auto-created tenant shells from ensurePersonalOrganization. */
export function isPersonalWorkspaceOrg(input: { name?: string | null; type?: string | null }): boolean {
  return Boolean(
    input.type === "studio" &&
    typeof input.name === "string" &&
    input.name.trim().toLowerCase().endsWith(" workspace"),
  );
}

export function generateReferralCode(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6) || "STUDIO";
  const suffix = Math.abs(hashString(seed)).toString(36).toUpperCase().slice(0, 4);
  return `${clean}${suffix}`;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}
