---
name: API Key Security Pattern
description: How API keys are generated, stored, and shown to users
---

## Pattern
1. Server generates `rawKey = sl_live_${crypto.randomBytes(24).toString("hex")}`
2. `keyHash = SHA-256(rawKey)` — stored in DB, used for lookups
3. `keyPrefix = sl_live_${rawKey.slice(8,16)}` — shown in UI for identification
4. Response to POST returns `{ ...key, keyHash: undefined, rawKey }` — rawKey shown ONCE only
5. All subsequent GET /api-keys responses omit `keyHash` and never expose rawKey

**Why:** Standard API key security pattern; hash in DB means even a DB breach can't expose keys.
