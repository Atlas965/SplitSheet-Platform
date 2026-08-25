# Authentication Architecture — SplitSheet

**Company:** SoundLedger Technologies Inc.  
**Product:** SplitSheet ([splitsheet.ca](https://splitsheet.ca))  
**Document type:** Phase 0 audit (as-built)  
**Status:** Audit complete — **no production auth migration claimed**  
**Date:** 2026-08-24  

This document describes **what exists today**, security weaknesses, public vs protected surfaces, database implications for later phases, migration risks, and a recommended order of work. It does **not** claim Auth0, full org RBAC, or production-grade identity are implemented.

---

## 1. Product boundary (unchanged)

SplitSheet remains an **operator-managed rights documentation workflow**:

Operator → project → splits/agreement → contributor confirmation link → evidence → rights ledger → Stripe billing.

- Contributors **do not** require accounts.
- Auth must not imply legal enforceability.
- Auth/billing/authorization stay logically separate.

---

## 2. Current authentication architecture

### 2.1 Mode selection

Runtime chooses one stack via `server/runtime.ts` + `server/replitAuth.ts` → `setupAuth()`:

| Mode | When | Behavior |
| --- | --- | --- |
| **Local (passwordless)** | `AUTH_PROVIDER=local`, or `LOCAL_DEV=true` in development, or social requested but **no provider credentials** | `GET /api/login` creates/logs in fixed user `local-dev-operator` with no password |
| **Social** | `AUTH_PROVIDER=social` (or credentials present) and at least one provider configured | Google / Microsoft / GitHub / Apple via `server/social-auth.ts` |
| **Replit OIDC** | Neither local nor social path | Passport `openid-client` against Replit issuer |

Production on Vercel typically targets **social** (Google). Misconfiguration can fall back to **passwordless local login** — see §5.

### 2.2 Session model

| Aspect | Current implementation |
| --- | --- |
| Library | `express-session` + Passport |
| Store | `connect-pg-simple` → Postgres table `sessions` (`shared/schema.ts`) |
| Cookie name | `splitsheet.sid` |
| Flags | `httpOnly: true`, `sameSite: "lax"`, `secure` when production or Vercel |
| TTL | 7 days (`maxAge` + store TTL) |
| `saveUninitialized` | `true` (OAuth on serverless) |
| `proxy` / trust | `proxy: true`, `trust proxy: 1` |
| Serialize | Entire Passport user object (claims; may include provider tokens for Replit) |
| Session regenerate on login | **Not implemented** |
| Explicit destroy on logout | **Weak** — `req.logout` / redirect; not consistently `session.destroy` + cookie clear |

### 2.3 Operator login routes

| Route | Purpose |
| --- | --- |
| `GET /api/auth/providers` | Lists enabled social providers + `localDev` flag |
| `GET /api/login` | Social → redirect `/login`; local → passwordless login; Replit → OIDC start |
| `GET /api/logout` | Logout (+ Replit end-session when applicable) |
| `GET /api/auth/user` | Current user (requires `isAuthenticated`) |
| `GET /api/auth/google` (+ `/callback`) | Google OAuth (cookie PKCE + state) |
| `GET /api/auth/microsoft` (+ `/callback`) | Microsoft OIDC (cookie PKCE) |
| `GET /api/auth/github` (+ `/callback`) | GitHub OAuth |
| `GET|POST /api/auth/apple/callback` | Apple Sign In |
| `GET /api/callback` | Replit OIDC callback |

UI: `client/src/pages/login.tsx`.

### 2.4 Local passwords

| Capability | Status |
| --- | --- |
| Password column on `users` | **Absent** |
| Argon2 / bcrypt hashing | **Absent** |
| Password reset | **Absent** |
| “Local auth” today | Passwordless operator bootstrap only |

### 2.5 Google / social OAuth (current)

- Google: authorize at Google; **token exchange via direct POST** to Google’s token endpoint; PKCE + state in HttpOnly cookie (`oauth_state_google`).
- Account upsert: id `provider:providerUserId`; **if email matches an existing user, that row is reused** (linking by email — takeover risk if email unverified / attacker-controlled).
- Google `id_token` may be decoded for claims **without cryptographic verification** when used as fallback; userinfo fetch preferred when access token present.

### 2.6 Frontend auth UX

- `useAuth` → `GET /api/auth/user`.
- `App.tsx`: unauthenticated → Landing / Login / public confirm; authenticated → operator shell + `TermsGate`.
- Many pages redirect to `/api/login` on 401 — **SPA-only**; security depends on API middleware.

---

## 3. Current authorization architecture

### 3.1 Middleware

| Helper | Location | Role |
| --- | --- | --- |
| `isAuthenticated` | `server/replitAuth.ts` | Session + `expires_at`; Replit may refresh; social/local → 401 if expired |
| `isAdmin` | `server/adminAuth.ts` | DB `users.role === "admin"` |
| `requireTermsAccepted` | `server/compliance-routes.ts` | Blocks authenticated `/api/*` until ToS+Privacy current (allowlist for auth/legal/health) |
| Org helpers | `server/organization-routes.ts` | `requireOrgMember` / role ordering for **org APIs only** |

### 3.2 Platform roles (today)

- `users.role`: essentially `user` | `admin` (platform admin, not org RBAC).
- Org membership roles (existing tables): `owner` | `admin` | `member` | `viewer` on `organization_members`.
- **Most product resources** (contracts, assets, clients) are still authorized primarily by **`created_by` / user id**, not `organization_id`.
- Inconsistent admin check: e.g. analytics uses `subscriptionTier === "admin"` instead of `isAdmin`.

### 3.3 What is NOT consistently enforced

- Shared reusable `requirePermission()` across all resources.
- Mandatory org context on every request.
- Resource-level checks on many ledger/revenue/client endpoints (see §5 / §7).

---

## 4. Contributor confirmation (must remain accountless)

### 4.1 Primary system (preserve)

| Aspect | Current |
| --- | --- |
| Routes | `GET|POST /api/confirm/:contractId/:token` (`confirmation-routes.ts`) |
| UI | `/confirm/:contractId/:token` → `confirm-split.tsx` |
| Token | `crypto.randomBytes(32).toString("hex")` (256-bit) |
| Expiry | 72 hours |
| Evidence | name, email, note, IP, UA, timestamps |
| Operator controls | generate/list with contract ownership checks (mostly) |

### 4.2 Gaps vs target hardening

- Soft single-use (idempotent confirm; token not rotated/revoked).
- `mark-sent` path missing ownership check (IDOR).
- Contributor Terms/Privacy version **not** recorded on confirm.
- **Legacy duplicate** public API: `GET|POST /api/confirmations/:token` in `routes.ts` exposes broader contract payload — should be retired or locked down in Phase 1/6.

---

## 5. Security weaknesses (prioritized)

### Critical / high (fix before Auth0 expansion)

1. **Passwordless local login reachable when social is misconfigured** on production-like hosts (`AUTH_PROVIDER=social` without credentials → local fallback).
2. **Email-based account linking** on social upsert → account takeover if an attacker can authenticate with an email that matches an existing user.
3. **IDOR / BOLA** on multiple authenticated endpoints (assets by id, ownership/revenue reads, payouts by projectId, client PATCH, confirmation mark-sent, fraud-events without admin, dispute resolve without admin).
4. **OIDC token verification gaps** (unsigned JWT payload decode paths).
5. **Admin authorization inconsistency** (`role` vs `subscriptionTier`).

### Medium

6. No session regeneration after login (fixation risk).
7. Logout does not reliably destroy server session / clear cookie.
8. No dedicated CSRF strategy beyond `SameSite=Lax` (stateful cookie APIs).
9. No dedicated rate limits on login / OAuth callback / public confirm (only coarse global/IP limit).
10. Terms middleware **fail-open** on DB errors.
11. Dual confirmation APIs (attack/legacy surface).
12. Audit log does not systematically record AUTH_LOGIN / AUTH_LOGOUT / failed auth.
13. Session may retain provider tokens (Replit path).

### Lower / operational

14. In-memory rate limiters ineffective across Vercel isolates.
15. Frontend-only admin checks on some pages.
16. Fixed application-level encryption salt for field encryption (separate from auth, but noted).

---

## 6. Duplicated authentication / authz logic

| Duplication | Notes |
| --- | --- |
| Confirmation APIs | New `confirmation-routes` vs legacy `routes.ts` confirmations |
| Rate limiters | `security.ts` PG limiter, in-memory helpers, inline Map in `routes.ts` |
| Admin checks | `isAdmin` vs `subscriptionTier === "admin"` |
| CORS helper | Defined in routes but not consistently applied |
| Identity upsert | Social email-merge vs Replit `sub`-only |
| Confirm UI | Legacy `confirm.tsx` vs routed `confirm-split.tsx` |

---

## 7. Routes requiring protection (must stay authenticated + authorized)

Examples (not exhaustive):  

`/api/contracts*`, `/api/projects*`, `/api/clients*`, `/api/assets*`, `/api/profile*`, `/api/billing*`, `/api/get-or-create-subscription`, `/api/analytics*`, `/api/admin/*`, `/api/templates` mutations, `/api/organizations*`, `/api/user/export`, `/api/account/delete`, `/api/copilot*`, ownership/revenue mutations, audit reads.

**Rule for later phases:** authn → active org → membership → permission → **resource.organization_id (or owner) match**.

---

## 8. Routes that must remain public

| Route | Reason |
| --- | --- |
| Landing / `/login` | Marketing + operator login entry |
| `/api/auth/providers`, OAuth start/callback | Identity bootstrap |
| `/api/login`, `/api/logout` (as designed) | Auth lifecycle |
| `/confirm/:contractId/:token` + matching confirm APIs | Accountless contributors |
| `GET /api/legal/documents/:docType/latest` (and history if public) | Transparency / gate content |
| `GET /api/health` | Ops |
| `POST /api/stripe/webhook` | Stripe signatures (no session) |
| `POST /api/stripe/connect-webhook` | Connect events |

Public ≠ unauthenticated abuse-free: confirm and auth endpoints need **rate limits** and token validation.

---

## 9. Legal / TermsGate (as-built)

- Versioned `legal_documents` + `legal_acceptances`.
- Gated types: ToS + Privacy for **operators**.
- `TermsGate` UI + `requireTermsAccepted` API middleware.
- Accept stores user, version, IP, UA.
- **Missing:** org id on acceptance; contributor-facing consent version on confirm; single UI source of truth (footer still has competing copy — product/legal content issue, not Auth0).

---

## 10. Stripe relationship (keep separate)

| Concern | Owner |
| --- | --- |
| Who is the user? | Auth (session / future Auth0) |
| What can they do? | SplitSheet authorization |
| Who paid? | Stripe + `users.stripeCustomerId` / subscription fields + webhooks |

Webhook: `POST /api/stripe/webhook` with signature verification in production and `payment_events` idempotency (`stripe-subscription-webhook.ts`). Billing must never be used as authentication.

---

## 11. Database changes required (for later phases — not applied in Phase 0)

Existing building blocks:

- `users`, `sessions`
- `organizations`, `organization_members`, `organization_api_keys`
- `legal_documents`, `legal_acceptances`
- `split_confirmations` / legacy confirmations
- `audit_log`, `payment_events`

Likely **additive** migrations for Phases 3–11 (do not delete data):

| Change | Purpose |
| --- | --- |
| `users.auth0_sub` (or `identity_provider` + `external_subject`) | Link Auth0 identity without destroying ids |
| Expand org roles to OWNER/ADMIN/OPERATOR/REVIEWER/FINANCE/VIEWER | Target RBAC |
| `permissions` / role-permission map (table or code constant) | Explicit permissions |
| `organization_id` on projects, contracts, clients, assets, rights, audit, billing linkage | Tenant isolation |
| Active org preference (`users.active_organization_id` or session claim) | Org switcher |
| Confirmation: `revoked_at`, `consumed_at`, `legal_doc_versions` JSON | Harden tokens + consent evidence |
| Security audit events table or extend `audit_log` action enum | AUTH_* events |
| Optional: `organization_sso_configs` stub | Enterprise SSO extension point (empty until needed) |
| Optional: SCIM extension notes only | No fake SCIM implementation |

**Risk:** Backfilling `organization_id` on historical rows; need default personal org per existing operator.

---

## 12. Migration risks

| Risk | Mitigation |
| --- | --- |
| Operators locked out during IdP cutover | Dual-run: session auth + Auth0 link; staged rollout |
| Email-merge creates wrong links | Stop auto-link; require verified email + explicit link flow |
| Passwordless fallback in prod | Hard-disable local auth when `VERCEL=1` / `NODE_ENV=production` unless explicit break-glass |
| Session cookie rename / Auth0 cookie clash | Document cookie names; staged deploy |
| Org backfill orphans resources | Create personal org per user; attach `created_by` resources |
| Legacy confirm API abuse | Deprecate after traffic check; keep primary token routes |
| Stripe customer orphaned from user | Never rewrite Stripe ids during auth migration |
| Rollback | Keep previous auth module behind flag `AUTH_PROVIDER=social|auth0|local` |

---

## 13. Recommended migration order

Aligned with the program phases; **do not skip Phase 1**:

| Order | Phase | Outcome |
| --- | --- | --- |
| 0 | **This audit** | Shared baseline |
| 1 | **Harden MVP auth** | Kill prod passwordless fallback; session regenerate/destroy; rate limits; stop unsafe email linking; CSRF strategy; fix critical IDORs; retire or lock legacy confirm API |
| 2 | **Auth0 introduce** | Env-based; Google via Auth0; map `auth0_sub` → `users`; keep contributor links unchanged |
| 3 | **Org/tenant** | Backfill orgs; attach resources |
| 4 | **RBAC** | Central `requireAuth` / `requireOrganizationMembership` / `requireRole` / `requirePermission` |
| 5 | **Resource authz** | Every by-id API scoped to org |
| 6 | **Contributor harden** | Expiry + revoke + consume + consent versions + rate limit |
| 7 | **Legal acceptance** | Org-aware; remove competing hardcoded legal essays |
| 8 | **MFA** | Auth0-managed; enforce for owner/admin |
| 9–10 | **SSO / SCIM** | Design + stubs only until enterprise demand |
| 11 | **Audit events** | AUTH_* and security events without secrets |
| 12–13 | **Stripe separation + webhook verify** | Confirm prod path; tests for signature/idempotency |
| 14–15 | **Tests + review** | IDOR/cross-tenant must fail closed |
| 16–18 | **Migration, UX, env** | Staged; `.env.example` placeholders only |
| 19 | **Docs** | Document **implemented** behavior only |
| 20 | **Acceptance checklist** | No “secure” claim without evidence |

---

## 14. What already exists (preserve)

- Operator session auth + Google social login path used in production.
- Postgres session store.
- Accountless confirmation with strong token entropy and expiry.
- Org tables + org-route RBAC (partial product coverage).
- Versioned legal docs + TermsGate for operators.
- Stripe webhooks with signature + idempotency design.
- Disclaimers that SplitSheet is not a law firm.

---

## 15. Explicit non-goals for the identity program

- Turning SplitSheet into an IdP/SCIM product.
- Forcing contributor accounts.
- Using Stripe as login.
- Claiming counsel-approved enforceability via auth features.
- Rewriting the 16-stage workflow or billing UX except where authz requires it.

---

## 16. Phase 0 exit criteria

- [x] Repository inspected for auth, sessions, confirmations, legal gate, Stripe linkage, frontend guards.
- [x] Current architecture documented.
- [x] Weaknesses and IDOR hotspots listed.
- [x] Public vs protected routes identified.
- [x] DB / migration risks outlined.
- [x] Ordered plan for Phases 1–20.
- [x] Phase 1 authorized and hardening implemented (see §18).

---

## 17. Phase 1 next (completed in repo — verify after deploy)

Phase 1 hardening is implemented in code. Redeploy Production, then manually verify Google login, logout, confirm links, and IDOR 403s.

---

## 18. Phase 1 — implemented (not “production-certified”)

| Item | Result |
| --- | --- |
| Prod passwordless fallback | Disabled unless `ALLOW_LOCAL_AUTH_IN_PRODUCTION=true` with `AUTH_PROVIDER=local` |
| Social missing credentials on prod | Boot fails (no local fallback) |
| Session regenerate on login | `establishSession()` |
| Logout destroys session + clears cookie | `destroySession()` |
| Rate limits | `/api/auth`, `/api/login`, `/api/confirm` |
| Email account linking | Default refuse; optional same-provider only via `ALLOW_EMAIL_ACCOUNT_LINKING` |
| IDOR ownership checks | Assets, ownership, revenue, payouts, clients PATCH, confirm mark-sent |
| Admin gates | fraud-events, dispute resolve, analytics/global |
| Legacy confirm API | `410 Gone` |
| Terms check on prod-like | Fail closed (503) if DB check errors |
| Unit tests | `server/__tests__/runtime-auth.test.ts` (passed locally) |

**Remaining Phase 1 risks:** SameSite=Lax only (no CSRF tokens); org-scoped RBAC still incomplete; contributor consent versions not recorded; not all routes ownership-audited.

---

## 19. Phase 2 — Auth0 (implemented in code — requires manual Auth0 + Vercel config)

| Item | Result |
| --- | --- |
| Auth0 OIDC + PKCE | `server/auth0-auth.ts` — `/api/auth/auth0` + callback |
| Session after Auth0 | `establishSession()`; logout → Auth0 `/v2/logout` |
| User link | `users.auth0_sub` + id `auth0:{sub}` |
| Dual-run | Keep `AUTH_PROVIDER=social` until Auth0 verified; then `AUTH_PROVIDER=auth0` |
| Docs | `docs/AUTHENTICATION.md` |
| MFA / Google via Auth0 | **Configured in Auth0 Dashboard** (not built in SplitSheet) |

**Manual steps required before claiming Auth0 works in Production:** create Auth0 Regular Web App, set callbacks, add Vercel env vars, switch `AUTH_PROVIDER=auth0`, redeploy, test login/logout.

**Not done yet:** Phase 3 org tenancy expansion, Phase 4 full RBAC matrix, enterprise SSO/SCIM.

---

## 20. Phase 3 — Organization / tenant architecture (implemented structures)

| Item | Result |
| --- | --- |
| RBAC catalog | `shared/org-rbac.ts` — owner/admin/operator/reviewer/finance/viewer + permissions |
| Active org | `users.active_organization_id` + `GET/POST /api/me/organization` |
| Personal workspace | `ensurePersonalOrganization()` on login / org list / auth user |
| Resource columns | `contracts.organization_id`, `song_assets.organization_id` (stamped on create) |
| Legacy `member` role | Migrated/normalized to `operator` |
| Docs | `docs/AUTHORIZATION.md` |

**Not claimed:** Full permission middleware on all APIs (Phase 4) or org-only IDOR (Phase 5). `createdBy` checks still apply for many routes.

---

## 21. Phase 4 — Central RBAC middleware (implemented)

| Item | Result |
| --- | --- |
| Module | `server/rbac-middleware.ts` — `requireAuth`, `requireOrganizationMembership`, `requireRole`, `requirePermission`, `requireActivePermission`, `requireActiveOrg` |
| Org routes | Use shared membership/role/permission gates (no local duplicates) |
| Product routes | Contracts, assets, projects, clients, confirmations, billing Connect/refund gated by permission or active org |
| Catalog | Added `agreement.update` for operator/admin/owner |
| Tests | `server/__tests__/rbac-middleware.test.ts` |
| Docs | `docs/AUTHORIZATION.md` |

**Not claimed:** Org-scoped IDOR on every by-id resource (Phase 5). Permission checks do not replace `createdBy` ownership yet.

---

## 22. Phase 5 — Resource-level org IDOR (implemented for contracts/assets)

| Item | Result |
| --- | --- |
| Policy | Stamped `organization_id` must match active org; null → legacy `createdBy` |
| Helpers | `resourceBelongsToOrg`, upgraded `requireOwned*`, `canReadContract` |
| Lists | `getContractsForOrganization`, `getSongAssetsForOrganization` |
| Surfaces | Contracts, assets, projects, clients, confirmations, rights ledger, template sync, voice context |
| Tests | `server/__tests__/org-resource-authz.test.ts` |
| Docs | `docs/AUTHORIZATION.md` |

**Remaining:** creators (no org column), some negotiation/personal routes still `createdBy`-only; live cross-tenant IDOR suite not yet in CI.

---

## 23. Phase 6 — Contributor token harden (implemented)

| Item | Result |
| --- | --- |
| Columns | `revoked_at`, `consumed_at`, `consent_versions` on `split_confirmations` |
| Policy | `evaluateConfirmationToken()` — revoke/expiry fail closed |
| Operator revoke | `POST …/confirmations/:confirmId/revoke` |
| Consent evidence | Latest `contributor_consent` version stored on confirm |
| Rate limit | Existing `/api/confirm` limiter retained |

---

## 24. Phase 7 — Legal acceptance org-aware (implemented)

| Item | Result |
| --- | --- |
| Column | `legal_acceptances.organization_id` |
| Accept path | Stamps active org when present |
| Gate | Existing TermsGate (tos + privacy) unchanged |

Hardcoded competing legal essays were not reintroduced; counsel text remains versioned via `legal_documents`.

---

## 25. Phase 8 — MFA enforcement hook (implemented; Auth0-managed factors)

| Item | Result |
| --- | --- |
| Session | Auth0 callback stores `amr` / `mfa` |
| Gate | `requireMfaForPrivilegedOrgRoles` when `REQUIRE_MFA_FOR_ORG_ADMINS=true` |
| Surfaces | Org patch, member add, role change, API key create |

**Manual:** Enable MFA in Auth0 Dashboard before turning the env flag on in Production.

---

## 26. Phases 9–10 — SSO / SCIM stubs

| Item | Result |
| --- | --- |
| Routes | `/api/enterprise/sso/*`, `/api/enterprise/scim/*` → `501` |
| Docs | `docs/ENTERPRISE_SSO_SCIM.md` |

---

## 27. Phase 11 — AUTH_* audit events

| Item | Result |
| --- | --- |
| Module | `server/auth-events.ts` |
| Wired | Auth0 login/logout, confirm view/submit/revoke, terms accept |

---

## 28. Phases 12–13 — Stripe separation

| Item | Result |
| --- | --- |
| Subscription vs Connect | Separate webhook routes (existing) |
| Signature | Production-like refuses unsigned events |
| Org column | `organizations.stripe_customer_id` (optional; billing still user-default) |
| Tests | `webhookRequiresSignature` + event list |

---

## 29. Phases 14–15 — Tests

Unit coverage for token policy, MFA flag, AUTH catalog, Stripe signature gate, cross-tenant `resourceBelongsToOrg`. Live DB IDOR suite still operator checklist.

---

## 30. Phases 16–20 — Env, docs, acceptance

| Item | Result |
| --- | --- |
| Env | `.env.example` includes MFA flag |
| Docs | `AUTHENTICATION.md`, `AUTHORIZATION.md`, `ENTERPRISE_SSO_SCIM.md`, `ACCEPTANCE_CHECKLIST.md` |
| Acceptance | Checklist only — no unearned “secure” claim |
