---
name: Identity Layer Tables
description: Schema, migration, and append-only rules for the 5 identity-layer tables added to SoundLedger
---

## Tables Added
- `creators` — songwriter/producer/artist/publisher with permanent `sl_creator_id` (SL-CREATOR-XXXXXXXX)
- `organizations` — labels/studios/publishers with permanent `sl_org_id` (SL-ORG-XXXXXXXX)
- `organization_members` — RBAC join table (roles: owner, admin, member, viewer)
- `api_keys` — per-org keys; only `key_hash` (SHA-256) stored; `key_prefix` shown in UI
- `ownership_events` — immutable append-only event log (NEVER UPDATE, only INSERT)

## Key Rules
- `ownership_events` must only be INSERTed, never updated. The `occurred_at` timestamp is the immutable record.
- `song_assets` has `sl_song_id` (SL-SONG-XXXXXXXX) assigned server-side via POST /api/assets/:id/assign-sl-id
- When creating an org, automatically add the creating user as `owner` in `organization_members`

**Why:** Permanent IDs are the foundation of the rights registry — they must never change or be reused.
