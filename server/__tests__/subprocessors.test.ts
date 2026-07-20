import { describe, it, expect } from "vitest";

/**
 * Smoke test that the seeded sub-processor names match the Priority 1.3
 * contract (Stripe, OpenAI, Neon, Replit/GCS, Twilio pending). The actual
 * DB seed lives in runSubprocessorMigrations — this locks the expected set
 * so a rename doesn't silently drop a vendor from diligence disclosures.
 */
const REQUIRED_SUBPROCESSORS = [
  "Stripe",
  "OpenAI",
  "Neon",
  "Replit / Google Cloud Storage",
  "Twilio (pending)",
];

describe("subprocessors registry (Priority 1.3)", () => {
  it("requires the five launch-critical vendors to be named in seed data", async () => {
    // Read the migration source as text — avoids needing a live DB in unit tests.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const src = fs.readFileSync(path.join(root, "server/db-migrations.ts"), "utf8");

    for (const name of REQUIRED_SUBPROCESSORS) {
      expect(src).toContain(name);
    }
  });
});
