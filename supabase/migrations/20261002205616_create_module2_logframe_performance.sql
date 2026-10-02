/*
# Module 2: Logic and Performance (LogFrame)

Codifies the Theory of Change into measurable units with hierarchical objectives, indicators, and targets.

1. New Tables
- ol_logframe_hierarchy — Stores the structural logic from Impact down to Outputs, with parent linking.
- ol_indicator_catalog_v2 — Central repository for indicators linked to objectives, with disaggregation and unit of measure.
- ol_target_baseline_registry — Stores baseline values and time-bound targets (Y1-Y4) for every indicator.

2. Security
- RLS enabled on all tables.
- TO anon, authenticated policies for full CRUD (single-tenant shared data model).
*/

-- ─── LogFrame Hierarchy ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_logframe_hierarchy (
  objective_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  level text NOT NULL CHECK (level IN ('Impact', 'Outcome', 'Output')),
  description text NOT NULL,
  parent_objective_id text REFERENCES ol_logframe_hierarchy(objective_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_logframe_hierarchy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_logframe_hierarchy" ON ol_logframe_hierarchy;
CREATE POLICY "anon_select_logframe_hierarchy" ON ol_logframe_hierarchy FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_logframe_hierarchy" ON ol_logframe_hierarchy;
CREATE POLICY "anon_insert_logframe_hierarchy" ON ol_logframe_hierarchy FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_logframe_hierarchy" ON ol_logframe_hierarchy;
CREATE POLICY "anon_update_logframe_hierarchy" ON ol_logframe_hierarchy FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_logframe_hierarchy" ON ol_logframe_hierarchy;
CREATE POLICY "anon_delete_logframe_hierarchy" ON ol_logframe_hierarchy FOR DELETE TO anon, authenticated USING (true);

-- ─── Indicator Catalog v2 ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_indicator_catalog_v2 (
  indicator_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  objective_id text REFERENCES ol_logframe_hierarchy(objective_id) ON DELETE CASCADE,
  indicator_name text NOT NULL,
  disaggregation_requirement text,
  unit_of_measure text,
  data_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_indicator_catalog_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_indicator_catalog_v2" ON ol_indicator_catalog_v2;
CREATE POLICY "anon_select_indicator_catalog_v2" ON ol_indicator_catalog_v2 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_indicator_catalog_v2" ON ol_indicator_catalog_v2;
CREATE POLICY "anon_insert_indicator_catalog_v2" ON ol_indicator_catalog_v2 FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_indicator_catalog_v2" ON ol_indicator_catalog_v2;
CREATE POLICY "anon_update_indicator_catalog_v2" ON ol_indicator_catalog_v2 FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_indicator_catalog_v2" ON ol_indicator_catalog_v2;
CREATE POLICY "anon_delete_indicator_catalog_v2" ON ol_indicator_catalog_v2 FOR DELETE TO anon, authenticated USING (true);

-- ─── Target Baseline Registry ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_target_baseline_registry (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  indicator_id text NOT NULL REFERENCES ol_indicator_catalog_v2(indicator_id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('Baseline', 'Y1', 'Y2', 'Y3', 'Y4')),
  value numeric,
  geography_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_target_baseline_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_target_baseline" ON ol_target_baseline_registry;
CREATE POLICY "anon_select_target_baseline" ON ol_target_baseline_registry FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_target_baseline" ON ol_target_baseline_registry;
CREATE POLICY "anon_insert_target_baseline" ON ol_target_baseline_registry FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_target_baseline" ON ol_target_baseline_registry;
CREATE POLICY "anon_update_target_baseline" ON ol_target_baseline_registry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_target_baseline" ON ol_target_baseline_registry;
CREATE POLICY "anon_delete_target_baseline" ON ol_target_baseline_registry FOR DELETE TO anon, authenticated USING (true);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_logframe_parent ON ol_logframe_hierarchy(parent_objective_id);
CREATE INDEX IF NOT EXISTS idx_indicator_catalog_obj ON ol_indicator_catalog_v2(objective_id);
CREATE INDEX IF NOT EXISTS idx_target_baseline_indicator ON ol_target_baseline_registry(indicator_id);
