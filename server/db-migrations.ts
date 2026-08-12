/**
 * server/db-migrations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Idempotent bootstrap for tables that the security/compliance/verification
 * engines talk to via raw SQL (server/security.ts, security-routes.ts).
 * These are NOT modeled as Drizzle pgTable objects because the engine only
 * ever touches them through `db.execute(sql...)`, but they still need to
 * exist in Postgres before the app can use them.
 *
 * Runs once at server startup (see server/index.ts). Every statement is
 * `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so it is safe
 * to run on every boot and safe to run against a database that already has
 * these tables (e.g. after a manual `drizzle-kit push`).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Bootstraps every table defined in shared/schema.ts that isn't yet present
 * in the database, plus new columns added to pre-existing tables (Stripe
 * Connect + Terms-of-Service fields on `users`).
 *
 * Why this exists instead of relying solely on `drizzle-kit push`: this repo
 * targets a shared Neon database that multiple environments write to, and
 * `drizzle-kit push` requires an interactive/CLI step that isn't guaranteed
 * to have been run. Every statement below is additive and idempotent
 * (`CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`), so running it
 * on every boot is safe whether or not `drizzle-kit push` has also been run.
 */
export async function runCoreSchemaMigrations(): Promise<void> {
  // ── users: Stripe Connect + Terms of Service columns ───────────────────────
  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS stripe_connect_account_id varchar,
      ADD COLUMN IF NOT EXISTS stripe_connect_onboarded boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS terms_accepted_at timestamp,
      ADD COLUMN IF NOT EXISTS terms_version varchar;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS confirmations (
      id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id    varchar NOT NULL REFERENCES contracts(id),
      collaborator_id varchar NOT NULL REFERENCES contract_collaborators(id),
      status         varchar DEFAULT 'pending',
      token          varchar NOT NULL UNIQUE,
      expires_at     timestamp,
      confirmed_at   timestamp,
      ip_address     varchar,
      user_agent     text,
      notes          text,
      created_at     timestamp DEFAULT now(),
      updated_at     timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS song_assets (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      title       varchar NOT NULL,
      artist_name varchar,
      isrc        varchar,
      created_by  varchar NOT NULL REFERENCES users(id),
      contract_id varchar REFERENCES contracts(id),
      status      varchar DEFAULT 'active',
      metadata    jsonb,
      created_at  timestamp DEFAULT now(),
      updated_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`
    ALTER TABLE song_assets
      ADD COLUMN IF NOT EXISTS sl_song_id varchar UNIQUE;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ownership_records (
      id                   varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id             varchar NOT NULL REFERENCES song_assets(id),
      user_id              varchar NOT NULL REFERENCES users(id),
      ownership_percentage decimal(5,2) NOT NULL,
      role                 varchar NOT NULL,
      version              integer NOT NULL,
      change_reason        text,
      effective_at         timestamp DEFAULT now(),
      created_by           varchar NOT NULL REFERENCES users(id),
      created_at           timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`
    ALTER TABLE ownership_records
      ADD COLUMN IF NOT EXISTS ownership_type varchar DEFAULT 'composition',
      ADD COLUMN IF NOT EXISTS territory varchar,
      ADD COLUMN IF NOT EXISTS expiration_date timestamp;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS revenue_events (
      id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id     varchar NOT NULL REFERENCES song_assets(id),
      source       varchar NOT NULL,
      amount       decimal(12,2) NOT NULL,
      currency     varchar DEFAULT 'USD',
      description  text,
      period_start timestamp,
      period_end   timestamp,
      metadata     jsonb,
      created_at   timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payout_records (
      id                   varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      revenue_event_id     varchar NOT NULL REFERENCES revenue_events(id),
      user_id              varchar NOT NULL REFERENCES users(id),
      asset_id             varchar NOT NULL REFERENCES song_assets(id),
      ownership_percentage decimal(5,2) NOT NULL,
      amount               decimal(12,2) NOT NULL,
      currency             varchar DEFAULT 'USD',
      status               varchar DEFAULT 'pending',
      stripe_transfer_id   varchar,
      processed_at         timestamp,
      created_at           timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_balances (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id         varchar NOT NULL UNIQUE REFERENCES users(id),
      total_earned    decimal(12,2) DEFAULT '0',
      total_paid      decimal(12,2) DEFAULT '0',
      pending_balance decimal(12,2) DEFAULT '0',
      currency        varchar DEFAULT 'USD',
      updated_at      timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS split_confirmations (
      id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id        varchar NOT NULL REFERENCES contracts(id),
      collaborator_id    varchar NOT NULL REFERENCES contract_collaborators(id),
      token              varchar NOT NULL UNIQUE,
      status             varchar DEFAULT 'not_sent',
      sent_at            timestamp,
      confirmed_at       timestamp,
      expires_at         timestamp,
      confirmed_name     varchar,
      confirmed_email    varchar,
      confirmation_note  text,
      ip_address         varchar,
      user_agent         text,
      created_at         timestamp DEFAULT now(),
      updated_at         timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payment_events (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_event_id varchar NOT NULL UNIQUE,
      event_type      varchar NOT NULL,
      payload         jsonb,
      processed       boolean DEFAULT false,
      created_at      timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS error_logs (
      id         varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      level      varchar NOT NULL DEFAULT 'error',
      message    text NOT NULL,
      stack      text,
      route      varchar,
      user_id    varchar,
      metadata   jsonb,
      created_at timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rate_limit_buckets (
      bucket_key varchar PRIMARY KEY,
      count      integer NOT NULL DEFAULT 0,
      reset_at   timestamp NOT NULL
    );
  `);

  // ── organizations: enterprise multi-tenant workspaces ──────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      sl_org_id   varchar NOT NULL UNIQUE,
      name        varchar NOT NULL,
      type        varchar NOT NULL DEFAULT 'label',
      email       varchar,
      website     varchar,
      country     varchar,
      created_by  varchar NOT NULL REFERENCES users(id),
      is_active   boolean DEFAULT true,
      created_at  timestamp DEFAULT now(),
      updated_at  timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organization_members (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar NOT NULL REFERENCES organizations(id),
      user_id         varchar NOT NULL REFERENCES users(id),
      role            varchar NOT NULL DEFAULT 'member',
      invited_by      varchar REFERENCES users(id),
      created_at      timestamp DEFAULT now(),
      UNIQUE (organization_id, user_id)
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members (organization_id);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members (user_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organization_api_keys (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar NOT NULL REFERENCES organizations(id),
      name            varchar NOT NULL,
      key_hash        varchar NOT NULL UNIQUE,
      key_prefix      varchar NOT NULL,
      scopes          text[] NOT NULL DEFAULT '{}',
      created_by      varchar NOT NULL REFERENCES users(id),
      last_used_at    timestamp,
      revoked_at      timestamp,
      created_at      timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_org_api_keys_org ON organization_api_keys (organization_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      varchar REFERENCES users(id),
      channel      varchar NOT NULL DEFAULT 'email',
      destination  varchar NOT NULL,
      code_hash    varchar NOT NULL,
      purpose      varchar NOT NULL DEFAULT 'identity_verification',
      legal_name   varchar,
      id_type      varchar,
      attempts     integer NOT NULL DEFAULT 0,
      consumed_at  timestamp,
      expires_at   timestamp NOT NULL,
      created_at   timestamp DEFAULT now()
    );
  `);

  // ── GLOBAL RIGHTS FRAMEWORK ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS rights_organizations (
      id                varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      name              varchar NOT NULL,
      territory         varchar NOT NULL,
      organization_type varchar NOT NULL DEFAULT 'pro',
      website           varchar,
      supported_rights  text[] NOT NULL DEFAULT '{}',
      created_at        timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS creators (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      sl_creator_id varchar NOT NULL UNIQUE,
      name        varchar NOT NULL,
      type        varchar NOT NULL DEFAULT 'songwriter',
      email       varchar,
      pro         varchar,
      ipi         varchar,
      isni        varchar,
      bio         text,
      website     varchar,
      created_by  varchar NOT NULL REFERENCES users(id),
      created_at  timestamp DEFAULT now(),
      updated_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_creators_created_by ON creators (created_by);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS creator_rights_profiles (
      id                 varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id            varchar NOT NULL UNIQUE REFERENCES users(id),
      ipi_number         varchar,
      pro_affiliation    varchar,
      territory          varchar DEFAULT 'CA',
      songwriter_status  boolean DEFAULT false,
      publisher_status   boolean DEFAULT false,
      created_at         timestamp DEFAULT now(),
      updated_at         timestamp DEFAULT now()
    );
  `);

  // ── MASTER VS COMPOSITION RIGHTS ───────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS composition_assets (
      id               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      song_asset_id    varchar NOT NULL UNIQUE REFERENCES song_assets(id),
      title            varchar NOT NULL,
      iswc             varchar,
      ownership_status varchar DEFAULT 'pending',
      created_at       timestamp DEFAULT now(),
      updated_at       timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS master_assets (
      id               varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      song_asset_id    varchar NOT NULL UNIQUE REFERENCES song_assets(id),
      recording_title  varchar NOT NULL,
      isrc             varchar,
      artist_owner     varchar,
      label_owner      varchar,
      distributor      varchar,
      release_date     timestamp,
      created_at       timestamp DEFAULT now(),
      updated_at       timestamp DEFAULT now()
    );
  `);

  // ── LICENSING READINESS SYSTEM ─────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS license_readiness (
      id                       varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      song_asset_id            varchar NOT NULL UNIQUE REFERENCES song_assets(id),
      ownership_complete       boolean DEFAULT false,
      contributor_confirmed    boolean DEFAULT false,
      agreements_complete      boolean DEFAULT false,
      metadata_complete        boolean DEFAULT false,
      sample_clearance_status  varchar DEFAULT 'pending',
      license_score            integer NOT NULL DEFAULT 0,
      last_checked_at          timestamp DEFAULT now()
    );
  `);

  // Seed the rights organizations reference table once (idempotent: skip if already populated).
  await db.execute(sql`
    INSERT INTO rights_organizations (name, territory, organization_type, website, supported_rights)
    SELECT * FROM (VALUES
      ('SOCAN',        'CA',    'pro',              'https://www.socan.com',      ARRAY['performance_rights']::text[]),
      ('CMRRA',        'CA',    'mro',              'https://www.cmrra.ca',       ARRAY['mechanical_rights']::text[]),
      ('Re:Sound',     'CA',    'neighboring_rights','https://resound.ca',        ARRAY['neighboring_rights']::text[]),
      ('ASCAP',        'US',    'pro',              'https://www.ascap.com',      ARRAY['performance_rights']::text[]),
      ('BMI',          'US',    'pro',              'https://www.bmi.com',        ARRAY['performance_rights']::text[]),
      ('SESAC',        'US',    'pro',              'https://www.sesac.com',      ARRAY['performance_rights']::text[]),
      ('SoundExchange','US',    'neighboring_rights','https://www.soundexchange.com', ARRAY['neighboring_rights']::text[]),
      ('PRS',          'UK',    'pro',              'https://www.prsformusic.com', ARRAY['performance_rights']::text[]),
      ('MCPS',         'UK',    'mro',              'https://www.prsformusic.com/mcps', ARRAY['mechanical_rights']::text[]),
      ('PPL',          'UK',    'neighboring_rights','https://www.ppluk.com',      ARRAY['neighboring_rights']::text[]),
      ('CISAC Member (EU)',    'EU',    'cmo', 'https://www.cisac.org', ARRAY['performance_rights','mechanical_rights']::text[]),
      ('CISAC Member (AU)',    'AU',    'cmo', 'https://www.cisac.org', ARRAY['performance_rights','mechanical_rights']::text[]),
      ('CISAC Member (Other)', 'OTHER', 'cmo', 'https://www.cisac.org', ARRAY['performance_rights','mechanical_rights']::text[])
    ) AS seed(name, territory, organization_type, website, supported_rights)
    WHERE NOT EXISTS (SELECT 1 FROM rights_organizations LIMIT 1);
  `);
}

// ─── LEGAL DOCUMENT VERSIONING & ACCEPTANCE (Priority 1.1) ──────────────────
// Counsel-editable ToS/Privacy/DPA/contributor-consent text, published via
// POST /api/legal/documents (see server/legal-routes.ts) instead of a code
// deploy. Seeds the pre-existing hardcoded Footer.tsx copy as version
// "2026-07-12" (matching the prior CURRENT_TERMS_VERSION constant) so no
// user is unexpectedly re-prompted the moment this ships, then backfills
// legal_acceptances from any pre-existing users.terms_accepted_at value.
const SEED_TOS_MARKDOWN = `SoundLedger Technologies Inc. – SplitSheet Product · Governing Law: Ontario, Canada

## 1. Acceptance of Terms
By accessing or using SplitSheet ("Platform"), you agree to these Terms. If you do not agree, do not use the Platform.

## 2. Platform Liability
SplitSheet acts solely as a platform to facilitate agreements and is **not a party to any agreement between users**. We are not responsible for disputes, performance, or enforcement of user-created agreements.

## 3. User Responsibility
Users are solely responsible for the **accuracy, legality, and enforceability** of the agreements they create.

## 4. As-Is Disclaimer
The Platform and all documents are provided **"as-is" without guarantees or warranties**, express or implied.

## 5. No Legal Advice
SplitSheet is **not a law firm** and does not provide legal advice. All templates, documents, and tools are provided for general informational purposes only and may not be suitable for every situation.

Users are strongly encouraged to seek **independent legal advice** from a qualified lawyer before entering into any agreement.

## 6. Intellectual Property
All content, logos, and trademarks on SplitSheet are the **exclusive property of SoundLedger Technologies Inc.**

## 7. Dispute Resolution
Disputes arising from use of the Platform will be resolved in the following order:
- Mutual negotiation
- Mediation
- Arbitration (costs shared equally)

## 8. Eligibility
- Must be 18+ or age of majority in your jurisdiction
- Must have authority to enter binding agreements

## 9. User Accounts & Content
- Maintain account security
- You own all uploaded content
- You grant SplitSheet a limited license to operate the platform

## 10. Payments & Subscriptions
- Fees may apply; payments are non-refundable unless required by law
- Pricing may change with notice

## 11. Termination
Accounts may be suspended or terminated for violating terms, fraudulent activity, or abuse.

## 12. Limitation of Liability
SplitSheet is **not liable for indirect or consequential damages**, and total liability is limited to fees paid in the last 12 months.

## 13. Changes
We may update these Terms; continued use constitutes acceptance.`;

const SEED_PRIVACY_MARKDOWN = `SoundLedger Technologies Inc. – SplitSheet Product · GDPR & Canadian Privacy Law Aligned

## 1. Information We Collect
- **Account info:** name, email, username
- **Contract data:** royalty splits, ownership percentages, agreement terms
- **Usage data:** device info, IP address, interaction data

## 2. How We Use Information
- Operate the platform
- Store agreements
- Improve user experience
- Ensure security

## 3. Data Sharing
We **do NOT sell user data**. We may share with cloud providers, payment processors, or legal authorities if required.

## 4. Data Storage & Security
- Stored securely with encryption
- Access controls and secure authentication

## 5. Your Rights (Canada / GDPR)
You have the right to access, correct, or request deletion of your data.

## 6. Data Retention
Retained while your account is active and as required for legal compliance.

## 7. Platform Liability
SplitSheet is **not responsible for the content or legality** of user-created agreements.

## 8. Children
Platform is not for users under 18.

## 9. Dispute Resolution
Privacy-related disputes follow: negotiation → mediation → arbitration (costs shared equally).

## 10. Changes
Policy updates may occur; continued use constitutes acceptance.`;

const SEED_LEGAL_VERSION = "2026-07-12";
const SEED_LEGAL_EFFECTIVE_DATE = "2026-07-12";

export async function runLegalDocumentMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS legal_documents (
      id             varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      doc_type       varchar NOT NULL,
      version        varchar NOT NULL,
      effective_date timestamp NOT NULL,
      markdown_body  text NOT NULL,
      published_by   varchar REFERENCES users(id),
      published_at   timestamp DEFAULT now(),
      UNIQUE (doc_type, version)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS legal_acceptances (
      id           varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      varchar NOT NULL REFERENCES users(id),
      doc_type     varchar NOT NULL,
      version      varchar NOT NULL,
      accepted_at  timestamp DEFAULT now(),
      ip_address   varchar,
      user_agent   varchar
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances (user_id);`);

  // Seed the initial ToS/Privacy versions once — matches the prior hardcoded
  // CURRENT_TERMS_VERSION so existing acceptances (backfilled below) remain valid.
  await db.execute(sql`
    INSERT INTO legal_documents (doc_type, version, effective_date, markdown_body)
    VALUES ('tos', ${SEED_LEGAL_VERSION}, ${SEED_LEGAL_EFFECTIVE_DATE}::timestamp, ${SEED_TOS_MARKDOWN})
    ON CONFLICT (doc_type, version) DO NOTHING;
  `);
  await db.execute(sql`
    INSERT INTO legal_documents (doc_type, version, effective_date, markdown_body)
    VALUES ('privacy', ${SEED_LEGAL_VERSION}, ${SEED_LEGAL_EFFECTIVE_DATE}::timestamp, ${SEED_PRIVACY_MARKDOWN})
    ON CONFLICT (doc_type, version) DO NOTHING;
  `);

  // Backfill legal_acceptances for every user who already accepted the old
  // single-column terms flag, so no one is re-prompted the moment this ships.
  // Safe to re-run: only inserts rows for users who don't already have one
  // for this exact (user_id, doc_type, version) combination.
  await db.execute(sql`
    INSERT INTO legal_acceptances (user_id, doc_type, version, accepted_at)
    SELECT u.id, 'tos', u.terms_version, u.terms_accepted_at
    FROM users u
    WHERE u.terms_accepted_at IS NOT NULL
      AND u.terms_version IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM legal_acceptances la
        WHERE la.user_id = u.id AND la.doc_type = 'tos' AND la.version = u.terms_version
      );
  `);
  // Users who accepted the old combined ToS+Privacy gate implicitly accepted
  // Privacy too — backfill the same acceptance row under doc_type='privacy'
  // at the seed version so they aren't re-prompted for the Privacy half either.
  await db.execute(sql`
    INSERT INTO legal_acceptances (user_id, doc_type, version, accepted_at)
    SELECT u.id, 'privacy', ${SEED_LEGAL_VERSION}, u.terms_accepted_at
    FROM users u
    WHERE u.terms_accepted_at IS NOT NULL
      AND u.terms_version = ${SEED_LEGAL_VERSION}
      AND NOT EXISTS (
        SELECT 1 FROM legal_acceptances la
        WHERE la.user_id = u.id AND la.doc_type = 'privacy' AND la.version = ${SEED_LEGAL_VERSION}
      );
  `);
}

export async function runSecurityEngineMigrations(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS split_versions (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id     varchar NOT NULL,
      version_number  integer NOT NULL,
      content_hash    varchar NOT NULL,
      prev_hash       varchar,
      status          varchar NOT NULL DEFAULT 'draft',
      collaborators   jsonb NOT NULL,
      total_pct       decimal(6,2) NOT NULL,
      created_by      varchar NOT NULL,
      signed_at       timestamp,
      locked_at       timestamp,
      lock_expires_at timestamp,
      created_at      timestamp DEFAULT now(),
      UNIQUE (contract_id, version_number)
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_split_versions_contract ON split_versions (contract_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS split_signatures (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      split_version_id uuid NOT NULL REFERENCES split_versions(id) ON DELETE CASCADE,
      contract_id      varchar NOT NULL,
      signer_name      varchar NOT NULL,
      signer_email     varchar NOT NULL,
      signer_title     varchar,
      signature_data   text NOT NULL,
      signature_hash   varchar NOT NULL,
      ip_address       inet,
      user_agent       text,
      mode             varchar NOT NULL DEFAULT 'draw',
      kyc_legal_name   varchar,
      kyc_id_type      varchar,
      kyc_phone_hash   varchar,
      kyc_verified_at  timestamp,
      signed_at        timestamp DEFAULT now(),
      UNIQUE (split_version_id, signer_email)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fraud_events (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id    varchar NOT NULL,
      user_id        varchar,
      rule_triggered text NOT NULL,
      risk_score     integer NOT NULL DEFAULT 0,
      action_taken   varchar NOT NULL,
      details        jsonb,
      resolved       boolean NOT NULL DEFAULT false,
      created_at     timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fraud_events_contract ON fraud_events (contract_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS contract_risk_profiles (
      contract_id        varchar PRIMARY KEY,
      current_score      integer NOT NULL DEFAULT 0,
      freeze_active       boolean NOT NULL DEFAULT false,
      freeze_reason       text,
      version_changes     integer NOT NULL DEFAULT 0,
      rapid_change_flag   boolean NOT NULL DEFAULT false,
      last_change_at      timestamp,
      updated_at          timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id       varchar,
      api_key_id    uuid,
      action        varchar NOT NULL,
      resource_type varchar,
      resource_id   varchar,
      before_state  jsonb,
      after_state   jsonb,
      ip_address    inet,
      user_agent    text,
      request_id    varchar,
      created_at    timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log (user_id, created_at DESC);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id     varchar NOT NULL,
      key_hash     varchar NOT NULL UNIQUE,
      key_prefix   varchar NOT NULL,
      name         varchar NOT NULL,
      scopes       text[] NOT NULL DEFAULT '{}',
      rate_limit   integer NOT NULL DEFAULT 100,
      is_active    boolean NOT NULL DEFAULT true,
      last_used_at timestamp,
      expires_at   timestamptz,
      created_at   timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS login_events (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     varchar NOT NULL,
      event_type  varchar NOT NULL,
      ip_address  inet,
      user_agent  text,
      device_hash varchar,
      risk_score  integer NOT NULL DEFAULT 0,
      created_at  timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events (user_id, created_at DESC);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_devices (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      varchar NOT NULL,
      device_hash  varchar NOT NULL,
      ip_address   inet,
      device_name  varchar,
      is_trusted   boolean NOT NULL DEFAULT false,
      last_seen_at timestamp DEFAULT now(),
      created_at   timestamp DEFAULT now(),
      UNIQUE (user_id, device_hash)
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS disputes (
      id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id       varchar NOT NULL,
      split_version_id  uuid,
      raised_by         varchar NOT NULL,
      assigned_to       varchar,
      dispute_type      varchar NOT NULL,
      description       text NOT NULL,
      status            varchar NOT NULL DEFAULT 'open',
      freeze_payouts    boolean NOT NULL DEFAULT false,
      resolution_notes  text,
      resolved_at       timestamp,
      created_at        timestamp DEFAULT now(),
      updated_at        timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_disputes_contract ON disputes (contract_id);`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dispute_transitions (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      dispute_id  uuid NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
      from_status varchar,
      to_status   varchar NOT NULL,
      actor_id    varchar NOT NULL,
      note        text,
      created_at  timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS zk_ownership_proofs (
      proof_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id        varchar NOT NULL,
      version_number     integer NOT NULL,
      content_hash       varchar NOT NULL,
      prev_hash          varchar,
      status             varchar NOT NULL,
      total_pct          decimal(6,2),
      is_valid           boolean NOT NULL DEFAULT true,
      is_finalized       boolean NOT NULL DEFAULT false,
      is_contested        boolean NOT NULL DEFAULT false,
      signature_count    integer NOT NULL DEFAULT 0,
      collaborator_count integer NOT NULL DEFAULT 0,
      signed_at          timestamp,
      locked_at          timestamp,
      lock_expires_at    timestamp,
      created_at         timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_zk_proofs_contract ON zk_ownership_proofs (contract_id, version_number DESC);`);

  // ── Entertainment Agreement Template Library extensions ───────────────────
  await db.execute(sql`
    ALTER TABLE contract_templates
      ADD COLUMN IF NOT EXISTS slug varchar,
      ADD COLUMN IF NOT EXISTS category varchar,
      ADD COLUMN IF NOT EXISTS subcategory varchar,
      ADD COLUMN IF NOT EXISTS industry varchar DEFAULT 'music',
      ADD COLUMN IF NOT EXISTS agreement_type varchar,
      ADD COLUMN IF NOT EXISTS version varchar DEFAULT '1.0',
      ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS jurisdiction varchar,
      ADD COLUMN IF NOT EXISTS legal_review_status varchar DEFAULT 'NOT_REVIEWED',
      ADD COLUMN IF NOT EXISTS legal_review_date timestamp,
      ADD COLUMN IF NOT EXISTS rights_categories jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS required_parties jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS optional_parties jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS risk_level varchar DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS workflow_type varchar,
      ADD COLUMN IF NOT EXISTS supported_transactions jsonb DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS parent_template_id varchar;
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_contract_templates_type ON contract_templates (type);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_contract_templates_category ON contract_templates (category);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_contract_templates_status ON contract_templates (status);`);

  await db.execute(sql`
    ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS template_version varchar;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS template_audit_log (
      id          varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id varchar REFERENCES contract_templates(id),
      actor_id    varchar REFERENCES users(id),
      action      varchar NOT NULL,
      before      jsonb,
      after       jsonb,
      created_at  timestamp DEFAULT now()
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS license_records (
      id              varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id     varchar REFERENCES contracts(id),
      asset_id        varchar REFERENCES song_assets(id),
      license_type    varchar NOT NULL,
      licensor_name   varchar,
      licensee_name   varchar,
      territory       varchar,
      term            varchar,
      exclusivity     varchar,
      rights_granted  jsonb DEFAULT '[]'::jsonb,
      fee             decimal(12, 2),
      metadata        jsonb,
      version         integer DEFAULT 1,
      created_by      varchar REFERENCES users(id),
      created_at      timestamp DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_license_records_contract ON license_records (contract_id);`);
}
