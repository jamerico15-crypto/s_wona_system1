/*
# Module 4: Beneficiary and Impact Module

Enables longitudinal tracking of the 12,800 primary participants with clinical observations, screenings, and socio-economic data.

1. New Tables
- ol_beneficiary_registry — Unique identifiers for each beneficiary with demographic and location data.
- ol_clinical_observations — Longitudinal health measurements (EHF score, MUAC, Grade 2 Disability).
- ol_screening_event_log — Records of community and school-based screenings with case counts.
- ol_socio_economic_tracker — Group membership, loans, repayment, and crop yield changes.
- ol_groups_registry_v2 — AMOPAL branches, savings groups, and farmers' cooperatives with leadership structure.
- ol_livelihood_activity_tracker — Climate-smart practice adoption with yield metrics.
- ol_financial_inclusion_log — Loan access and repayment within savings groups.

2. Security
- RLS enabled on all tables.
- TO anon, authenticated policies for full CRUD (single-tenant shared data model).
*/

-- ─── Beneficiary Registry ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_beneficiary_registry (
  uid text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text,
  gender text,
  age_at_registration integer,
  age_group text,
  disability_status text,
  location_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_beneficiary_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_beneficiary_registry" ON ol_beneficiary_registry;
CREATE POLICY "anon_select_beneficiary_registry" ON ol_beneficiary_registry FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_beneficiary_registry" ON ol_beneficiary_registry;
CREATE POLICY "anon_insert_beneficiary_registry" ON ol_beneficiary_registry FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_beneficiary_registry" ON ol_beneficiary_registry;
CREATE POLICY "anon_update_beneficiary_registry" ON ol_beneficiary_registry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_beneficiary_registry" ON ol_beneficiary_registry;
CREATE POLICY "anon_delete_beneficiary_registry" ON ol_beneficiary_registry FOR DELETE TO anon, authenticated USING (true);

-- ─── Clinical Observations ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_clinical_observations (
  observation_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  beneficiary_uid text NOT NULL REFERENCES ol_beneficiary_registry(uid) ON DELETE CASCADE,
  observation_date date,
  metric_type text,
  score_value numeric,
  ehf_score integer,
  muac_score numeric,
  referral_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_clinical_observations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clinical_observations" ON ol_clinical_observations;
CREATE POLICY "anon_select_clinical_observations" ON ol_clinical_observations FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clinical_observations" ON ol_clinical_observations;
CREATE POLICY "anon_insert_clinical_observations" ON ol_clinical_observations FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clinical_observations" ON ol_clinical_observations;
CREATE POLICY "anon_update_clinical_observations" ON ol_clinical_observations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clinical_observations" ON ol_clinical_observations;
CREATE POLICY "anon_delete_clinical_observations" ON ol_clinical_observations FOR DELETE TO anon, authenticated USING (true);

-- ─── Screening Event Log ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_screening_event_log (
  screening_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  screening_date date,
  type text CHECK (type IN ('Community', 'School', 'Contact Tracing')),
  total_screened integer,
  suspected_cases integer,
  confirmed_leprosy_cases integer,
  location_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_screening_event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_screening_event_log" ON ol_screening_event_log;
CREATE POLICY "anon_select_screening_event_log" ON ol_screening_event_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_screening_event_log" ON ol_screening_event_log;
CREATE POLICY "anon_insert_screening_event_log" ON ol_screening_event_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_screening_event_log" ON ol_screening_event_log;
CREATE POLICY "anon_update_screening_event_log" ON ol_screening_event_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_screening_event_log" ON ol_screening_event_log;
CREATE POLICY "anon_delete_screening_event_log" ON ol_screening_event_log FOR DELETE TO anon, authenticated USING (true);

-- ─── Groups Registry v2 ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_groups_registry_v2 (
  group_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  group_type text,
  community_id text,
  date_formed date,
  leadership_structure jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_groups_registry_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_groups_registry_v2" ON ol_groups_registry_v2;
CREATE POLICY "anon_select_groups_registry_v2" ON ol_groups_registry_v2 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_groups_registry_v2" ON ol_groups_registry_v2;
CREATE POLICY "anon_insert_groups_registry_v2" ON ol_groups_registry_v2 FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_groups_registry_v2" ON ol_groups_registry_v2;
CREATE POLICY "anon_update_groups_registry_v2" ON ol_groups_registry_v2 FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_groups_registry_v2" ON ol_groups_registry_v2;
CREATE POLICY "anon_delete_groups_registry_v2" ON ol_groups_registry_v2 FOR DELETE TO anon, authenticated USING (true);

-- ─── Livelihood Activity Tracker ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_livelihood_activity_tracker (
  activity_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  beneficiary_uid text REFERENCES ol_beneficiary_registry(uid) ON DELETE CASCADE,
  practice_type text,
  training_date date,
  yield_metric numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_livelihood_activity_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_livelihood_tracker" ON ol_livelihood_activity_tracker;
CREATE POLICY "anon_select_livelihood_tracker" ON ol_livelihood_activity_tracker FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_livelihood_tracker" ON ol_livelihood_activity_tracker;
CREATE POLICY "anon_insert_livelihood_tracker" ON ol_livelihood_activity_tracker FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_livelihood_tracker" ON ol_livelihood_activity_tracker;
CREATE POLICY "anon_update_livelihood_tracker" ON ol_livelihood_activity_tracker FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_livelihood_tracker" ON ol_livelihood_activity_tracker;
CREATE POLICY "anon_delete_livelihood_tracker" ON ol_livelihood_activity_tracker FOR DELETE TO anon, authenticated USING (true);

-- ─── Financial Inclusion Log ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_financial_inclusion_log (
  transaction_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  beneficiary_uid text REFERENCES ol_beneficiary_registry(uid) ON DELETE CASCADE,
  loan_amount_mzn numeric,
  repayment_status text,
  business_plan_verified_yn boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_financial_inclusion_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_financial_inclusion" ON ol_financial_inclusion_log;
CREATE POLICY "anon_select_financial_inclusion" ON ol_financial_inclusion_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_financial_inclusion" ON ol_financial_inclusion_log;
CREATE POLICY "anon_insert_financial_inclusion" ON ol_financial_inclusion_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_financial_inclusion" ON ol_financial_inclusion_log;
CREATE POLICY "anon_update_financial_inclusion" ON ol_financial_inclusion_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_financial_inclusion" ON ol_financial_inclusion_log;
CREATE POLICY "anon_delete_financial_inclusion" ON ol_financial_inclusion_log FOR DELETE TO anon, authenticated USING (true);

-- ─── Socio Economic Tracker ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_socio_economic_tracker (
  entry_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  beneficiary_uid text REFERENCES ol_beneficiary_registry(uid) ON DELETE CASCADE,
  group_type text,
  loan_amount_mzn numeric,
  repayment_status text,
  crop_yield_change numeric,
  recorded_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_socio_economic_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_socio_economic" ON ol_socio_economic_tracker;
CREATE POLICY "anon_select_socio_economic" ON ol_socio_economic_tracker FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_socio_economic" ON ol_socio_economic_tracker;
CREATE POLICY "anon_insert_socio_economic" ON ol_socio_economic_tracker FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_socio_economic" ON ol_socio_economic_tracker;
CREATE POLICY "anon_update_socio_economic" ON ol_socio_economic_tracker FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_socio_economic" ON ol_socio_economic_tracker;
CREATE POLICY "anon_delete_socio_economic" ON ol_socio_economic_tracker FOR DELETE TO anon, authenticated USING (true);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_clinical_obs_beneficiary ON ol_clinical_observations(beneficiary_uid);
CREATE INDEX IF NOT EXISTS idx_screening_event_date ON ol_screening_event_log(screening_date);
CREATE INDEX IF NOT EXISTS idx_livelihood_beneficiary ON ol_livelihood_activity_tracker(beneficiary_uid);
CREATE INDEX IF NOT EXISTS idx_financial_inclusion_beneficiary ON ol_financial_inclusion_log(beneficiary_uid);
CREATE INDEX IF NOT EXISTS idx_socio_economic_beneficiary ON ol_socio_economic_tracker(beneficiary_uid);