# Authorization & tenancy (Phases 3–5 — as implemented)

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
| Resource IDOR | Org-scoped helpers in `server/authz-helpers.ts` |

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

## Phase 5 resource authz

| Rule | Behavior |
| --- | --- |
| Stamped resource (`organization_id` set) | Access only if it equals the caller's **active** org |
| Unstamped legacy (`organization_id` null) | Access only if `created_by` = caller (until backfill) |
| Lists | `getContractsForOrganization` / `getSongAssetsForOrganization` |
| Helpers | `requireOwnedContract` / `Asset` / `RevenueEvent` / `Collaborator`, `canReadContract`, `resourceBelongsToOrg` |

Wired onto contracts, assets, projects, clients, confirmations, rights ledger, template sync, voice rights context.

**Still creator-scoped (no org column yet):** `creators` table, some negotiations/personal surfaces.

## APIs

| Route | Purpose |
| --- | --- |
| `GET /api/organizations` | Memberships (ensures personal org) |
| `GET /api/me/organization` | Active org + permissions |
| `POST /api/me/organization` | `{ organizationId }` switch active tenant |
| `GET /api/auth/user` | Includes `activeOrganization` |

New contracts/assets are stamped with the active `organizationId`.

## Not done yet (later phases)

- Stripe customer per organization (Phase 12)
- Enterprise SSO / SCIM (Phases 9–10)
- Org column on every remaining resource type (creators, etc.)

Do not claim “fully multi-tenant secure” without cross-tenant IDOR tests in CI against a live DB.
