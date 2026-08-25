# Enterprise SSO / SCIM (Phases 9–10 — stubs only)

SplitSheet is **not** an identity provider. Enterprise customers should use **Auth0 Enterprise connections** (SAML/OIDC) when contracted.

## What exists in-repo

| Route | Status |
| --- | --- |
| `GET /api/enterprise/sso/status` | `501` stub (auth required) |
| `POST /api/enterprise/sso/acs` | `501` stub |
| `GET|POST /api/enterprise/scim/Users` | `501` stub |
| `GET /api/enterprise/scim/Groups` | `501` stub |

Code: `server/enterprise-stubs.ts`.

## Not implemented

- Hosted SAML ACS
- SCIM provisioning into `organization_members`
- Per-customer IdP metadata UI

When enterprise demand lands: configure Auth0 Enterprise, keep `AUTH_PROVIDER=auth0`, map groups → org roles in a dedicated phase — do not invent a parallel IdP inside SplitSheet.
