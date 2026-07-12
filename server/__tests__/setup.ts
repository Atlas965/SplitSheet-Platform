/**
 * server/__tests__/setup.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Vitest global setup. Loads `.env` the same way the real server does
 * (server/loadEnv.ts) BEFORE any test file imports a module that touches
 * server/db.ts — that module throws at import time if DATABASE_URL is
 * missing, even though none of the unit tests below issue real queries.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import "../loadEnv";

// Provide safe fallbacks so importing modules with top-level side effects
// (e.g. `new Stripe(...)`, DB pool construction) never throws in CI/local
// runs that don't have real secrets configured — no network calls are made
// by the pure-function unit tests in this suite.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy_key_for_unit_tests";
