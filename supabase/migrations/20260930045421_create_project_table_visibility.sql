/*
# Create project_table_visibility table

Stores which NocoBase collections are visible for each project.
Uses text for project_id to support large snowflake-style IDs without integer overflow.

1. New Tables
   - `project_table_visibility`
     - `id` (uuid, primary key)
     - `project_id` (text, not null) — NocoBase project ID stored as string
     - `collection_name` (text, not null) — NocoBase collection name
     - `visible` (boolean, not null, default true)
     - `created_at` (timestamptz)
     - unique constraint on (project_id, collection_name)

2. Security
   - RLS enabled
   - anon + authenticated: full CRUD (single-tenant, no Supabase auth in this app)
*/

CREATE TABLE IF NOT EXISTS project_table_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL,
  collection_name text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (project_id, collection_name)
);

ALTER TABLE project_table_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ptv_select" ON project_table_visibility;
CREATE POLICY "ptv_select" ON project_table_visibility FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ptv_insert" ON project_table_visibility;
CREATE POLICY "ptv_insert" ON project_table_visibility FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ptv_update" ON project_table_visibility;
CREATE POLICY "ptv_update" ON project_table_visibility FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ptv_delete" ON project_table_visibility;
CREATE POLICY "ptv_delete" ON project_table_visibility FOR DELETE
  TO anon, authenticated USING (true);
