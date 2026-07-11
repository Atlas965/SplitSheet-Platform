# SoundLedger Co-pilot Knowledge Base

## 1. Platform Overview
SplitSheet is a full-stack music industry platform that combines split sheet management, contributor confirmation workflows, rights ledger tracking, and document generation into one operator-controlled system. It is designed as an internal operations tool for music service businesses, where the operator manages everything on behalf of their clients. End contributors (artists, producers, co-writers) interact only via a public confirmation link, requiring no account.

## 2. Core Systems
*   **Operator Dashboard:** Command-centre view of all clients, active projects, and pending confirmations.
*   **Client Management:** CRM-lite for artists, producers, labels, and songwriters the operator serves.
*   **Service Projects:** Per-song split sheet jobs from intake to confirmed record.
*   **Contributor Confirmation:** Token-based public links for each contributor — no authentication required.
*   **Music Agreements:** Create, manage, and sign legal document templates (split sheets, producer deals, etc.).
*   **Rights Ledger:** Track song asset ownership, archive/deactivate assets, log activity.
*   **Billing:** Stripe-backed subscription and session-based payment handling.

## 3. Core Workflow Implementation
The operator service workflow is a linear four-stage pipeline:
1.  **Client Intake:** Operator creates or selects a Client (artist, producer, songwriter, or label). Client stores contact info and type.
2.  **Split Setup (Project):** Operator creates a Service Project linked to the client, sets song title, and adds Contributors (name, email, role, PRO, IPI, ownership %). UI must validate that ownership percentages total exactly 100%.
3.  **Generate Confirmation Links:** Operator clicks "Generate Confirmation Links." Each contributor receives a unique URL. Project status advances to pending_confirmation. Links can be sent via any channel.
4.  **Contributor Confirmation:** Contributor visits their link (no account required), sees the split breakdown, checks an agreement checkbox, and clicks confirm. Confirmation is timestamped and IP-logged server-side. When all contributors confirm, the project auto-advances to confirmed.

**Project Status Flow:** draft ──> pending_confirmation ──> confirmed (can be archived) ──> archived

## 4. Music Agreements System
Supports four contract types, each backed by a JSON template:
*   **Split Sheet:** Contributors, ownership %, PRO info, song metadata
*   **Performance Agreement:** Venue, date, fee, technical rider
*   **Producer Agreement:** Producer fee, royalty %, delivery terms
*   **Management Agreement:** Commission rate, term length, scope

**Lifecycle:**
1.  Operator selects a template → fills in dynamic fields via form UI.
2.  Contract saved as draft.
3.  Collaborators added (by email).
4.  Contract sent → status becomes pending.
5.  Each collaborator receives a confirmation link and signs.
6.  When all parties confirm → status becomes signed.
7.  PDF export available at any stage.

## 5. Rights Ledger
The Rights Ledger (/ownership) is a persistent asset registry for tracking song ownership over time.
**Song Asset Lifecycle:** active ──> archived (reversible) ──> deactivated (irreversible)
**Features:**
*   Active / Archived tabs for filtered views.
*   ISWC field for International Standard Musical Work Codes.
*   Asset type selector (original / cover / sample-based / arrangement).
*   Activity log (timestamped audit trail of every action).
*   Revenue-by-source bars (visual breakdown of revenue).
*   Ownership split history (full versioned record of ownership changes).
*   Per-asset action menu (Archive, Restore, Deactivate, Delete Draft).

## 6. UI/UX Onboarding Walkthrough (First-Run)
*   **Phase 1: The Welcome & Orientation (Dashboard)**
    *   Welcome to SoundLedger SplitSheet: "Welcome, Operator! You're now in your Command Center. From here, you'll manage clients, track song assets, and finalize legally-binding music agreements. Ready to start your first project?"
    *   The Operator Dashboard: "Monitor your business at a glance. Track active projects, pending signatures, and confirmed agreements across your entire roster."
    *   Your First Step: "Start here. A Project is the workspace where you'll define song splits and invite collaborators to sign."
*   **Phase 2: Building the Workspace (Projects & Clients)**
    *   Client Intake: "Assign this project to a Client (Artist, Producer, or Label). If they're new, you can add them to your CRM directly from here."
    *   The Contributor Registry: "Add everyone with an ownership stake. Pro Tip: Use the 'One-Click Equal Split' for fast, amicable negotiations."
*   **Phase 3: Legal Integrity (Agreements & Signatures)**
    *   Choosing the Right Template: "Select the right tool for the job. Use a Split Sheet for songwriting, a Producer Agreement for beat licensing, or a Performance Agreement for live bookings."
    *   Industry Standard Metadata: "Ensure accurate royalty collection by entering PRO affiliations (e.g., SOCAN, ASCAP) and IPI numbers. This ensures the right people get paid."
    *   The Zero-Friction Confirmation: "Ready to sign? Generate unique links for your collaborators. They can sign from any device with no account required — maximizing your completion rate."
*   **Phase 4: Long-Term Management (Rights Ledger)**
    *   Your Rights Ledger: "Once confirmed, song assets move here. This is your permanent, versioned record of ownership, ISWC codes, and revenue history."

## 7. Pricing Model
*   **Starter Access:** $0 (1 project, up to 2 contributors, full workflow)
*   **Pay-Per-Session:** $25 (Per completed session, up to 5 contributors)
*   **Multi-Creator Project:** $50–$75 (Up to 10 contributors, quote-based on complexity)
*   **Express Add-On:** +$25 (Priority processing, fast confirmation flow)
*   **Creator Pro:** $15/month (Unlimited sessions, project history, saved contributors, analytics)
*   **Studio Pro:** $49/month (Team management, role-based permissions, bulk exports, priority support)
*   **Enterprise:** Custom (Institutional licensing, white-label deployment, API access, bulk ingestion, compliance reporting, dedicated account management)

## 8. Legal Notice
SplitSheet is a workflow and documentation platform, not a law firm or legal service. Documents generated by SplitSheet do not constitute legal advice. Users are responsible for ensuring their agreements comply with applicable law. For legally binding contracts, consult a qualified entertainment lawyer.
