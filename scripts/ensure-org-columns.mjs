import fs from "fs";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (!m) continue;
  if (process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}

const url = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!url) {
  console.error("no db url");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const statements = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS active_organization_id varchar`,
  `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS organization_id varchar`,
  `ALTER TABLE song_assets ADD COLUMN IF NOT EXISTS organization_id varchar`,
  `ALTER TABLE split_confirmations ADD COLUMN IF NOT EXISTS revoked_at timestamp`,
  `ALTER TABLE split_confirmations ADD COLUMN IF NOT EXISTS consumed_at timestamp`,
  `ALTER TABLE split_confirmations ADD COLUMN IF NOT EXISTS consent_versions jsonb`,
  `ALTER TABLE legal_acceptances ADD COLUMN IF NOT EXISTS organization_id varchar`,
  `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id varchar`,
];

for (const sql of statements) {
  await client.query(sql);
  console.log("ok:", sql.slice(0, 70));
}

const r = await client.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='active_organization_id'`,
);
console.log("active_organization_id present:", r.rows.length > 0);
await client.end();
