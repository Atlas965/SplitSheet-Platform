# SplitSheet — Workflow-Driven Rights Management Platform

> Built by **SoundLedger Technologies Inc.** · Canadian copyright principles · Operator-managed Rights-as-a-Service (RaaS)

### View this docs README online

| Format | URL |
| --- | --- |
| **GitHub page** | https://github.com/Atlas965/SplitSheet-Platform/blob/main/docs/README.md |
| **Raw markdown** | https://raw.githubusercontent.com/Atlas965/SplitSheet-Platform/main/docs/README.md |
| **Root README** | https://github.com/Atlas965/SplitSheet-Platform/blob/main/README.md |
| **Root README (raw)** | https://raw.githubusercontent.com/Atlas965/SplitSheet-Platform/main/README.md |
| **Repository** | https://github.com/Atlas965/SplitSheet-Platform |

SplitSheet is a full-stack music rights platform for operators (producers, studios, publishers, labels) who manage documentation and rights administration on behalf of artists — not a self-serve split-sheet app. It combines a **16-stage workflow engine**, **Operations Copilot** (SOP-aware guidance), rights validation, agreement recommendations, internal review, contributor confirmation, Rights Ledger sync, Catalog Intelligence, and the Rights Graph.

Canonical product docs: **[PRODUCT.md](./PRODUCT.md)** · **[WORKFLOW_ARCHITECTURE.md](./WORKFLOW_ARCHITECTURE.md)** · **[OPS_COPILOT.md](./OPS_COPILOT.md)** · root [README.md](../README.md)

---

## Table of Contents

