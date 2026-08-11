import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// On Vercel, prefer HTTP fetch for Pool.query to avoid fragile long-lived WS.
if (process.env.VERCEL === "1" || process.env.VERCEL === "true") {
  neonConfig.poolQueryViaFetch = true;
}

const databaseUrl =
  process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
