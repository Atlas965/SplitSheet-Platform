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
```

### Auth0 Dashboard (manual)

1. Application type: **Regular Web Application**
2. Callback: `https://splitsheet.ca/api/auth/auth0/callback` (+ localhost for dev)
3. Logout URLs: `https://splitsheet.ca` (+ localhost)
4. Web origins: `https://splitsheet.ca`
5. Enable connections: Google, Database, etc.
6. MFA: Auth0 Security → MFA (enforce for admins when ready)

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
- Optional verified-email link to an **existing** SplitSheet user only when `ALLOW_EMAIL_ACCOUNT_LINKING=true`

### Not implemented yet

- Full org RBAC on every resource (Phase 3–5)
- Forced MFA policies in-app (use Auth0 MFA)
- Enterprise SSO / SCIM (documented later)
- Claiming “production certified” without your Auth0 + Vercel verification

## Dual-run migration

1. Keep `AUTH_PROVIDER=social` + Google working in Production.
2. Create Auth0 app + set Auth0 env on **Preview** first.
3. Test login/logout/MFA on Preview.
4. Set Production `AUTH_PROVIDER=auth0` + Auth0 secrets; redeploy.
5. Keep Google social env until operators are confirmed migrated; then remove direct Google if desired.
