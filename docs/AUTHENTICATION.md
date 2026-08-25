# Authentication (as implemented)

SplitSheet operators authenticate with a **server session** (`splitsheet.sid` in Postgres). Contributors do **not** create accounts — they use confirmation links.

## Modes (`AUTH_PROVIDER`)

| Value | Behavior |
| --- | --- |
| `auth0` | Auth0 Universal Login (OIDC + PKCE). Google / password / MFA configured **in Auth0**. |
| `social` | Direct Google (etc.) OAuth against provider consoles. |
| `local` | Passwordless operator login — **dev / break-glass only** (`ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` on prod). |
| `replit` / unset legacy | Replit OIDC when neither Auth0 nor social credentials exist. |

Auto on Vercel when `AUTH_PROVIDER` is unset: **Auth0 credentials → auth0**, else social credentials → social. Passwordless local is **not** the default.

## Auth0 (Phase 2)

### Env (placeholders only)

```
AUTH_PROVIDER=auth0
APP_URL=https://splitsheet.ca
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_AUDIENCE=          # optional
AUTH0_BASE_URL=          # optional; defaults to APP_URL
REQUIRE_MFA_FOR_ORG_ADMINS=true   # optional Phase 8 enforcement
```

### Auth0 Dashboard (manual)

1. Application type: **Regular Web Application**
2. Callback: `https://splitsheet.ca/api/auth/auth0/callback` (+ localhost for dev)
3. Logout URLs: `https://splitsheet.ca` (+ localhost)
4. Web origins: `https://splitsheet.ca`
5. Enable connections: Google, Database, etc.
6. MFA: Auth0 Security → MFA (required when `REQUIRE_MFA_FOR_ORG_ADMINS=true`)

### Routes

| Route | Purpose |
| --- | --- |
| `GET /api/auth/providers` | Lists Auth0 (or social) buttons |
| `GET /api/auth/auth0` | Start Universal Login |
| `GET /api/auth/auth0/callback` | Code + PKCE exchange → session |
| `GET /api/logout` | Destroy session + Auth0 `/v2/logout` |
| `GET /api/auth/user` | Current operator (session) |

### Identity mapping

- Auth0 `sub` stored in `users.auth0_sub`
- Default user id: `auth0:{sub}`
- Session stores `amr` / `mfa` from ID token when present
- Optional verified-email link only when `ALLOW_EMAIL_ACCOUNT_LINKING=true`

## Contributor confirmations (Phase 6)

- Expiry enforced; public rate limit on `/api/confirm`
- Operator revoke: `POST /api/contracts/:id/confirmations/:confirmId/revoke`
- Confirm sets `consumed_at` + optional `consent_versions` (contributor_consent doc)
- Legacy `/api/confirmations/:token` remains `410 Gone`

## MFA (Phase 8)

Auth0 manages factors. With `REQUIRE_MFA_FOR_ORG_ADMINS=true`, privileged org mutations (members, API keys, org patch, role changes) require MFA evidence on the session (`amr` includes `mfa`).

## Enterprise SSO / SCIM (Phases 9–10)

Stubs only — see `docs/ENTERPRISE_SSO_SCIM.md`. Prefer Auth0 Enterprise connections.

## Audit (Phase 11)

`AUTH_*` events via `server/auth-events.ts` → `audit_log` (no secrets).

## Dual-run migration

1. Keep `AUTH_PROVIDER=social` + Google working in Production.
2. Create Auth0 app + set Auth0 env on **Preview** first.
3. Test login/logout/MFA on Preview.
4. Set Production `AUTH_PROVIDER=auth0` + Auth0 secrets; redeploy.
5. Keep Google social env until operators are confirmed migrated.

## Acceptance

Use `docs/ACCEPTANCE_CHECKLIST.md`. Do not claim production-certified without checklist evidence.
