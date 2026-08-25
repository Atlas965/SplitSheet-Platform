# Identity program — acceptance checklist (Phase 20)

Use this after deploying code from Phases 1–19. Check items only when **you** verified them. Do not mark the product “fully secure” without evidence.

## Operator auth

- [ ] Preview/Production login works with current `AUTH_PROVIDER` (`social` or `auth0`)
- [ ] Logout destroys session cookie (`splitsheet.sid`)
- [ ] Unauthenticated `/api/contracts` → 401
- [ ] Local passwordless **blocked** on Vercel unless break-glass env set

## Auth0 (if enabled)

- [ ] Callback `…/api/auth/auth0/callback` succeeds
- [ ] Auth0 logout returns to `APP_URL`
- [ ] MFA factors configured in Auth0 Dashboard
- [ ] With `REQUIRE_MFA_FOR_ORG_ADMINS=true`, owner/admin member/API-key mutations return `MFA_REQUIRED` without MFA session

## Tenancy / RBAC

- [ ] `GET /api/me/organization` returns active org + permissions
- [ ] Org teammate can open stamped contract in shared active org
- [ ] Switching active org → other org’s stamped contract → 403
- [ ] Viewer cannot `POST /api/contracts` (missing `agreement.create`)

## Contributor links (accountless)

- [ ] Confirm link works without login
- [ ] Expired link → 410
- [ ] Operator revoke → 410 on public GET/POST
- [ ] Successful confirm stores `consumed_at` / consent version when published
- [ ] Legacy `/api/confirmations/:token` → 410

## Legal

- [ ] TermsGate blocks API until ToS+Privacy current
- [ ] Accept-terms records `organization_id` when active org exists

## Billing

- [ ] Stripe webhook rejects missing signature in production
- [ ] Duplicate Stripe event id is ignored (idempotency)
- [ ] Connect webhook separate from subscription webhook

## Audit

- [ ] Login/logout/confirm/revoke appear in `audit_log` as `AUTH_*` (no tokens in payload)

## Explicit non-claims

- SplitSheet is not a law firm; confirmations are rights documentation, not counsel-approved enforceability.
- SSO/SCIM routes are stubs (`501`) until enterprise enablement.
- Org Stripe customer column exists; default billing remains user-linked until a dedicated billing migration.
