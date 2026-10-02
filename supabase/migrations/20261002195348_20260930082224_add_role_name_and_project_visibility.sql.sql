/*
# Add role_name to project_table_visibility and create project_visibility table

1. Modified Tables
   - `project_table_visibility` — Added `role_name` column (text, nullable)

2. New Tables
   - `project_visibility`
     - `id` (uuid, primary key)
     - `user_id` (text, not null)
     - `project_id` (text, not null)
     - `visible` (boolean, default true)
     - `created_at` (timestamptz)
     - unique constraint on (user_id, project_id)

3. Security
   - RLS enabled on project_visibility
   - authenticated users can manage their own visibility entries
*/

ALTER TABLE project_table_visibility
  ADD COLUMN IF NOT EXISTS role_name text;

CREATE TABLE IF NOT EXISTS project_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  project_id text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_project_visibility" ON project_visibility;
CREATE POLICY "select_own_project_visibility" ON project_visibility
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "insert_own_project_visibility" ON project_visibility;
CREATE POLICY "insert_own_project_visibility" ON project_visibility
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "update_own_project_visibility" ON project_visibility;
CREATE POLICY "update_own_project_visibility" ON project_visibility
  FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "delete_own_project_visibility" ON project_visibility;
CREATE POLICY "delete_own_project_visibility" ON project_visibility
  FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

ALTER TABLE project_visibility
  DROP CONSTRAINT IF EXISTS project_visibility_user_project_unique;
ALTER TABLE project_visibility
  ADD CONSTRAINT project_visibility_user_project_unique
  UNIQUE (user_id, project_id);