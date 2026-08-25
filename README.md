# SplitSheet

**Operator-managed music rights documentation** for studios, producers, and labels who run split sheets and related agreements on behalf of artists.

Built by **SoundLedger Technologies Inc.** (Ontario, Canada) · Live: [splitsheet.ca](https://splitsheet.ca)

> SplitSheet is a **workflow and evidence tool**. It is not a law firm, not a party to your agreements, and agreement templates are **not counsel-approved legal instruments** until entertainment counsel says so.

---

## 1. Product in one sentence

An authenticated **operator** creates projects, captures splits and agreement details, sends contributors a **public confirmation link** (no account required), records confirmations/signatures with evidence, and keeps a **rights ledger** — with Stripe billing for the operator.

---

## 2. Who it is for

| Role | What they do in SplitSheet |
| --- | --- |
| **Operator** (studio / producer / label staff) | Logs in, runs projects end-to-end, sends confirmations, manages clients and ledger |
| **Contributor** (writer, artist, producer) | Opens a token link, confirms or signs — **no account** |
| **Admin** | Publishes versioned Terms / Privacy (and related legal docs) |

**Not for (yet):** self-serve consumer “DIY split sheet” as the primary product, third-party marketplace escrow, or claiming court-ready enforceability out of the box.

---

## 3. Core use cases (keep these sharp)

1. **Intake a song/project** — contributors, roles, ownership percentages.
2. **Generate / fill an agreement** from catalog templates (split sheet, producer, performance, management, etc.).
3. **Validate** before send (ownership totals, required fields, blocking issues).
4. **Send confirmation links** — time-limited tokens; contributor confirms identity + acceptance of the split/terms on that page.
5. **Capture evidence** — timestamps, IP, user agent, confirmed name/email, signature image when used.
6. **Record rights in the ledger** — composition / master ownership history for the catalog.
7. **Bill the operator** — Stripe (session and subscription plans in CAD).

Everything else (Copilot, SOP library, catalog intelligence, multi-provider social login) supports these flows — it should not redefine the product.

---

## 4. Legal architecture readiness

### Verdict for counsel scoping phase

| Question | Answer |
| --- | --- |
| Ready to run a **legal architecture / counsel scoping** engagement? | **Yes** |
| Ready to market as **counsel-approved / legally binding platform**? | **No** |

The **plumbing is in place** for counsel to review architecture and supply text. The **content and a few claim mismatches** are what counsel should own — not a large new feature build.

### Already good enough (do not overbuild)

- Versioned legal documents + acceptance ledger + server-side terms gate for logged-in operators  
- Confirmation / signature evidence fields (token, expiry, IP, UA, timestamps)  
- PIPEDA-oriented export and account-deletion endpoints  
- Consistent “not a law firm / as-is / user responsible” disclaimers on product surfaces  
- Stripe webhook idempotency and session-backed auth  

### Minimal add / fix list (use-case oriented)

Do these before or during the counsel phase — nothing more unless counsel asks:

1. **Remove overclaims** — drop or soften US-only “ESIGN & UETA = legally binding” UI copy; Ontario governing law → counsel picks electronic-signature language (e.g. Ontario *Electronic Commerce Act, 2000* framing, or neutral “electronic record of confirmation”).  
2. **Contributor consent** — show current Privacy / contributor-facing notice on the public confirm page; record which version was shown (doc type already exists; wire it).  
3. **One source of truth for ToS/Privacy** — counsel publishes via admin legal docs; remove divergent hardcoded legal essays from the footer.  
4. **Honest PDF** — PDF should match what the product stores (don’t claim appended signature packages or tamper hashes unless implemented).  
5. **Counsel-authored text** — Terms, Privacy, retention summary, refund one-pager — published through the existing versioning system (content, not new architecture).

**Out of scope for this phase (avoid complexity):** third-party e-sign vendors, full DPA marketplace, multi-jurisdiction template engines, automated legal advice, blockchain ledgers.

---

## 5. Architecture (high level)

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript, Vite, Wouter, TanStack Query, Shadcn/Radix |
| Backend | Express (TypeScript), deployed as Vercel serverless (`api/index.js`) |
| Database | PostgreSQL (Neon) + Drizzle ORM — schema in `shared/schema.ts` |
| Auth | Session cookies (Postgres); **Auth0 Universal Login** (`AUTH_PROVIDER=auth0`) or direct social OAuth; local break-glass only |
| Tenancy | Organizations + memberships; active org on user; contracts/assets carry `organization_id` |
| Payments | Stripe Checkout + webhooks (`/api/stripe/webhook`) |
| PDFs | Client-side jsPDF |

```
Browser  →  splitsheet.ca
              ├── static React app
              └── /api/*  →  Express  →  Neon Postgres
                                      →  Stripe
                                      →  Google OAuth (operator login)
```

---

## 6. Main product surfaces

| Area | Route / API (examples) | Purpose |
| --- | --- | --- |
| Login | `/login`, `/api/auth/*` | Operator authentication |
| Dashboard / Ops | `/` and ops widgets | Work queue and project status |
| Projects | `/projects`, `/projects/new` | Intake and lifecycle |
| Agreements / contracts | contract detail, templates | Draft, review, send |
| Public confirm | `/confirm/:token` (public) | Contributor confirmation |
| Rights ledger | `/ownership` | Catalog ownership records |
| Billing | `/billing` | Plans and Stripe |
| Legal gate | TermsGate + `/api/...` terms check | Operators must accept current ToS/Privacy |
| Admin legal | legal document publish APIs | Counsel/admin versioned docs |

---

## 7. Agreement templates

Templates live in the shared catalog (`shared/agreement-catalog.ts`). Status fields include draft → legal review → approved.

**Important:** catalog entries are **workflow/documentation definitions**, not automatic counsel approval. `LEGAL_REVIEW_STATUSES` tracks review state; do not treat “template exists” as “lawyer signed off.”

Primary music categories in use: song creation, master rights, publishing, artist–label, licensing, live/touring. Other industries are reserved placeholders only.

---

## 8. Pricing (operator billing)

CAD pricing via Stripe (exact price IDs in env). Typical tiers:

- **Pay-per-session** — limited contributors / single-session workflow  
- **Creator / Studio subscriptions** — ongoing operator access  
- **Multi-creator / custom** — quote path where configured  

Cancel-at-period-end is supported through Stripe subscription handling.

---

## 9. Environment (production essentials)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `NEON_DATABASE_URL` | Postgres |
| `SESSION_SECRET` | Session signing |
| `APP_URL` | Canonical URL (e.g. `https://splitsheet.ca`) |
| `AUTH_PROVIDER` | `auth0` (recommended), `social`, or `local` (break-glass) |
| `AUTH0_DOMAIN` / `AUTH0_CLIENT_ID` / `AUTH0_CLIENT_SECRET` | Auth0 Universal Login |
| `ALLOW_LOCAL_AUTH_IN_PRODUCTION` | Break-glass only; required with `AUTH_PROVIDER=local` on Vercel/production |
| `ALLOW_EMAIL_ACCOUNT_LINKING` | Optional; default off (safer) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Direct Google login when `AUTH_PROVIDER=social` |
| `STRIPE_SECRET_KEY` / price IDs / webhook secrets | Billing |
| `LOCAL_DEV` | `false` on Vercel |

See `.env.example` for the full list. Never commit `.env`.

---

## 10. Run locally

```bash
npm install
cp .env.example .env   # fill secrets
npm run db:push        # schema to Neon (when configured)
npm run dev            # Vite + API (see package scripts)
```

Production build for Vercel:

```bash
npm run build:vercel
```

Deploy: push `main` to GitHub → Vercel production (rewrites `/api/*` to the Express bundle).

---

## 11. Repository layout

```
SplitSheet-platform/
├── client/                 # React UI
├── server/                 # Express API, auth, billing, compliance, voice/copilot
├── shared/                 # schema.ts, agreement catalog, shared types
├── api/index.js            # Vercel serverless bundle (generated by build:vercel)
├── docs/                   # Dev/setup notes (API, structure) — product truth is this README
├── .env.example
└── vercel.json
```

---

## 12. Documentation policy

- **This README** is the product source of truth: use cases, readiness, stack, how to run.  
- `docs/` holds engineering helpers (setup, file map). Prefer linking here over inventing parallel “PRODUCT.md” packs that go stale.  
- Legal **substance** (ToS/Privacy wording) belongs in the **versioned legal documents** system after counsel review — not as competing essays in the UI footer.

---

## 13. Disclaimer

SplitSheet and SoundLedger Technologies Inc. provide software for documenting music rights workflows. We do not provide legal advice. Operators and parties remain responsible for the accuracy of information, for obtaining legal advice where needed, and for the enforceability of any agreement they execute. Use of electronic confirmation or signature features creates an **operational record**; it does not by itself guarantee a particular legal outcome in any jurisdiction.
