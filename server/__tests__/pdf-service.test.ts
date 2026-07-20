import { describe, it, expect } from "vitest";
import { buildMinimalPdf, generateContractPdfBuffer } from "../pdf-service";
import { createHash } from "crypto";

describe("pdf-service (Priority 3.1)", () => {
  it("builds a PDF that starts with %PDF and ends with %%EOF", () => {
    const buf = buildMinimalPdf(["Hello", "World"]);
    const text = buf.toString("utf8");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.includes("%%EOF")).toBe(true);
  });

  it("hashes contract PDF deterministically for the same input", async () => {
    const input = {
      id: "c1",
      title: "Test Song",
      type: "split-sheet",
      data: { title: "Test Song" },
      metadata: { legalBodyVersion: "2026-01-01" },
      createdAt: "2026-01-01T00:00:00.000Z",
    };
    const a = await generateContractPdfBuffer(input);
    const b = await generateContractPdfBuffer(input);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toBe(createHash("sha256").update(a.buffer).digest("hex"));
  });
});
