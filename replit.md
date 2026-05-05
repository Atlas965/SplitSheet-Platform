# Overview

SplitSheet is a professional music contract management platform designed specifically for indie artists, producers, and music industry professionals. The application enables users to create, manage, and digitally sign various types of music contracts including split sheet agreements, performance contracts, producer agreements, and management contracts. Built with a full-stack architecture, it provides lawyer-informed contract templates with customizable fields and automated PDF generation capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Routing**: Wouter for lightweight client-side routing with support for authentication-protected routes
- **UI Framework**: Shadcn/UI components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build System**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Language**: TypeScript for end-to-end type safety
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage for scalable session handling
- **File Structure**: Monorepo approach with shared schema definitions between client and server

## Authentication System
- **Provider**: Replit OIDC (OpenID Connect) for seamless authentication in the Replit environment
- **Strategy**: Passport.js with custom OpenID Connect strategy
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Authorization**: Route-level protection with middleware-based authentication checks

## Database Design
- **Schema Definition**: Centralized in shared/schema.ts using Drizzle ORM
- **Key Tables**: 
  - Users with subscription management and Stripe integration
  - Contract templates with JSON-based flexible field definitions
  - Contracts with collaborative features and status tracking
  - Contract collaborators and signatures for multi-party agreements
- **Migration Strategy**: Drizzle Kit for schema migrations and database management

## API Architecture
- **Pattern**: RESTful endpoints with consistent error handling and response formats
- **Validation**: Zod schemas for request/response validation shared between client and server
- **Error Handling**: Centralized error middleware with structured error responses
- **Logging**: Request/response logging with performance metrics

## Contract Management System
- **Template Engine**: JSON-based contract templates with configurable field types (text, date, array, select, textarea)
- **Document Generation**: jsPDF for client-side PDF generation with custom formatting
- **Collaboration**: Multi-user contract creation with role-based permissions
- **Status Tracking**: Contract lifecycle management (draft, pending, signed)

# External Dependencies

## Database Services
- **Neon Database**: PostgreSQL hosting with serverless architecture for scalable database operations
- **Connection Pooling**: Neon's serverless connection pooling for efficient database connections

## Payment Processing
- **Stripe**: Complete payment infrastructure including customer management, subscription billing, and payment processing
- **Integration**: Stripe Elements for secure payment forms and subscription management

## Authentication Services
- **Replit OIDC**: OpenID Connect provider for seamless authentication within the Replit ecosystem
- **Session Management**: PostgreSQL-backed session storage with connect-pg-simple

## Development Tools
- **Replit Platform**: Integrated development environment with built-in hosting and deployment
- **Vite Plugins**: Replit-specific plugins for error overlay, cartographer, and development banner

## UI and Styling
- **Radix UI**: Comprehensive component library for accessible, unstyled UI primitives
- **Tailwind CSS**: Utility-first CSS framework with custom design system variables
- **FontAwesome**: Icon library for consistent iconography throughout the application

## PDF Generation
- **jsPDF**: Client-side PDF generation for contract documents with custom formatting and legal compliance features

# Recent Changes

## Phase 1 — "Music Agreements" Rename (UI Text Only)
- Landing page headline and CTA: "Professional Music Agreements Made Simple" / "Start Creating Music Agreements"
- Contracts list page: header, buttons, empty state, delete dialog — all say "Music Agreements" / "agreement"
- Dashboard: stat cards ("Total Agreements", "Agreements Completed"), Quick Actions ("Create New Agreement"), nav button
- Templates page: header and subheading
- PDF generator: footer text and filenames use `_agreement.pdf`
- All internal API routes and DB tables remain unchanged (`/api/contracts`, `contracts` table)

