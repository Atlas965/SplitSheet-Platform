import { z } from "zod";

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const clientProfileSchema = z.object({
  name: z.string().trim().min(1, "Client name is required.").max(200),
  email: z.preprocess(emptyToUndef, z.string().trim().email("Enter a valid email.").max(320).optional()),
  phone: z.preprocess(emptyToUndef, z.string().trim().max(40).optional()),
  company: z.preprocess(emptyToUndef, z.string().trim().max(200).optional()),
  type: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
  role: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  defaultOwnershipPercentage: z.union([z.string(), z.number()]).optional(),
  defaultRoyaltyPercentage: z.union([z.string(), z.number()]).optional(),
  notes: z.preprocess(emptyToUndef, z.string().trim().max(4000).optional()),
});

export type ClientProfileInput = z.infer<typeof clientProfileSchema>;

export function parseOptionalPercent(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/%/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`${label} must be a number between 0 and 100.`);
  }
  return Math.round(n * 100) / 100;
}

export function clientDuplicateKey(email?: string | null, name?: string | null): string {
  const e = (email || "").trim().toLowerCase();
  if (e) return `email:${e}`;
  return `name:${(name || "").trim().toLowerCase()}`;
}

export function parseClientCsv(text: string): {
  rows: ClientProfileInput[];
  errors: { line: number; message: string }[];
} {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: { line: number; message: string }[] = [];
  const rows: ClientProfileInput[] = [];
  if (lines.length === 0) return { rows, errors: [{ line: 0, message: "CSV is empty." }] };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const nameI = idx(["name", "client", "full name"]);
  if (nameI < 0) {
    return { rows, errors: [{ line: 1, message: "CSV must include a name column." }] };
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const raw = {
      name: cols[nameI] ?? "",
      email: cols[idx(["email", "e-mail"])] ?? "",
      phone: cols[idx(["phone", "telephone"])] ?? "",
      company: cols[idx(["company", "label", "studio"])] ?? "",
      type: cols[idx(["type", "role"])] ?? "artist",
      role: cols[idx(["role"])] ?? undefined,
      defaultOwnershipPercentage: cols[idx(["defaultownershippercentage", "ownership", "ip", "default ip"])] ?? "",
      defaultRoyaltyPercentage: cols[idx(["defaultroyaltypercentage", "royalty"])] ?? "",
      notes: cols[idx(["notes", "note"])] ?? "",
    };
    const parsed = clientProfileSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ line: i + 1, message: parsed.error.issues[0]?.message ?? "Invalid row." });
      continue;
    }
    try {
      parseOptionalPercent(parsed.data.defaultOwnershipPercentage, "Default ownership");
      parseOptionalPercent(parsed.data.defaultRoyaltyPercentage, "Default royalty");
    } catch (err: any) {
      errors.push({ line: i + 1, message: err.message });
      continue;
    }
    rows.push(parsed.data);
  }
  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}
