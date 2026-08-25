# Authorization & tenancy (Phases 3–4 — as implemented)

SplitSheet is B2B/RaaS. Operators act **inside an organization (tenant)**. Contributors stay accountless.

## What exists

| Concept | Implementation |
| --- | --- |
| Organization | `organizations` (+ `sl_org_id`) |
| Membership | `organization_members.role` |
| Roles | `owner`, `admin`, `operator`, `reviewer`, `finance`, `viewer` (`shared/org-rbac.ts`) |
| Legacy role | `member` → normalized to `operator` |
| Permissions | Code catalog in `shared/org-rbac.ts` (not a DB table yet) |
| Active tenant | `users.active_organization_id` |
| Resource tenancy | `contracts.organization_id`, `song_assets.organization_id` |
| Personal workspace | Auto-created on first org resolve / login (`ensurePersonalOrganization`) |
| RBAC middleware | `server/rbac-middleware.ts` |

## Roles (minimum)

| Role | Intent |
| --- | --- |
| OWNER | Full org + billing + members |
| ADMIN | Members + projects/agreements/rights |
| OPERATOR | Day-to-day projects, agreements, confirmations |
| REVIEWER | Read/review projects & agreements |
| FINANCE | Billing-oriented read + billing manage |
| VIEWER | Read-only |

Exact permission lists: `permissionsForRole()` in `shared/org-rbac.ts`.

## Phase 4 middleware

| Export | Purpose |
| --- | --- |
| `requireAuth` | Session required (alias of `isAuthenticated`) |
| `requireOrganizationMembership` | Membership for `:id` or active org → `req.orgAuth` |
| `requireRole(min)` | Role rank gate after membership |
| `requirePermission(...perms)` | Permission gate after membership |
| `requireActivePermission(...perms)` | Auth + active org + permission(s) |
| `requireActiveOrg()` | Auth + active org (no specific permission) |

Wired onto: org member/API-key routes, contracts/assets (create/read/update/delete), projects/clients, confirmation send, Stripe Connect/refund (billing), payment flow (active org).

## APIs

| Route | Purpose |
| --- | --- |
| `GET /api/organizations` | Memberships (ensures personal org) |
| `GET /api/me/organization` | Active org + permissions |
| `POST /api/me/organization` | `{ organizationId }` switch active tenant |
| `GET /api/auth/user` | Includes `activeOrganization` |

New contracts/assets are stamped with the active `organizationId`.

## Not done yet (later phases)

- Strict org-scoped IDOR on all reads/writes (Phase 5) — many routes still use `createdBy` after permission checks
- Stripe customer per organization (Phase 12)
- Enterprise SSO / SCIM (Phases 9–10)

Do not treat Phase 4 as complete multi-tenant resource isolation.
