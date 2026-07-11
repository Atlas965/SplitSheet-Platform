# SplitSheet — Music Agreement & Rights Management Platform

> Built by **SoundLedger Technologies Inc.** · Canadian copyright principles · Operator-managed B2B2C service model

**Repository:** [github.com/Atlas965/SplitSheet-Platform](https://github.com/Atlas965/SplitSheet-Platform)

SplitSheet is a full-stack music industry platform that combines split sheet management, contributor confirmation workflows, rights ledger tracking, AI-assisted operator guidance, and document generation into one operator-controlled system. It is designed for music service providers (producers, studios, publishers) who manage agreements on behalf of their clients — not as a self-serve product for end contributors.

**Current status:** MVP-ready for operator workflows (split documentation + contributor confirmation). Not a law firm — legal review recommended before marketing as “legally binding” or “fully compliant.”

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Database Schema](#3-database-schema)
4. [Operator Service Workflow](#4-operator-service-workflow)
5. [Music Agreements System](#5-music-agreements-system)
6. [Rights Ledger](#6-rights-ledger)
7. [Pricing Model](#7-pricing-model)
8. [API Reference](#8-api-reference)
9. [Pages & Routes](#9-pages--routes)
10. [Authentication](#10-authentication)
11. [Billing & Stripe Integration](#11-billing--stripe-integration)
12. [PDF Generation](#12-pdf-generation)
13. [Environment Variables](#13-environment-variables)
14. [Running Locally](#14-running-locally)
15. [Project Structure](#15-project-structure)
16. [SoundLedger CoPilot](#16-soundledger-copilot)
17. [Launch Readiness](#17-launch-readiness)

---

## 1. Product Overview

SplitSheet operates as an **internal operations tool** for a music service business. The operator logs in and manages everything — clients, projects, contributors, and agreements — on behalf of the people they work with. End contributors (artists, producers, co-writers) interact only via a public confirmation link; they never need an account.

### Core Systems

| System | What It Does |
|---|---|
| **Operator Dashboard** | Command-centre view of all clients, active projects, and pending confirmations |
| **Client Management** | CRM-lite for artists, producers, labels, and songwriters the operator serves |
| **Service Projects** | Per-song split sheet jobs from intake to confirmed record |
| **Contributor Confirmation** | Token-based public links for each contributor — no auth required |
| **Music Agreements** | Create, manage, and sign legal document templates (split sheets, producer deals, etc.) |
| **Rights Ledger** | Track song asset ownership, archive/deactivate assets, log activity |
| **Billing** | Stripe-backed subscription and session-based payment handling |
| **SoundLedger CoPilot** | AI assistant (OpenAI) embedded in-app — platform guidance, PRO/split help |
| **Onboarding Walkthrough** | First-run 8-step guided tour of the B2B2C operator workflow |
| **Workflow Banner** | Dashboard checklist: Client Intake → Split Setup → Confirmation → Ledger |

---

## 2. Architecture

### Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Wouter routing, Shadcn/UI + Radix + Tailwind CSS |
| **Backend** | Node.js + Express.js, TypeScript |
| **Database** | PostgreSQL (Neon serverless) + Drizzle ORM |
| **Auth** | Replit OIDC via Passport.js · `LOCAL_DEV=true` for local auto-login |
| **AI** | OpenAI (`gpt-4o-mini` default) for CoPilot · offline keyword fallback |
| **Payments** | Stripe (subscriptions + session billing) |
| **PDF** | jsPDF (client-side generation) |
| **Build** | Vite (frontend) + tsx (backend dev server) |

### Monorepo Layout

```
/
├── client/           # React frontend (Vite)
│   └── src/
│       ├── components/   # Shared UI components
│       ├── pages/        # One file per route
│       ├── hooks/        # Custom React hooks
│       └── lib/          # Query client, utilities
├── server/           # Express backend
│   ├── index.ts          # Entry point
│   ├── routes.ts         # Core API route handlers
│   ├── service-routes.ts # B2B2C clients, projects, contributors, workflow
│   ├── copilot-routes.ts # SoundLedger CoPilot AI (SSE streaming)
│   ├── copilot-knowledge.ts # Shared platform knowledge for AI prompts
│   ├── copilot-fallback.ts  # Offline CoPilot responses
│   ├── claude.service.ts    # OpenAI streaming service
│   ├── confirmation-routes.ts # Public contributor confirmation links
│   ├── replitAuth.ts     # Passport / OIDC + local dev auth
│   ├── storage.ts        # IStorage interface + DatabaseStorage
│   ├── env.ts            # Production env validation
│   ├── loadEnv.ts        # .env loader for local development
│   └── db.ts             # Drizzle DB connection
├── shared/
│   └── schema.ts     # Single source of truth for DB tables + Zod schemas
└── drizzle.config.ts
```

### Data Flow

```
Browser → Vite dev server (port 5000)
             └──> Express API (/api/*)
                      └──> DatabaseStorage
                               └──> PostgreSQL (Neon)
```

All API state on the frontend is managed by **TanStack Query v5** with a shared `queryClient` and a default fetcher that handles auth headers automatically.

---

## 3. Database Schema

All tables are defined in `shared/schema.ts` using Drizzle ORM. Every table also exports an insert schema (via `drizzle-zod`) and TypeScript types.

### Core Tables

#### `users`
Operator accounts. Linked to Stripe customer and subscription IDs.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | Replit user ID |
| `email` | text | |
| `stripeCustomerId` | text | |
| `stripeSubscriptionId` | text | |
| `subscriptionTier` | text | free / session / pro / creator_pro / studio_pro |
| `subscriptionStatus` | text | active / cancelled / past_due |

#### `sessions`
PostgreSQL-backed Express sessions via `connect-pg-simple`.

---

### Service Business Tables

#### `clients`
People and entities the operator works with.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | UUID |
| `operatorId` | text | FK → users.id |
| `name` | text | |
| `email` | text | |
| `phone` | text | |
| `type` | text | artist / producer / songwriter / group / label |
| `notes` | text | |

#### `service_projects`
One row per song / split sheet job.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | UUID |
| `operatorId` | text | FK → users.id |
| `clientId` | text | FK → clients.id (nullable) |
| `title` | text | Project label |
| `songTitle` | text | The song name |
| `status` | text | draft / pending_confirmation / confirmed / archived |
| `notes` | text | |

#### `project_contributors`
Each person with an ownership stake in a project.

| Column | Type | Notes |
|---|---|---|
| `id` | text (PK) | UUID |
| `projectId` | text | FK → service_projects.id (cascade delete) |
| `name` | text | |
| `email` | text | |
| `role` | text | songwriter / producer / artist / co-writer / etc. |
| `pro` | text | PRO affiliation (SOCAN, ASCAP, BMI, etc.) |
| `ipi` | text | IPI/CAE number |
| `ownershipPercentage` | text | e.g. "33.33" — must total 100 across project |
| `confirmationToken` | text | Unique token for public confirmation URL |
| `confirmedAt` | timestamp | Set when contributor confirms |
| `confirmationIp` | text | IP address at time of confirmation |

---

### Music Agreements Tables

#### `contract_templates`
Reusable legal document blueprints with JSON-defined fields.

#### `contracts`
Filled-in agreement instances. Status: `draft` → `pending` → `signed`.

#### `contract_collaborators`
Parties added to a contract for signature collection.

#### `contract_signatures`
Digital signature records with timestamps.

#### `confirmations`
Token-based signing confirmations for contract parties.

---

### Rights Ledger Tables

#### `song_assets`
Registered songs/tracks with full lifecycle tracking.

| Key Columns | Notes |
|---|---|
| `iswc` | International Standard Musical Work Code |
| `type` | original / cover / sample-based / arrangement |
| `status` | active / archived / deactivated |
| `archivedAt`, `archivedBy` | Archival audit trail |
| `deactivatedAt` | Soft deactivation timestamp |

#### `ownership_records`
Point-in-time ownership splits for a song asset. Versioned history.

#### `revenue_events`
Revenue distribution events linked to song assets.

#### `payout_records`
Individual payout entries per ownership holder.

#### `user_balances`
Running balance per user across all payout events.

---

## 4. Operator Service Workflow

The service business follows a linear four-stage pipeline:

```
Client Intake → Split Setup → Confirmation → Confirmed Record
```

### Stage 1 — Client Intake
- Operator creates or selects a **Client** (artist, producer, songwriter, or label)
- Client stores contact info and type

### Stage 2 — Split Setup (Project)
- Operator creates a **Service Project** linked to the client
- Sets the song title and project label
- Adds **Contributors** — each gets a name, email, role, PRO, IPI, and ownership %
- UI validates that ownership percentages total exactly **100%** before allowing progression

### Stage 3 — Generate Confirmation Links
- Operator clicks **"Generate Confirmation Links"** on the project detail page
- Each contributor receives a unique URL:
  ```
  https://yourapp.com/confirm/{contractId}/{token}
  ```
- Project status advances to `pending_confirmation`
- Links can be copied and sent via any channel (email, WhatsApp, DM)

### Stage 4 — Contributor Confirmation
- Contributor visits their link — **no account required**
- They see the full split breakdown for the song
- They check an agreement checkbox and click confirm
- Confirmation is timestamped and IP-logged server-side
- When **all contributors** have confirmed → project auto-advances to `confirmed`

### Project Status Flow

```
draft ──> pending_confirmation ──> confirmed
                                        │
                               (can be archived)
                                        ▼
                                    archived
```

---

## 5. Music Agreements System

The agreements system supports four contract types, each backed by a JSON template:

| Template | Key Fields |
|---|---|
| **Split Sheet** | Contributors, ownership %, PRO info, song metadata |
| **Performance Agreement** | Venue, date, fee, technical rider |
| **Producer Agreement** | Producer fee, royalty %, delivery terms |
| **Management Agreement** | Commission rate, term length, scope |

### Lifecycle

1. Operator selects a template → fills in dynamic fields via form UI
2. Contract saved as `draft`
3. Collaborators added (by email)
4. Contract sent → status becomes `pending`
5. Each collaborator receives a confirmation link and signs
6. When all parties confirm → status becomes `signed`
7. PDF export available at any stage

### PDF Generation

Documents are generated **client-side** using **jsPDF**. The exported file:
- Includes all filled contract fields
- Shows all party names and roles
- Appends signature/confirmation records
- Footer identifies SplitSheet as the document platform
- Filename format: `{title}_agreement.pdf`

---

## 6. Rights Ledger

The Rights Ledger (`/ownership`) is a persistent asset registry for tracking song ownership over time.

### Song Asset Lifecycle

```
active ──> archived  (reversible — Restore action available)
       ──> deactivated  (irreversible)
```

Draft assets (never activated) can be permanently deleted.

### Features

- **Active / Archived tabs** — filtered views by asset status
- **ISWC field** — register International Standard Musical Work Codes
- **Asset type selector** — original / cover / sample-based / arrangement
- **Activity log** — timestamped audit trail of every action on the asset
- **Revenue-by-source bars** — visual breakdown of revenue across distribution platforms
- **Ownership split history** — full versioned record of ownership changes
- **Per-asset action menu** — Archive, Restore, Deactivate, or Delete Draft

### Asset Actions

| Action | Reversible | Result |
|---|---|---|
| Archive | Yes | Asset hidden from active view; restorable |
| Restore | — | Moves archived asset back to active |
| Deactivate | No | Permanently marks asset inactive |
| Delete Draft | — | Hard-deletes assets that were never activated |

---

## 7. Pricing Model

SplitSheet uses a **hybrid three-layer pricing model**:

### Layer 1 — Transaction (Pay-Per-Project)

| Tier | Price | Details |
|---|---|---|
| **Starter Access** | $0 CAD | 1 project, up to 2 contributors, full workflow |
| **Pay-Per-Session** | $25 CAD | Per completed session, up to 5 contributors |
| **Multi-Creator Project** | $50–$75 CAD | Up to 10 contributors, quote-based on complexity |
| **Express Add-On** | +$25 CAD | Priority processing, fast confirmation flow |

### Layer 2 — Subscription (Recurring SaaS)

| Tier | Price | Details |
|---|---|---|
| **Creator Pro** | $15 CAD/month | Unlimited sessions, project history, saved contributors, analytics |
| **Studio Pro** | $49 CAD/month | Team management, role-based permissions, bulk exports, priority support |

### Layer 3 — Enterprise (Institutional Licensing)

Custom pricing for labels, publishers, rights organizations, distributors, and PROs/CMOs. Includes API access, white-label deployment, bulk ingestion, compliance reporting, and dedicated account management.

**Contact:** enterprise@splitsheet.ca

---

## 8. API Reference

All authenticated routes require an active session cookie. Public routes are noted.

### Auth

| Method | Route | Notes |
|---|---|---|
| GET | `/api/login` | Initiates Replit OIDC login |
| GET | `/api/logout` | Clears session |
| GET | `/api/auth/user` | Returns current user or 401 |

### Service Business — Clients & Projects

Implemented in `server/service-routes.ts`. Projects map to **contracts**; contributors map to **contract_collaborators**.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workflow/status` | ✅ | Operator pipeline progress |
| GET | `/api/clients` | ✅ | List clients (derived from collaborators) |
| GET | `/api/clients/:id` | ✅ | Get client details |
| PATCH | `/api/clients/:id` | ✅ | Update collaborator record |
| GET | `/api/clients/:id/projects` | ✅ | Projects linked to a client |
| GET | `/api/projects` | ✅ | List projects (enriched contracts) |
| GET | `/api/projects/:id` | ✅ | Get project details |
| PATCH | `/api/projects/:id` | ✅ | Update project |
| GET | `/api/projects/:id/contributors` | ✅ | List contributors + confirmation status |
| POST | `/api/projects/:id/contributors` | ✅ | Add contributor |
| PATCH | `/api/projects/:id/contributors/:contribId` | ✅ | Edit contributor |
| DELETE | `/api/projects/:id/contributors/:contribId` | ✅ | Remove contributor |
| POST | `/api/projects/:id/send-confirmations` | ✅ | Generate links (100% ownership required) |

### Contributor Confirmation (Public)

Implemented in `server/confirmation-routes.ts`.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/confirm/:contractId/:token` | ❌ Public | Load confirmation page data |
| POST | `/api/confirm/:contractId/:token` | ❌ Public | Submit confirmation (timestamp + IP) |
| POST | `/api/contracts/:id/generate-confirmations` | ✅ | Operator: generate tokens for collaborators |

### SoundLedger CoPilot

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/copilot` | ✅ | Stream AI reply (SSE) with page context |
| GET | `/api/copilot/health` | ✅ | OpenAI configuration status |

### Health

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | ❌ Public | Service health check |

### Music Agreements

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/contracts` | ✅ | List user's agreements |
| POST | `/api/contracts` | ✅ | Create agreement |
| GET | `/api/contracts/:id` | ✅ | Get agreement |
| PATCH | `/api/contracts/:id` | ✅ | Update agreement |
| DELETE | `/api/contracts/:id` | ✅ | Delete agreement |
| GET | `/api/templates` | ✅ | List contract templates |
| GET | `/api/contracts/:id/collaborators` | ✅ | List collaborators |
| POST | `/api/contracts/:id/collaborators` | ✅ | Add collaborator |
| POST | `/api/contracts/:id/signatures` | ✅ | Submit signature |

### Rights Ledger

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/assets` | ✅ | List active song assets |
| GET | `/api/assets/archived` | ✅ | List archived assets |
| POST | `/api/assets` | ✅ | Register a new song asset |
| PATCH | `/api/assets/:id` | ✅ | Update asset fields |
| PATCH | `/api/assets/:id/archive` | ✅ | Archive an asset |
| PATCH | `/api/assets/:id/restore` | ✅ | Restore archived asset |
| PATCH | `/api/assets/:id/deactivate` | ✅ | Deactivate asset (irreversible) |
| DELETE | `/api/assets/:id/draft` | ✅ | Delete a draft asset |
| GET | `/api/assets/:id/activity` | ✅ | Asset activity log |
| GET | `/api/assets/:id/ownership` | ✅ | Current ownership splits |
| POST | `/api/assets/:id/ownership` | ✅ | Update ownership splits |

### Analytics & User

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics` | ✅ | Operator analytics summary |
| GET | `/api/user/activity` | ✅ | User activity log |
| PATCH | `/api/user/profile` | ✅ | Update profile |
| GET | `/api/subscription` | ✅ | Current subscription status |
| POST | `/api/create-subscription` | ✅ | Initiate Stripe subscription |

---

## 9. Pages & Routes

### Public Routes

| Route | Page | Description |
|---|---|---|
| `/` | `landing.tsx` | Marketing page with pricing model (shown when not logged in) |
| `/confirm/:contractId/:token` | `confirm-split.tsx` | Public split confirmation page for contributors |

### Authenticated Routes (Operator)

| Route | Page | Description |
|---|---|---|
| `/` | `dashboard.tsx` | Operator command centre |
| `/clients` | `clients.tsx` | Client list and management |
| `/clients/:id` | `client-detail.tsx` | Single client detail |
| `/projects` | `projects.tsx` | Project pipeline |
| `/projects/:id` | `project-detail.tsx` | Split editor + send confirmations |
| `/contracts` | `contracts.tsx` | Music agreements list |
| `/contracts/:id` | `contract-details.tsx` | Agreement detail view |
| `/contracts/:id/edit` | `contract-edit.tsx` | Edit agreement fields |
| `/contract/:type` | `contract-form.tsx` | Create new agreement by template type |
| `/templates` | `templates.tsx` | Browse contract templates |
| `/ownership` | `ownership.tsx` | Rights Ledger — active assets |
| `/ownership/:id` | `ownership.tsx` | Rights Ledger — specific asset detail |
| `/analytics` | `analytics.tsx` | Usage analytics |
| `/billing` | `billing.tsx` | Subscription and billing management |
| `/subscribe` | `subscribe.tsx` | Stripe checkout flow |
| `/profile` | `profile.tsx` | Operator profile settings |
| `/notifications` | `notifications.tsx` | System notifications |
| `/admin` | `admin.tsx` | Admin panel (restricted) |

---

## 10. Authentication

Authentication is handled via **Replit OIDC** (OpenID Connect) in production, with a **local development** bypass.

### Production (Replit OIDC)

```
User clicks "Sign In"
  → GET /api/login
    → Redirect to Replit auth
      → Callback to /api/callback
        → Passport verifies ID token
          → upsertUser() creates or updates user record
            → Session cookie set → redirect to /
```

### Local development

Set in `.env`:

```
LOCAL_DEV=true
NODE_ENV=development
SESSION_SECRET=your-local-secret
DATABASE_URL=postgresql://...
APP_URL=http://localhost:5000
```

Then visit `http://localhost:5000/api/login` for automatic dev operator login.

- Sessions are stored in PostgreSQL via `connect-pg-simple`
- All authenticated routes use the `isAuthenticated` middleware
- `req.user.claims.sub` is the operator identifier throughout the system

---

## 11. Billing & Stripe Integration

Stripe handles all payment processing.

### Subscription Tiers

| Key | Stripe Product | Price |
|---|---|---|
| `free` | (no Stripe product) | $0 |
| `session` | Session billing | $25 CAD per session |
| `pro` | Multi-Creator | $50–75 CAD quote |
| `creator_pro` | Creator Pro | $15 CAD/month |
| `studio_pro` | Studio Pro | $49 CAD/month |

### Flow

1. User selects a paid plan on `/billing`
2. Redirected to `/subscribe?plan={key}`
3. Stripe Elements payment form collects card
4. On success → `updateUserStripeInfo()` stores `stripeCustomerId` and `stripeSubscriptionId`
5. Webhooks update subscription status on renewal / cancellation

### Environment Variables Required

```
STRIPE_SECRET_KEY
VITE_STRIPE_PUBLIC_KEY
```

---

## 12. PDF Generation

Agreements are exported client-side using **jsPDF**.

The PDF generator (`client/src/lib/pdfGenerator.ts` or equivalent) outputs:
- Agreement title and type
- All filled dynamic fields
- Party names, roles, and contact info
- Signature/confirmation entries with timestamps
- SplitSheet platform footer
- Filename: `{title}_agreement.pdf`

No server-side PDF rendering — all generation happens in the browser and the file is downloaded directly.

---

## 13. Environment Variables

Copy `.env.example` to `.env` and fill in values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon) — or `NEON_DATABASE_URL` |
| `SESSION_SECRET` | ✅ | Secret for Express session signing |
| `APP_URL` | ✅ | Public app URL (used in confirmation links) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `VITE_STRIPE_PUBLIC_KEY` | ✅ | Stripe publishable key |
| `OPENAI_API_KEY` | Recommended | Enables live CoPilot AI replies |
| `OPENAI_MODEL` | Optional | Default: `gpt-4o-mini` |
| `LOCAL_DEV` | Local only | `true` for auto-login at `/api/login` |
| `PORT` | Optional | Default: `5000` |
| `REPL_ID`, `REPLIT_DOMAINS`, `ISSUER_URL` | Production | Replit OIDC (disable `LOCAL_DEV` in production) |

### Production launch checklist

- [ ] `SESSION_SECRET` — strong random string (never use dev default)
- [ ] `APP_URL` — public HTTPS URL
- [ ] `LOCAL_DEV=false` and `NODE_ENV=production`
- [ ] `OPENAI_API_KEY` for CoPilot
- [ ] Stripe webhooks configured
- [ ] Replit OIDC credentials set

---

## 14. Running Locally

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env   # Windows: copy .env.example .env

# Start development server (frontend + backend on port 5000)
npm run dev
```

Open **http://localhost:5000** and log in at **http://localhost:5000/api/login** (with `LOCAL_DEV=true`).

The Vite dev server and Express backend both run on **port 5000**. API calls from the frontend proxy automatically — do not change the Vite config.

### Database Setup

Tables are created automatically on first run via the storage layer, or can be set up with:

```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
// Run CREATE TABLE IF NOT EXISTS statements
"
```

Or push schema with Drizzle Kit:

```bash
npx drizzle-kit push
```

---

## 15. Project Structure

```
client/src/
├── components/
│   ├── ConfirmationTracker.tsx   # Tracks confirmation status per contract
│   ├── ContractCard.tsx          # Agreement card for list views
│   ├── ContractForm.tsx          # Dynamic template form renderer
│   ├── SoundLedgerCopilot.tsx    # Floating AI assistant (global)
│   ├── UserAvatar.tsx            # Logged-in user menu + initials
│   ├── WorkflowBanner.tsx        # B2B2C pipeline checklist on dashboard
│   ├── OnboardingWalkthrough.tsx # First-run guided tour
│   ├── CWRExport.tsx             # CWR format export for PROs (component ready)
│   ├── IdentityVerification.tsx  # Identity verification UI (component ready)
│   ├── Logo.tsx                  # SplitSheet logo component
│   ├── NavESignButton.tsx        # Nav-level e-sign trigger button
│   ├── ObjectUploader.tsx        # File upload to object storage
│   ├── OperatorLayout.tsx        # Sidebar layout for all auth pages
│   ├── PROSelector.tsx           # PRO organization selector input
│   ├── QuickActionModal.tsx      # Quick action sheet trigger
│   ├── SignatureCanvas.tsx       # Draw/type signature input
│   ├── StatCard.tsx              # Dashboard stat display card
│   ├── TypingIndicator.tsx       # Chat typing indicator
│   └── ui/                       # Shadcn/UI component library
│
├── pages/
│   ├── landing.tsx               # Public marketing + pricing page
│   ├── dashboard.tsx             # Operator command centre
│   ├── clients.tsx               # Client list and management
│   ├── client-detail.tsx         # Single client detail view
│   ├── projects.tsx              # Project pipeline list
│   ├── project-detail.tsx        # Single project + split editor
│   ├── confirm.tsx               # Public contributor confirmation
│   ├── confirm-split.tsx         # Public split confirmation (contracts)
│   ├── contracts.tsx             # Music agreements list
│   ├── contract-details.tsx      # Agreement detail view
│   ├── contract-edit.tsx         # Edit agreement
│   ├── contract-form.tsx         # New agreement creation form
│   ├── templates.tsx             # Contract template browser
│   ├── ownership.tsx             # Rights Ledger
│   ├── billing.tsx               # Billing and subscription management
│   ├── subscribe.tsx             # Stripe checkout
│   ├── analytics.tsx             # Analytics dashboard
│   ├── profile.tsx               # User profile settings
│   ├── notifications.tsx         # Notification centre
│   ├── admin.tsx                 # Admin panel
│   └── not-found.tsx             # 404 page
│
server/
├── index.ts                      # Express app entry point
├── routes.ts                     # Core API route handlers
├── service-routes.ts             # B2B2C clients, projects, workflow
├── copilot-routes.ts             # CoPilot AI endpoints
├── confirmation-routes.ts        # Public confirmation links
├── replitAuth.ts                 # OIDC + local dev auth
├── storage.ts                    # IStorage + DatabaseStorage
├── env.ts / loadEnv.ts           # Environment configuration
└── db.ts                         # Drizzle DB connection (Neon)

shared/
└── schema.ts                     # All DB tables, insert schemas, TS types
```

---

## 16. SoundLedger CoPilot

SoundLedger CoPilot is an embedded AI assistant available on every authenticated page (floating button, bottom-right).

| Feature | Detail |
|---|---|
| **Backend** | `POST /api/copilot` — SSE streaming via OpenAI |
| **Model** | `gpt-4o-mini` (override with `OPENAI_MODEL`) |
| **Fallback** | Offline keyword responses when API key missing or quota exceeded |
| **Context** | Page-aware prompts + shared knowledge in `server/copilot-knowledge.ts` |
| **Safety** | System prompt instructs: no legal advice; recommend qualified lawyer |

CoPilot and onboarding walkthrough state:

- `sl_onboarding_completed` — walkthrough finished
- Restart tour: Navigation → **Restart Walkthrough**, or dashboard workflow banner

---

## 17. Launch Readiness

SplitSheet is positioned as a **workflow and documentation platform**, not a law firm.

### Ready for soft launch (with disclaimers)

| Area | Status |
|---|---|
| B2B2C operator → contributor workflow | ✅ Implemented |
| Split ownership validation (100%) | ✅ Implemented |
| Public confirmation links + IP/timestamp | ✅ Implemented |
| PRO / IPI metadata capture | ✅ Implemented |
| PDF export with disclaimer | ✅ Implemented |
| Terms & Privacy modals in Footer | ✅ In-app copy |
| CoPilot + onboarding | ✅ Implemented |

### Not yet ready (requires legal review or engineering)

| Area | Status |
|---|---|
| Lawyer-reviewed published Terms & Privacy | ⚠️ Draft only — finalize with counsel |
| Mandatory ToS acceptance at signup | ❌ Not enforced |
| PIPEDA/GDPR data export & deletion flows | ❌ Not implemented |
| CWR export wired into UI | ⚠️ Component exists, not mounted |
| Identity verification (KYC) for signing | ⚠️ Component exists, simulated SMS |
| “Legally binding under ESIGN” marketing | ⚠️ Requires jurisdiction-specific legal review |

**Recommended before public launch:** Ontario entertainment/IP counsel + privacy counsel review; publish final Terms/Privacy; require acceptance at login; wire CWR export on confirmed projects.

---

## Legal Notice

SplitSheet is a **workflow and documentation platform**, not a law firm or legal service. Documents generated by SplitSheet do not constitute legal advice. Users are responsible for ensuring their agreements comply with applicable law. For legally binding contracts, consult a qualified entertainment lawyer.

Terms of Service and Privacy Policy are accessible from the in-app Footer. Governing law: **Ontario, Canada**.

---

*SplitSheet · SoundLedger Technologies · Built in Canada*
