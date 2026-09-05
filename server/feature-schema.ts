/**
 * Additive tables/columns for production features 3–10.
 * Must run on the Vercel lightweight path as well as full boot.
 */
import { sql } from "drizzle-orm";
import { db } from "./db";

export async function ensureProductionFeatureSchema(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS confirmation_reminders (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      confirmation_id varchar NOT NULL,
      contract_id varchar NOT NULL,
      collaborator_id varchar NOT NULL,
      stage varchar NOT NULL,
      reminder_type varchar NOT NULL DEFAULT 'pending_confirmation',
      delivery_status varchar NOT NULL DEFAULT 'sent',
      attempt_count integer NOT NULL DEFAULT 1,
      sent_at timestamp NOT NULL DEFAULT now(),
      created_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (confirmation_id, stage)
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_confirmation_reminders_contract
      ON confirmation_reminders (contract_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_confirmation_reminders_sent_at
      ON confirmation_reminders (sent_at);
  `);

  await db.execute(sql`
    ALTER TABLE organizations
      ADD COLUMN IF NOT EXISTS logo_url varchar,
      ADD COLUMN IF NOT EXISTS phone varchar,
      ADD COLUMN IF NOT EXISTS address text,
      ADD COLUMN IF NOT EXISTS public_slug varchar,
      ADD COLUMN IF NOT EXISTS verification_status varchar DEFAULT 'unverified',
      ADD COLUMN IF NOT EXISTS verified_at timestamp,
      ADD COLUMN IF NOT EXISTS badge_tier varchar DEFAULT 'none';
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_public_slug
      ON organizations (public_slug) WHERE public_slug IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS studio_verification_events (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar NOT NULL,
      actor_id varchar,
      action varchar NOT NULL,
      badge_tier varchar,
      note text,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_studio_verification_org
      ON studio_verification_events (organization_id, created_at);
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS operator_custom_fields (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id varchar,
      created_by varchar NOT NULL,
      template_type varchar NOT NULL DEFAULT 'split-sheet',
      label varchar NOT NULL,
      field_type varchar NOT NULL,
      required boolean NOT NULL DEFAULT false,
      placeholder varchar,
      options jsonb,
      default_value text,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_operator_custom_fields_owner
      ON operator_custom_fields (created_by, template_type);
  `);

  await db.execute(sql`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referral_code varchar;
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code
      ON users (referral_code) WHERE referral_code IS NOT NULL;
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS referrals (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      referrer_id varchar NOT NULL,
      referral_code varchar NOT NULL,
      referred_user_id varchar,
      status varchar NOT NULL DEFAULT 'PENDING',
      expires_at timestamp,
      converted_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (referral_code);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred
      ON referrals (referred_user_id) WHERE referred_user_id IS NOT NULL;
  `);
}
