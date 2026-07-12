---
name: Identity Layer Tables
description: Schema, migration, and append-only rules for the identity-layer tables added to SoundLedger
---

## Tables Added
- `creators` — songwriter/producer/artist/publisher with permanent `sl_creator_id` (SL-CREATOR-XXXXXXXX). **Not yet implemented** — `client/src/pages/creators.tsx` / `creator-detail.tsx` still call an `/api/creators` backend that doesn't exist yet.
- `organizations` — labels/studios/publishers with permanent `sl_org_id` (SL-ORG-XXXXXXXX). **Implemented** in `shared/schema.ts`, `server/db-migrations.ts`, `server/storage.ts`, and `server/organization-routes.ts`; wired into `client/src/App.tsx` (`/organizations`, `/organizations/:id`) and the Dashboard "Core Functions" nav.
- `organization_members` — RBAC join table (roles: owner, admin, member, viewer). **Implemented** alongside `organizations`.
- `organization_api_keys` — per-org keys; only `key_hash` (SHA-256) stored; `key_prefix` shown in UI. **Implemented.** (Distinct from the pre-existing per-user `api_keys` table in `server/security.ts`, which is unaffected.)
- `ownership_events` — immutable append-only event log (NEVER UPDATE, only INSERT). **Not yet implemented** — the closest existing equivalent is the append-only `ownership_records` ledger in `shared/schema.ts`.

## Key Rules
- `ownership_events` must only be INSERTed, never updated. The `occurred_at` timestamp is the immutable record.
- `song_assets` has `sl_song_id` (SL-SONG-XXXXXXXX) assigned server-side via POST /api/assets/:id/assign-sl-id
- When creating an org, automatically add the creating user as `owner` in `organization_members` — implemented in `POST /api/organizations` (`server/organization-routes.ts`).
- Organization RBAC hierarchy is `owner > admin > member > viewer`; most write endpoints require `admin` or higher, role changes require `owner` (see `requireOrgRole()` in `server/organization-routes.ts`).

**Why:** Permanent IDs are the foundation of the rights registry — they must never change or be reused.
