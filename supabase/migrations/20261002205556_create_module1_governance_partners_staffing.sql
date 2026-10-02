/*
# Module 1: Governance, Partners, and Staffing

Creates tables for managing institutional memory and human resources of the Olikanassa consortium.

1. New Tables
- ol_partner_registry — Stores partner organisations (TLMM, AMOPAL, TLMGB) with legal reps, registration details, annual income, and safeguarding leads.
- ol_staff_master — Staff members linked to partners, with position, FTE %, monthly rate (EUR), and qualifications.
- ol_staff_hierarchy — Recursive reporting lines between staff members.

2. Security
- RLS enabled on all tables.
- TO anon, authenticated policies for full CRUD (single-tenant shared data model).
*/

-- ─── Partner Registry ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_partner_registry (
  partner_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organisation_name text NOT NULL,
  legal_representative text,
  registration_details text,
  annual_income_mzn jsonb,
  safeguarding_lead_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_partner_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_partner_registry" ON ol_partner_registry;
CREATE POLICY "anon_select_partner_registry" ON ol_partner_registry FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_partner_registry" ON ol_partner_registry;
CREATE POLICY "anon_insert_partner_registry" ON ol_partner_registry FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_partner_registry" ON ol_partner_registry;
CREATE POLICY "anon_update_partner_registry" ON ol_partner_registry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_partner_registry" ON ol_partner_registry;
CREATE POLICY "anon_delete_partner_registry" ON ol_partner_registry FOR DELETE TO anon, authenticated USING (true);

-- ─── Staff Master ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_staff_master (
  staff_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  partner_id text REFERENCES ol_partner_registry(partner_id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  fte_percentage numeric DEFAULT 100,
  monthly_rate_eur numeric,
  professional_qualification text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_staff_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_staff_master" ON ol_staff_master;
CREATE POLICY "anon_select_staff_master" ON ol_staff_master FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_staff_master" ON ol_staff_master;
CREATE POLICY "anon_insert_staff_master" ON ol_staff_master FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_staff_master" ON ol_staff_master;
CREATE POLICY "anon_update_staff_master" ON ol_staff_master FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_staff_master" ON ol_staff_master;
CREATE POLICY "anon_delete_staff_master" ON ol_staff_master FOR DELETE TO anon, authenticated USING (true);

-- ─── Staff Hierarchy ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_staff_hierarchy (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  staff_id text NOT NULL REFERENCES ol_staff_master(staff_id) ON DELETE CASCADE,
  supervisor_id text NOT NULL REFERENCES ol_staff_master(staff_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ol_staff_hierarchy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_staff_hierarchy" ON ol_staff_hierarchy;
CREATE POLICY "anon_select_staff_hierarchy" ON ol_staff_hierarchy FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_staff_hierarchy" ON ol_staff_hierarchy;
CREATE POLICY "anon_insert_staff_hierarchy" ON ol_staff_hierarchy FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_staff_hierarchy" ON ol_staff_hierarchy;
CREATE POLICY "anon_update_staff_hierarchy" ON ol_staff_hierarchy FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_staff_hierarchy" ON ol_staff_hierarchy;
CREATE POLICY "anon_delete_staff_hierarchy" ON ol_staff_hierarchy FOR DELETE TO anon, authenticated USING (true);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_staff_master_partner_id ON ol_staff_master(partner_id);
CREATE INDEX IF NOT EXISTS idx_staff_hierarchy_staff_id ON ol_staff_hierarchy(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_hierarchy_supervisor_id ON ol_staff_hierarchy(supervisor_id);