## Phase 2 — Rights Ledger Expansion
- **Schema**: Added `iswc`, `type`, `archivedAt`, `archivedBy`, `deactivatedAt`, `deletedAt` columns to `song_assets`; created `asset_activity_logs` and `asset_permissions` tables
- **Storage**: Added `getSongAssetsByStatus`, `archiveSongAsset`, `restoreSongAsset`, `deactivateSongAsset`, `deleteDraftSongAsset`, `logAssetActivity`, `getAssetActivityLog` methods
- **API Routes**: `GET /api/assets/archived`, `PATCH /api/assets/:id/archive`, `PATCH /api/assets/:id/restore`, `PATCH /api/assets/:id/deactivate`, `DELETE /api/assets/:id/draft`, `GET /api/assets/:id/activity`
- **ownership.tsx**: Full rewrite — Active/Archived tabs, per-asset actions dropdown (Archive, Deactivate, Restore, Delete Draft), confirmation modals with legal copy, activity log panel, ISWC field in add-asset form, status badges, asset type selector, revenue-by-source summary bars, deactivated-asset notice, restore button

## Phase 3 — "SplitSheet as a Service" (Operator Model)

### Architecture Pivot
Transformed from self-serve SaaS to operator-managed service business. The software now functions as an internal operations tool for the service provider (operator), not as a self-serve product for end users.

### New Entities (DB + Schema)
- **`clients`** — Artists, producers, groups, songwriters, and labels the operator serves. Fields: name, email, phone, type, notes.
- **`service_projects`** — Per-song split sheet jobs. Fields: title, songTitle, clientId, status (draft / pending_confirmation / confirmed / archived), notes.
- **`project_contributors`** — People with ownership stakes. Fields: name, email, role, PRO, IPI, ownershipPercentage, confirmationToken (unique), confirmedAt, confirmationIp.

### Service Workflow
Client Intake → Split Setup → Confirmation → Record Storage
1. Operator adds client → creates project → adds contributors with ownership %
2. Ownership must total exactly 100% (validated in UI + enforcement)
3. Operator clicks "Generate Confirmation Links" — each contributor gets a unique token-based URL
4. Contributors visit their link (no auth required), review the split, check a box, and confirm
5. When all contributors confirm, project auto-advances to "confirmed" status

### New API Routes
- `GET/POST /api/clients` — list and create clients
- `GET/PATCH/DELETE /api/clients/:id` — client detail management
- `GET /api/clients/:id/projects` — projects for a specific client
- `GET/POST /api/projects` — list and create projects
- `GET/PATCH/DELETE /api/projects/:id` — project detail management
- `GET/POST /api/projects/:id/contributors` — contributor management
- `PATCH/DELETE /api/projects/:projectId/contributors/:id` — edit/remove contributor
- `POST /api/projects/:id/send-confirmations` — generate tokens, return confirmation URLs
- `GET/POST /api/confirm/:token` — **public** (no auth) — view and submit confirmation

### New Pages
- **`/clients`** — Client management: grid view, type filtering, search, add/edit/delete
- **`/clients/:id`** — Client detail: stats, all associated projects
- **`/projects`** — Project pipeline: status filter tabs (Draft/Pending/Confirmed/Archived), search, create new
- **`/projects/:id`** — Project detail: split sheet editor, contributor management with ownership validation, confirmation link generator, existing token display with copy buttons, project timeline
- **`/confirm/:token`** — **Public confirmation page** (no auth): contributor views split, checks agreement box, submits confirmation. Time-stamped, IP-logged.

### New Components
- **`OperatorLayout.tsx`** — Persistent sidebar layout for all authenticated pages. Sidebar nav: Dashboard, Clients, Projects, Music Agreements, Rights Ledger. Mobile-responsive with overlay drawer. User menu at bottom.

### Dashboard Restructure
- Command-center view: Client count, Active Projects, Pending Confirmations, Confirmed stats
- Recent Projects pipeline list with status badges
- Pending confirmations alert banner
- Quick Actions sidebar (New Project, Add Client, Music Agreements, Rights Ledger)
- Recent Clients sidebar
- Recent Agreements sidebar

### What Was Kept
- Auth system (Replit OIDC) — operator logs in
- Music Agreements (contracts/templates) — document storage, unchanged
- Rights Ledger (song assets, ownership, revenue) — unchanged, accessible via sidebar
- Stripe/billing infrastructure — still present but de-emphasized (accessible via user menu)

### What Was De-emphasized
- Subscription billing UI removed from main nav (still accessible via user menu → Billing)
- Self-serve onboarding removed from primary flow
- Complex match/negotiation features accessible but not in primary sidebar