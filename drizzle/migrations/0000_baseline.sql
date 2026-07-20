-- Priority 4.1 baseline note
-- Historical schema evolution lived in server/db-migrations.ts (idempotent
-- CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS on boot).
-- This file marks the start of numbered drizzle-kit migrations.
--
-- Do NOT drop or recreate production tables from here.
-- New incremental changes should be added as 0001_*.sql via `npm run db:generate`
-- after editing shared/schema.ts.
--
-- Boot behavior:
--   - Always runs server/db-migrations.ts (legacy idempotent path)
--   - Additionally runs `drizzle-kit migrate` when AUTO_MIGRATE=true

SELECT 1;
