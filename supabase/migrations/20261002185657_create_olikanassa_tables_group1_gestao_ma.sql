/*
# Create Olikanassa data tables — Group 1: Gestao and MA

1. New Tables (all prefixed with ol_ per Olikanassa convention)
- ol_projetos — Project definitions within Olikanassa (goals, expenses, log, tasks, report config)
- ol_goals — Project goals/objectives
- ol_despesas — Expenses
- ol_diario_de_bordo — Daily log / field diary
- ol_tarefas — Tasks
- ol_report_settings — Report configuration
- ol_outcomes — M&A outcomes (was "Outcomes1")
- ol_project_objectives — M&A project objectives (was "Project_Objectives")
- ol_outputs — M&A outputs
- ol_indicator_catalog — M&A indicator catalog
- ol_indicator_measurements — M&A indicator measurements

2. Security
- RLS enabled on all tables
- anon + authenticated CRUD (app manages access control in frontend)
*/

CREATE TABLE IF NOT EXISTS ol_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  descricao text,
  status text,
  start_date date,
  end_date date,
  budget numeric(14,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_projetos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  title text,
  description text,
  target_value numeric(14,2),
  current_value numeric(14,2),
  status text,
  due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_goals ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  description text,
  amount numeric(14,2),
  date date,
  category text,
  receipt_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_despesas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_diario_de_bordo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  date date,
  author text,
  location text,
  activities text,
  observations text,
  challenges text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_diario_de_bordo ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  title text,
  description text,
  assigned_to text,
  status text DEFAULT 'pending',
  priority text,
  due_date date,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_tarefas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_report_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  report_type text,
  frequency text,
  format text,
  recipients text,
  config jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_report_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  title text,
  description text,
  outcome_type text,
  target_value numeric(14,2),
  actual_value numeric(14,2),
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_outcomes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_project_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  title text,
  description text,
  objective_type text,
  status text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_project_objectives ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  title text,
  description text,
  output_type text,
  target_value numeric(14,2),
  actual_value numeric(14,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_outputs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_indicator_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  name text,
  description text,
  indicator_type text,
  unit text,
  baseline numeric(14,2),
  target numeric(14,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_indicator_catalog ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_indicator_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id uuid REFERENCES ol_indicator_catalog(id) ON DELETE CASCADE,
  projeto_id uuid REFERENCES ol_projetos(id) ON DELETE CASCADE,
  value numeric(14,2),
  measurement_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_indicator_measurements ENABLE ROW LEVEL SECURITY;

-- RLS policies for all tables in this group
DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'ol_projetos','ol_goals','ol_despesas','ol_diario_de_bordo','ol_tarefas',
    'ol_report_settings','ol_outcomes','ol_project_objectives','ol_outputs',
    'ol_indicator_catalog','ol_indicator_measurements'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_select_%s" ON %s;', tbl, tbl);
    EXECUTE format('CREATE POLICY "anon_select_%s" ON %s FOR SELECT TO anon, authenticated USING (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_insert_%s" ON %s;', tbl, tbl);
    EXECUTE format('CREATE POLICY "anon_insert_%s" ON %s FOR INSERT TO anon, authenticated WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_update_%s" ON %s;', tbl, tbl);
    EXECUTE format('CREATE POLICY "anon_update_%s" ON %s FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "anon_delete_%s" ON %s;', tbl, tbl);
    EXECUTE format('CREATE POLICY "anon_delete_%s" ON %s FOR DELETE TO anon, authenticated USING (true);', tbl, tbl);
  END LOOP;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ol_goals_projeto ON ol_goals(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_despesas_projeto ON ol_despesas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_diario_projeto ON ol_diario_de_bordo(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_tarefas_projeto ON ol_tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_outcomes_projeto ON ol_outcomes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_objectives_projeto ON ol_project_objectives(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_outputs_projeto ON ol_outputs(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_indicators_projeto ON ol_indicator_catalog(projeto_id);
CREATE INDEX IF NOT EXISTS idx_ol_measurements_indicator ON ol_indicator_measurements(indicator_id);
