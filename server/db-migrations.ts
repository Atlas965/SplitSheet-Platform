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
}
