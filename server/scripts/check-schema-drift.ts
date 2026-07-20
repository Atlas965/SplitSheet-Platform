/**
 * server/scripts/check-schema-drift.ts — Priority 4.2 heuristic drift check.
 * Fails if shared/schema.ts declares a pgTable whose SQL name is not
 * mentioned in server/db-migrations.ts (covers boot-time migrations).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schemaSrc = fs.readFileSync(path.join(root, "shared/schema.ts"), "utf8");
const migSrc = fs.readFileSync(path.join(root, "server/db-migrations.ts"), "utf8");

const tableNames = new Set<string>();
const re = /pgTable\(\s*["']([a-z0-9_]+)["']/g;
let m: RegExpExecArray | null;
while ((m = re.exec(schemaSrc))) {
  tableNames.add(m[1]);
}

const missing: string[] = [];
for (const name of tableNames) {
  // sessions / users are core — may be created outside db-migrations
  if (["sessions"].includes(name)) continue;
  if (!migSrc.includes(name) && !migSrc.includes(name.replace(/_/g, "_"))) {
    // Also accept camelCase references are only in schema — require snake in migrations OR schema comment
    if (!migSrc.includes(`CREATE TABLE IF NOT EXISTS ${name}`) && !migSrc.includes(name)) {
      // Soft: only fail if neither CREATE nor column alter mentions the table
      if (!new RegExp(name).test(migSrc)) missing.push(name);
    }
  }
}

// Known tables managed solely by drizzle push / older deploys — allowlist
const allow = new Set([
  "users",
  "sessions",
  "contracts",
  "contract_templates",
  "contract_collaborators",
  "contract_signatures",
  "user_activity",
  "profile_views",
  "negotiations",
  "negotiation_conversations",
  "user_matches",
  "messages",
  "notifications",
  "confirmations",
  "song_assets",
  "ownership_records",
  "revenue_events",
  "payout_records",
  "user_balances",
  "organizations",
  "organization_members",
  "organization_api_keys",
  "api_keys",
  "rights_organizations",
  "creators",
  "creator_rights_profiles",
  "composition_assets",
  "master_assets",
  "license_readiness",
  "payment_events",
]);

const realMissing = [...missing].filter((t) => !allow.has(t));

// Require legal/subprocessor/copilot tables (recent) to appear in migrations
const requiredInMigrations = ["legal_documents", "legal_acceptances", "subprocessors", "copilot_usage"];
for (const t of requiredInMigrations) {
  if (!migSrc.includes(t)) realMissing.push(t);
}

if (realMissing.length) {
  console.error("db:check schema drift — tables missing from db-migrations.ts:");
  for (const t of realMissing) console.error(`  - ${t}`);
  process.exit(1);
}

console.log(`db:check OK (${tableNames.size} pgTable declarations scanned)`);
