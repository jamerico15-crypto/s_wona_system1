/*
# Module 3: Operations and Activity Module

Tracks specific interventions, training events, and asset inventory.

1. New Tables
- ol_activity_log — Specific interventions linked to LogFrame outputs, with unit rates, quantities, and funding sources.
- ol_training_registry_v2 — Training events linked to activities, with participant types and pre/post test scores.
- ol_asset_inventory — Tracks physical assets (bicycles, laptops, cameras, tablets) with recipient and maintenance info.

2. Security
- RLS enabled on all tables.
- TO anon, authenticated policies for full CRUD (single-tenant shared data model).
*/

-- ─── Activity Log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_activity_log (
  activity_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  output_id text REFERENCES ol_logframe_hierarchy(objective_id) ON DELETE SET NULL,
  description text NOT NULL,
  unit_rate_eur numeric,
  quantity_planned numeric,
  quantity_actual numeric,
  funding_source text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_activity_log" ON ol_activity_log;
CREATE POLICY "anon_select_activity_log" ON ol_activity_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_activity_log" ON ol_activity_log;
CREATE POLICY "anon_insert_activity_log" ON ol_activity_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_activity_log" ON ol_activity_log;
CREATE POLICY "anon_update_activity_log" ON ol_activity_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_activity_log" ON ol_activity_log;
CREATE POLICY "anon_delete_activity_log" ON ol_activity_log FOR DELETE TO anon, authenticated USING (true);

-- ─── Training Registry v2 ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_training_registry_v2 (
  training_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  activity_id text REFERENCES ol_activity_log(activity_id) ON DELETE SET NULL,
  participant_type text,
  topic text,
  pre_test_score numeric,
  post_test_score numeric,
  training_materials_id text,
  training_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_training_registry_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_training_registry_v2" ON ol_training_registry_v2;
CREATE POLICY "anon_select_training_registry_v2" ON ol_training_registry_v2 FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_training_registry_v2" ON ol_training_registry_v2;
CREATE POLICY "anon_insert_training_registry_v2" ON ol_training_registry_v2 FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_training_registry_v2" ON ol_training_registry_v2;
CREATE POLICY "anon_update_training_registry_v2" ON ol_training_registry_v2 FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_training_registry_v2" ON ol_training_registry_v2;
CREATE POLICY "anon_delete_training_registry_v2" ON ol_training_registry_v2 FOR DELETE TO anon, authenticated USING (true);

-- ─── Asset Inventory ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_asset_inventory (
  asset_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL,
  recipient_group text,
  maintenance_log text,
  purchase_date date,
  cost_eur numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_asset_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_asset_inventory" ON ol_asset_inventory;
CREATE POLICY "anon_select_asset_inventory" ON ol_asset_inventory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_asset_inventory" ON ol_asset_inventory;
CREATE POLICY "anon_insert_asset_inventory" ON ol_asset_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_asset_inventory" ON ol_asset_inventory;
CREATE POLICY "anon_update_asset_inventory" ON ol_asset_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_asset_inventory" ON ol_asset_inventory;
CREATE POLICY "anon_delete_asset_inventory" ON ol_asset_inventory FOR DELETE TO anon, authenticated USING (true);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_activity_log_output ON ol_activity_log(output_id);
CREATE INDEX IF NOT EXISTS idx_training_registry_activity ON ol_training_registry_v2(activity_id);
