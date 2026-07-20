---
name: Identity Layer Tables
description: Schema, migration, and append-only rules for the identity-layer tables added to SoundLedger
---

## Tables Added
- `creators` — songwriter/producer/artist/publisher with permanent `sl_creator_id` (SL-CREATOR-XXXXXXXX). **Implemented** in `shared/schema.ts`, `server/db-migrations.ts`, `server/storage.ts`, and `server/creator-routes.ts`; wired into `client/src/App.tsx` (`/creators`, `/creators/:id`) and the Dashboard "Core Functions" nav. `client/src/pages/creators.tsx` / `creator-detail.tsx` now call a fully working `/api/creators` backend.
- `organizations` — labels/studios/publishers with permanent `sl_org_id` (SL-ORG-XXXXXXXX). **Implemented** in `shared/schema.ts`, `server/db-migrations.ts`, `server/storage.ts`, and `server/organization-routes.ts`; wired into `client/src/App.tsx` (`/organizations`, `/organizations/:id`) and the Dashboard "Core Functions" nav.
- `organization_members` — RBAC join table (roles: owner, admin, member, viewer). **Implemented** alongside `organizations`.
- `organization_api_keys` — per-org keys; only `key_hash` (SHA-256) stored; `key_prefix` shown in UI. **Implemented.** (Distinct from the pre-existing per-user `api_keys` table in `server/security.ts`, which is unaffected.)
- `ownership_events` — originally scoped as a separate immutable append-only event log. **Resolved without a new table** — see "Architecture decisions" below.

## Global Rights Framework (added in the Slice 1 rights-infrastructure upgrade)
- `rights_organizations` — small seeded reference table of PROs/CMOs/MROs (SOCAN, ASCAP, BMI, PRS, etc.), keyed by territory. Read-only from `GET /api/rights-organizations`. Seeded idempotently in `server/db-migrations.ts`.
- `creator_rights_profiles` — one row per platform **user** (not the `creators` roster) capturing IPI number, PRO affiliation, territory, and songwriter/publisher status. Powers Settings → Rights Profile (`client/src/pages/profile.tsx`) via `GET/PUT /api/rights-profile` (`server/rights-routes.ts`).
- `composition_assets` / `master_assets` — 1:1 with `song_assets`, splitting composition (songwriting/publishing) rights from master (recording) rights per Feature 2. Managed via `GET/PUT /api/assets/:id/composition` and `/master` (`server/rights-ledger-routes.ts`), surfaced in the Rights Ledger (`client/src/pages/ownership.tsx`).
- `license_readiness` — 1:1 with `song_assets`; stores the 0-100 License Score plus the checklist booleans and manual sample-clearance status. Scoring logic lives in `server/license-readiness.ts` (`recalculateLicenseReadiness()`), exposed via `GET /api/assets/:id/license-readiness` and `POST /api/assets/:id/license-readiness/recalculate`. Recalculated automatically after any ownership, composition, or master mutation.
- `ownership_records` gained three nullable columns: `ownership_type` (default `'composition'`), `territory`, `expiration_date` — backward compatible, existing rows unaffected.
- `song_assets` gained `sl_song_id` (SL-SONG-XXXXXXXX), assigned via `POST /api/assets/:id/assign-sl-id`, mirroring the org/creator permanent-ID pattern.
- `TERRITORIES` (`CA/US/UK/EU/AU/OTHER`) and `OWNERSHIP_RIGHT_TYPES` (`composition/master/publishing/neighboring_rights/mechanical_rights/performance_rights`) are TypeScript const arrays in `shared/schema.ts`, not DB tables — same pattern as `ORGANIZATION_TYPES`.

## Architecture decisions
- **`ownership_events` was NOT built as a separate table.** `ownership_records` (in `shared/schema.ts`) is already an append-only, versioned ledger, and the generic `audit_log` table (`server/security.ts` `auditLog()`) already records who/when/before/after for every mutation. Building a third table would have duplicated both with no functional gain.
- **`rights_change_history` (global rights framework, Feature 8) also reuses `audit_log` instead of a new table.** Every ownership/composition/master mutation now calls `auditLog()` with `resourceType` set to `ownership_record` / `composition_asset` / `master_asset` / `song_asset`. `storage.getRightsChangeHistory(songAssetId, relatedIds)` in `server/storage.ts` queries `audit_log` directly (raw SQL, since `audit_log` itself is not a Drizzle-modeled table) and is exposed via `GET /api/assets/:id/rights-history` (`server/rights-ledger-routes.ts`).

## Key Rules
- `ownership_records` and `audit_log` are append-only / insert-only for history purposes — never UPDATE a historical row, only INSERT new versions/entries.
- `song_assets` has `sl_song_id` (SL-SONG-XXXXXXXX) assigned server-side via `POST /api/assets/:id/assign-sl-id`.
- `creators` has `sl_creator_id` (SL-CREATOR-XXXXXXXX) assigned server-side at creation via `generateUniqueSlCreatorId()` in `server/creator-routes.ts`.
- When creating an org, automatically add the creating user as `owner` in `organization_members` — implemented in `POST /api/organizations` (`server/organization-routes.ts`).
- Organization RBAC hierarchy is `owner > admin > member > viewer`; most write endpoints require `admin` or higher, role changes require `owner` (see `requireOrgRole()` in `server/organization-routes.ts`).
- `creators` (the roster) is scoped by `created_by` — one user's roster of songwriters/producers/artists/publishers they manage is private to them, unlike `creator_rights_profiles` which is the user's own single profile.

**Why:** Permanent IDs are the foundation of the rights registry — they must never change or be reused.
