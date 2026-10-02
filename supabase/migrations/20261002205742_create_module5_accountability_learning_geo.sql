/*
# Module 5: Accountability and Learning Module + Geographical/Infrastructure Hierarchy

Tracks qualitative feedback, safeguarding, institutional risks, and geographical/infrastructure data.

1. New Tables
- ol_feedback_log — Community feedback via suggestion boxes, focus groups, radio, with 4R status tracking.
- ol_safeguarding_log — Safeguarding cases managed by AMOPAL with resolution tracking.
- ol_risk_management_matrix — Project-level risks linked to LogFrame objectives with mitigation status.
- ol_training_capacity_registry — Knowledge transfer to health workers, CHVs, and Mukulukanas with pre/post scores.
- ol_spatial_hierarchy — Province -> District -> Community/Health Post geographical aggregation.
- ol_infrastructure_inventory — Construction and equipping of Media Centres.

2. Security
- RLS enabled on all tables.
- TO anon, authenticated policies for full CRUD (single-tenant shared data model).
*/

-- ─── Feedback Log ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_feedback_log (
  feedback_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date_received date,
  channel text,
  category text,
  status text CHECK (status IN ('Recognise', 'Respond', 'Report', 'Resolve')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_feedback_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_feedback_log" ON ol_feedback_log;
CREATE POLICY "anon_select_feedback_log" ON ol_feedback_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_feedback_log" ON ol_feedback_log;
CREATE POLICY "anon_insert_feedback_log" ON ol_feedback_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_feedback_log" ON ol_feedback_log;
CREATE POLICY "anon_update_feedback_log" ON ol_feedback_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_feedback_log" ON ol_feedback_log;
CREATE POLICY "anon_delete_feedback_log" ON ol_feedback_log FOR DELETE TO anon, authenticated USING (true);

-- ─── Safeguarding Log ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_safeguarding_log (
  case_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  date_reported date,
  type text CHECK (type IN ('Complaint', 'Feedback')),
  status text CHECK (status IN ('Recognise', 'Respond', 'Report', 'Resolve')),
  resolution_date date,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_safeguarding_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_safeguarding_log" ON ol_safeguarding_log;
CREATE POLICY "anon_select_safeguarding_log" ON ol_safeguarding_log FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_safeguarding_log" ON ol_safeguarding_log;
CREATE POLICY "anon_insert_safeguarding_log" ON ol_safeguarding_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_safeguarding_log" ON ol_safeguarding_log;
CREATE POLICY "anon_update_safeguarding_log" ON ol_safeguarding_log FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_safeguarding_log" ON ol_safeguarding_log;
CREATE POLICY "anon_delete_safeguarding_log" ON ol_safeguarding_log FOR DELETE TO anon, authenticated USING (true);

-- ─── Risk Management Matrix ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_risk_management_matrix (
  risk_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category text CHECK (category IN ('Strategic', 'Operational', 'Financial', 'Reputational')),
  likelihood text CHECK (likelihood IN ('Low', 'Medium', 'High')),
  impact_level text,
  mitigation_strategy text,
  mitigation_status text,
  linked_objective_id text REFERENCES ol_logframe_hierarchy(objective_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_risk_management_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_risk_matrix" ON ol_risk_management_matrix;
CREATE POLICY "anon_select_risk_matrix" ON ol_risk_management_matrix FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_risk_matrix" ON ol_risk_management_matrix;
CREATE POLICY "anon_insert_risk_matrix" ON ol_risk_management_matrix FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_risk_matrix" ON ol_risk_management_matrix;
CREATE POLICY "anon_update_risk_matrix" ON ol_risk_management_matrix FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_risk_matrix" ON ol_risk_management_matrix;
CREATE POLICY "anon_delete_risk_matrix" ON ol_risk_management_matrix FOR DELETE TO anon, authenticated USING (true);

-- ─── Training and Capacity Registry ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_training_capacity_registry (
  training_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  participant_category text,
  topic text,
  pre_test_score numeric,
  post_test_score numeric,
  training_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_training_capacity_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_training_capacity" ON ol_training_capacity_registry;
CREATE POLICY "anon_select_training_capacity" ON ol_training_capacity_registry FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_training_capacity" ON ol_training_capacity_registry;
CREATE POLICY "anon_insert_training_capacity" ON ol_training_capacity_registry FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_training_capacity" ON ol_training_capacity_registry;
CREATE POLICY "anon_update_training_capacity" ON ol_training_capacity_registry FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_training_capacity" ON ol_training_capacity_registry;
CREATE POLICY "anon_delete_training_capacity" ON ol_training_capacity_registry FOR DELETE TO anon, authenticated USING (true);

-- ─── Spatial Hierarchy ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_spatial_hierarchy (
  location_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  province text,
  district text,
  community text,
  health_post text,
  parent_location_id text REFERENCES ol_spatial_hierarchy(location_id) ON DELETE CASCADE,
  level text CHECK (level IN ('Province', 'District', 'Community', 'Health Post')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_spatial_hierarchy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_spatial_hierarchy" ON ol_spatial_hierarchy;
CREATE POLICY "anon_select_spatial_hierarchy" ON ol_spatial_hierarchy FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_spatial_hierarchy" ON ol_spatial_hierarchy;
CREATE POLICY "anon_insert_spatial_hierarchy" ON ol_spatial_hierarchy FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_spatial_hierarchy" ON ol_spatial_hierarchy;
CREATE POLICY "anon_update_spatial_hierarchy" ON ol_spatial_hierarchy FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_spatial_hierarchy" ON ol_spatial_hierarchy;
CREATE POLICY "anon_delete_spatial_hierarchy" ON ol_spatial_hierarchy FOR DELETE TO anon, authenticated USING (true);

-- ─── Infrastructure Inventory ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ol_infrastructure_inventory (
  infrastructure_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL,
  location_id text REFERENCES ol_spatial_hierarchy(location_id) ON DELETE SET NULL,
  status text,
  construction_date date,
  equipped_yn boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ol_infrastructure_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_infrastructure" ON ol_infrastructure_inventory;
CREATE POLICY "anon_select_infrastructure" ON ol_infrastructure_inventory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_infrastructure" ON ol_infrastructure_inventory;
CREATE POLICY "anon_insert_infrastructure" ON ol_infrastructure_inventory FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_infrastructure" ON ol_infrastructure_inventory;
CREATE POLICY "anon_update_infrastructure" ON ol_infrastructure_inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_infrastructure" ON ol_infrastructure_inventory;
CREATE POLICY "anon_delete_infrastructure" ON ol_infrastructure_inventory FOR DELETE TO anon, authenticated USING (true);

-- ─── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_feedback_log_date ON ol_feedback_log(date_received);
CREATE INDEX IF NOT EXISTS idx_safeguarding_log_date ON ol_safeguarding_log(date_reported);
CREATE INDEX IF NOT EXISTS idx_risk_matrix_objective ON ol_risk_management_matrix(linked_objective_id);
CREATE INDEX IF NOT EXISTS idx_spatial_hierarchy_parent ON ol_spatial_hierarchy(parent_location_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_location ON ol_infrastructure_inventory(location_id);