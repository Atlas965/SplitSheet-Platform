# Authorization & tenancy (Phases 3–12 — as implemented)

SplitSheet is B2B/RaaS. Operators act **inside an organization (tenant)**. Contributors stay accountless.

## What exists

| Concept | Implementation |
| --- | --- |
| Organization | `organizations` (+ `sl_org_id`, optional `stripe_customer_id`) |
| Membership | `organization_members.role` |
| Roles | `owner`, `admin`, `operator`, `reviewer`, `finance`, `viewer` (`shared/org-rbac.ts`) |
| Legacy role | `member` → normalized to `operator` |
| Permissions | Code catalog in `shared/org-rbac.ts` (not a DB table yet) |
| Active tenant | `users.active_organization_id` |
| Resource tenancy | `contracts.organization_id`, `song_assets.organization_id` |
| Personal workspace | Auto-created on first org resolve / login (`ensurePersonalOrganization`) |
| RBAC middleware | `server/rbac-middleware.ts` |
| Resource IDOR | Org-scoped helpers in `server/authz-helpers.ts` |
| Contributor tokens | Revoke / consume / consent versions (`confirmation-token-policy.ts`) |
| MFA gate | `requireMfaForPrivilegedOrgRoles` when env enabled |
| Legal accept | `legal_acceptances.organization_id` stamped from active org |

## Phase 4–5 (summary)

See middleware + `resourceBelongsToOrg` rules in prior sections of the identity program. Stamped resources must match active org; legacy null uses `createdBy`.

## Not claimed without checklist evidence

- Live DB cross-tenant IDOR suite in CI (unit policy tests exist)
- Org Stripe customer as **default** billing (column ready; user-level Stripe remains default)
- Hosted enterprise IdP / SCIM (stubs only — `docs/ENTERPRISE_SSO_SCIM.md`)
- “Production certified” without `docs/ACCEPTANCE_CHECKLIST.md`

See also: `docs/AUTHENTICATION.md`, `docs/ACCEPTANCE_CHECKLIST.md`.