1. [Product Overview](#1-product-overview) · **[PRODUCT](./PRODUCT.md)** · **[Workflow](./WORKFLOW_ARCHITECTURE.md)** · **[Ops Copilot](./OPS_COPILOT.md)** · **[Rights Graph](./RIGHTS_GRAPH.md)** · **[Security](./SECURITY_ARCHITECTURE.md)** · **[Legal Review](./LEGAL_REVIEW_PACKAGE.md)** · **[Commercial Readiness](./COMMERCIAL_READINESS.md)** · **[Final Report](./FINAL_IMPLEMENTATION_REPORT.md)**
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

---

## 1. Product Overview

SplitSheet operates as an **internal operations tool** for a music service business. The operator logs in and manages everything — clients, projects, contributors, and agreements — on behalf of the people they work with. End contributors (artists, producers, co-writers) interact only via a public confirmation link; they never need an account.

### Core Systems

| System | What It Does |
|---|---|
| **Ops Center** | Dashboard widgets for confirmations, reviews, validation errors, bottlenecks, throughput |
| **Workflow Engine** | 16-stage project lifecycle with audit log, stage statuses, wizard drafts |
| **Project Wizard** | Guided intake at `/projects/new` with auto-save |
| **Rights Validation** | Critical / Warning / Passed — blocks send/sign on criticals |
| **Template Recommendation** | Infers required agreements from contributor roles |
| **Internal Review Queue** | Approve before external confirmation (`/review-queue`) |
| **Operations Copilot** | SOP-aware next-step guidance + LLM explain; escalations; audit — see [OPS_COPILOT.md](./OPS_COPILOT.md) |
| **SOP Library** | Versioned SPLIT-001…016 procedures at `/sops` |
| **Client Management** | CRM-lite for artists, producers, labels, and songwriters |
| **Service Projects** | Per-song jobs (contracts) from intake through ledger sync |
| **Contributor Confirmation** | Token-based public links — no contributor account required |
| **Music Agreements** | Split sheets, producer, performance, management templates |
| **Rights Ledger** | Song ownership, master/composition, license readiness, archive |
| **Billing** | Stripe-backed subscription and session-based payment handling |

---

## 2. Architecture

### Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript, Wouter routing, Shadcn/UI + Radix + Tailwind CSS |
| **Backend** | Node.js + Express.js, TypeScript |
| **Database** | PostgreSQL (Neon serverless) + Drizzle ORM |
| **Auth** | Replit OIDC via Passport.js |
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
│   ├── index.ts      # Entry point
│   ├── routes.ts     # All API route handlers
│   ├── storage.ts    # IStorage interface + DatabaseStorage class
│   ├── auth.ts       # Passport / OIDC setup
│   └── db.ts         # Drizzle DB connection
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

Process-centric **16-stage lifecycle** (see [WORKFLOW_ARCHITECTURE.md](./WORKFLOW_ARCHITECTURE.md)):

```
Client Intake → Identity Verification → Project Creation → Song Metadata
→ Contributors → Rights Validation → Template Recommendation → Agreement Generation
→ Internal Review → Approval → Contributor Confirmation → E-Signatures
→ Rights Ledger Registration → Royalty Preparation → PRO Export → Completed
```

**Day-to-day path**

1. Dashboard **Ops Center** — see blockers and throughput  
2. **Project Wizard** (`/projects/new`) — guided intake, auto-save  
3. **Rights validation** must clear criticals before send/review  
4. **Review queue** (`/review-queue`) — approve before external links  
5. **Send confirmations** — public token URLs (`/confirm/{contractId}/{token}`)  
6. After signed — **ledger sync** registers the asset automatically  

Legacy banner still shows: Client Intake → Split Setup → Confirmation → Ledger.

Contract status compatibility: `draft` → `pending` → `signed` (aliased as confirmed in project APIs).

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

### Service Business — Clients

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/clients` | ✅ | List operator's clients |
| POST | `/api/clients` | ✅ | Create a new client |
| GET | `/api/clients/:id` | ✅ | Get client details |
| PATCH | `/api/clients/:id` | ✅ | Update client |
| DELETE | `/api/clients/:id` | ✅ | Delete client |
| GET | `/api/clients/:id/projects` | ✅ | List projects for a client |

### Service Business — Projects

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/workflow/status` | ✅ | Legacy 4-stage pipeline health |
| GET | `/api/projects` | ✅ | List operator's projects |
| GET | `/api/projects/:id` | ✅ | Get project + workflow stage |
| PATCH | `/api/projects/:id` | ✅ | Update project |
| GET | `/api/projects/:id/contributors` | ✅ | List contributors |
| POST | `/api/projects/:id/contributors` | ✅ | Add a contributor |
| PATCH | `/api/projects/:id/contributors/:contribId` | ✅ | Edit a contributor |
| DELETE | `/api/projects/:id/contributors/:contribId` | ✅ | Remove a contributor |
| POST | `/api/projects/:id/send-confirmations` | ✅ | Generate links (blocked on critical validation) |

### Workflow Engine

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/ops/dashboard` | ✅ | Ops Center aggregates |
| GET | `/api/projects/:id/workflow` | ✅ | Stage timeline + events |
| POST | `/api/projects/:id/workflow/advance` | ✅ | Advance stage |
| PUT | `/api/projects/:id/workflow/wizard` | ✅ | Auto-save wizard draft |
| GET | `/api/projects/:id/rights-validation` | ✅ | Run validation engine |
| GET | `/api/projects/:id/recommended-agreements` | ✅ | Role → agreement inference |
| POST | `/api/projects/:id/workflow/submit-review` | ✅ | Enter review queue |
| GET | `/api/review-queue` | ✅ | List reviews |
| PATCH | `/api/review-queue/:id` | ✅ | Approve / revise / comment |
| POST | `/api/projects/:id/workflow/sync-ledger` | ✅ | Sync signed agreement → ledger |

### Operations Copilot & SOPs

See **[OPS_COPILOT.md](./OPS_COPILOT.md)** for architecture and safety boundaries.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/sops` | ✅ | List active SOPs |
| GET | `/api/sops/:code` | ✅ | SOP detail + versions |
| POST | `/api/ops-copilot/recommend` | ✅ | Deterministic next-step recommendation |
| GET | `/api/ops-copilot/briefing` | ✅ | Daily ops briefing |
| POST | `/api/escalations` | ✅ | Create escalation |
| POST | `/api/copilot` | ✅ | LLM chat (SOP + project aware) |

### Contributor Confirmation (Public)

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/confirm/:contractId/:token` | ❌ Public | Load confirmation page data |
| POST | `/api/confirm/:contractId/:token` | ❌ Public | Submit confirmation (timestamp + IP) |

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
| `/` | `dashboard.tsx` | Ops Center + workflow banner |
| `/clients` | `clients.tsx` | Client list and management |
| `/projects` | `projects.tsx` | Project pipeline |
| `/projects/new` | `project-wizard.tsx` | Guided project wizard |
| `/projects/:id/wizard` | `project-wizard.tsx` | Resume wizard |
| `/projects/:id` | `project-detail.tsx` | Split editor + confirmations |
| `/review-queue` | `review-queue.tsx` | Internal review queue |
| `/sops` | `sop-library.tsx` | Operations SOP library |
| `/sops/:code` | `sop-library.tsx` | Single SOP viewer |
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

Authentication is handled via **Replit OIDC** (OpenID Connect).

```
User clicks "Sign In"
  → GET /api/login
    → Redirect to Replit auth
      → Callback to /api/callback
        → Passport verifies ID token
          → upsertUser() creates or updates user record
            → Session cookie set → redirect to /
```

- Sessions are stored in PostgreSQL via `connect-pg-simple`
- All authenticated routes use the `isAuthenticated` middleware
- The `req.user.claims.sub` value is the Replit user ID used as the primary operator identifier throughout the system

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

Set these in your Replit Secrets or `.env` file:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon) |
| `PGHOST` | ✅ | Postgres host |
| `PGPORT` | ✅ | Postgres port |
| `PGDATABASE` | ✅ | Database name |
| `PGUSER` | ✅ | Database user |
| `PGPASSWORD` | ✅ | Database password |
| `SESSION_SECRET` | ✅ | Secret for Express session signing |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (live or test) |
| `VITE_STRIPE_PUBLIC_KEY` | ✅ | Stripe publishable key (exposed to frontend) |
| `TESTING_STRIPE_SECRET_KEY` | Optional | Stripe test key for development |
| `TESTING_VITE_STRIPE_PUBLIC_KEY` | Optional | Stripe test publishable key |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Optional | Replit object storage bucket |
| `PRIVATE_OBJECT_DIR` | Optional | Object storage private directory path |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Optional | Object storage public search paths |

---

## 14. Running Locally

```bash
# Install dependencies
npm install

# Start development server (frontend + backend on port 5000)
npm run dev
```

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
│   ├── CWRExport.tsx             # CWR format export for PROs
│   ├── EditOwnershipModal.tsx    # Modal for updating ownership splits
│   ├── Footer.tsx                # Shared page footer
│   ├── IdentityVerification.tsx  # Identity verification UI
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
├── routes.ts                     # All API route handlers (~1500 lines)
├── storage.ts                    # IStorage interface + DatabaseStorage
├── auth.ts                       # Replit OIDC + Passport config
└── db.ts                         # Drizzle DB connection (Neon)

shared/
└── schema.ts                     # All DB tables, insert schemas, TS types
```

---

## Legal Notice

SplitSheet is a **workflow and documentation platform**, not a law firm or legal service. Documents generated by SplitSheet do not constitute legal advice. Users are responsible for ensuring their agreements comply with applicable law. For legally binding contracts, consult a qualified entertainment lawyer.

---

*SplitSheet · SoundLedger Technologies inc · Built in Canada*
