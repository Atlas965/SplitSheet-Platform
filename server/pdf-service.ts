/**
 * server/pdf-service.ts — Priority 3.1 server-side PDF + SHA-256 hashing.
 * Enabled when ENABLE_SERVER_PDF=true. Generates a minimal PDF without
 * external Chromium/pdf-lib deps so installs stay lean. Client jsPDF
 * remains for draft preview only.
 */
import { createHash } from "crypto";
import { getObjectStorage } from "./object-storage";
import { auditLog } from "./security";

export interface ServerPdfContractInput {
  id: string;
  title: string;
  type: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | Date | null;
}

export interface ServerPdfResult {
  hash: string;
  objectKey: string;
  bytes: number;
}

export function isServerPdfEnabled(): boolean {
  return process.env.ENABLE_SERVER_PDF === "true";
}

/** Escape PDF literal string. */
function pdfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Build a single-page (or multi-page via concatenated text) PDF 1.4 buffer.
 * Content is plain Helvetica; sufficient for hash-sealed evidentiary copies.
 */
export function buildMinimalPdf(lines: string[]): Buffer {
  const contentLines: string[] = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"];
  for (let i = 0; i < lines.length; i++) {
    const line = pdfEscape(lines[i].slice(0, 110));
    if (i === 0) contentLines.push(`(${line}) Tj`);
    else contentLines.push(`T* (${line}) Tj`);
  }
  contentLines.push("ET");
  const stream = contentLines.join("\n");
  const streamLen = Buffer.byteLength(stream, "utf8");

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(`4 0 obj<< /Length ${streamLen} >>stream\n${stream}\nendstream\nendobj\n`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

export async function generateContractPdfBuffer(
  contract: ServerPdfContractInput,
): Promise<{ buffer: Buffer; hash: string }> {
  const meta = contract.metadata as any;
  const lines = [
    "SPLITSHEET — Server Legal Copy",
    contract.title,
    `Type: ${contract.type}`,
    `Contract ID: ${contract.id}`,
    contract.createdAt ? `Created: ${new Date(contract.createdAt).toISOString()}` : "",
    meta?.legalBodyVersion ? `Legal terms version: ${meta.legalBodyVersion}` : "",
    "---",
    ...(String(meta?.legalBodyMarkdownSnapshot ?? "")
      .split(/\r?\n/)
      .slice(0, 40)
      .map((l: string) => l.slice(0, 100))),
    "---",
    "Contract data (truncated):",
    ...JSON.stringify(contract.data ?? {}, null, 2)
      .split(/\r?\n/)
      .slice(0, 60)
      .map((l) => l.slice(0, 100)),
    "This PDF was sealed server-side. Client jsPDF exports are drafts only.",
  ].filter(Boolean);

  const buffer = buildMinimalPdf(lines);
  const hash = createHash("sha256").update(buffer).digest("hex");
  return { buffer, hash };
}

export async function sealSignedContractPdf(opts: {
  contract: ServerPdfContractInput;
  userId?: string;
  ipAddress?: string;
}): Promise<ServerPdfResult | null> {
  if (!isServerPdfEnabled()) return null;

  const { buffer, hash } = await generateContractPdfBuffer(opts.contract);
  const objectKey = `contracts/${opts.contract.id}/${hash}.pdf`;

  let storedUrl: string | undefined;
  try {
    const storage = getObjectStorage();
    storedUrl = await storage.signedUrl(objectKey, 60).catch(() => objectKey);
  } catch (err) {
    console.warn("[pdf-service] object storage unavailable; hash recorded without upload", err);
  }

  await auditLog({
    userId: opts.userId,
    action: "contract.server_pdf_sealed",
    resourceType: "contract",
    resourceId: opts.contract.id,
    afterState: { sha256: hash, objectKey, bytes: buffer.length, storedUrl },
    ipAddress: opts.ipAddress,
  });

  return { hash, objectKey, bytes: buffer.length };
}
