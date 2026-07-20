/**
 * server/scripts/check-marketing-claims.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Priority 1.4 — Marketing-claim guardrail.
 *
 * Fails CI if banned legal-adjacent marketing strings appear in
 * client/src/pages/landing.tsx or client/src/marketing/** without a companion
 * `data-legal-approved="<version>"` attribute on the same element/line.
 *
 * Banned phrases (case-insensitive):
 *   - "legally binding"
 *   - "ESIGN compliant" / "e-sign compliant"
 *   - "fully compliant"
 *   - "guaranteed"
 *
 * Usage: npx tsx server/scripts/check-marketing-claims.ts
 * Wired into CI via `npm run lint:marketing-claims`.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const BANNED = [
  /legally\s+binding/i,
  /e-?sign\s+compliant/i,
  /fully\s+compliant/i,
  /\bguaranteed\b/i,
];

const APPROVAL_ATTR = /data-legal-approved\s*=\s*["'][^"']+["']/;

function collectFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(tsx?|jsx?|mdx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
}

function scanFile(filePath: string): string[] {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const violations: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of BANNED) {
      if (!pattern.test(line)) continue;
      // Allow if this line (or a 3-line window around it for multi-line JSX)
      // carries a data-legal-approved attribute.
      const window = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join("\n");
      if (APPROVAL_ATTR.test(window)) continue;
      violations.push(`${rel}:${i + 1}: banned claim matched /${pattern.source}/ — add data-legal-approved="<version>" or rephrase`);
    }
  }
  return violations;
}

function main(): void {
  const targets: string[] = [];
  const landing = path.join(ROOT, "client/src/pages/landing.tsx");
  if (fs.existsSync(landing)) targets.push(landing);
  collectFiles(path.join(ROOT, "client/src/marketing"), targets);

  const allViolations = targets.flatMap(scanFile);

  if (allViolations.length === 0) {
    console.log(`check-marketing-claims: OK (${targets.length} file(s) scanned)`);
    process.exit(0);
  }

  console.error("check-marketing-claims: FAILED\n");
  for (const v of allViolations) console.error(`  ${v}`);
  console.error(
    `\n${allViolations.length} violation(s). Either rephrase, or mark counsel-approved copy with data-legal-approved="<version>".`
  );
  process.exit(1);
}

main();
