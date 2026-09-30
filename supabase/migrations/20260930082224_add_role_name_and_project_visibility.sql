-- Add role_name column to project_table_visibility for role-based visibility
ALTER TABLE project_table_visibility
  ADD COLUMN IF NOT EXISTS role_name text;

-- Drop old unique constraint and replace with one that includes role_name
ALTER TABLE project_table_visibility
  DROP CONSTRAINT IF EXISTS ptv_user_project_collection_unique;

-- New unique constraint: (user_id, role_name, project_id, collection_name)
ALTER TABLE project_table_visibility
  ADD CONSTRAINT ptv_user_role_project_collection_unique
  UNIQUE (user_id, role_name, project_id, collection_name);

-- Create project_visibility table for per-user project visibility
CREATE TABLE IF NOT EXISTS project_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  project_id text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE project_visibility ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read their own visibility, admins can do all
CREATE POLICY "select_own_project_visibility" ON project_visibility
  FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

CREATE POLICY "insert_own_project_visibility" ON project_visibility
  FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "update_own_project_visibility" ON project_visibility
  FOR UPDATE TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "delete_own_project_visibility" ON project_visibility
  FOR DELETE TO authenticated USING (auth.uid()::text = user_id);

-- Unique constraint to prevent duplicates
ALTER TABLE project_visibility
  ADD CONSTRAINT project_visibility_user_project_unique
  UNIQUE (user_id, project_id);
