---
name: SL ID Generation
description: How permanent SoundLedger IDs are generated and assigned
---

## Format
- `SL-CREATOR-{8_UPPERCASE_CHARS}` — generated at POST /api/creators
- `SL-ORG-{8_UPPERCASE_CHARS}` — generated at POST /api/organizations
- `SL-SONG-{8_UPPERCASE_CHARS}` — assigned via POST /api/assets/:id/assign-sl-id

## Generation
```js
const shortId = Math.random().toString(36).slice(2, 10).toUpperCase();
const slId = `SL-CREATOR-${shortId}`;
```

## Rules
- Always generated server-side, never in the frontend
- Stored as UNIQUE columns with NOT NULL constraint
- Never reassigned or reused — permanent for the lifetime of the record

**Why:** These IDs are the permanent external identity for rights registry records; they must be stable and unique.
