/*
# Create table_permissions table

Stores per-role, per-collection CRUD permissions (view/create/edit/delete).

1. New Tables
   - `table_permissions`
     - `id` (uuid, primary key)
     - `role_name` (text, not null)
     - `collection_name` (text, not null)
     - `can_view` (boolean, default false)
     - `can_create` (boolean, default false)
     - `can_edit` (boolean, default false)
     - `can_delete` (boolean, default false)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)
     - unique constraint on (role_name, collection_name)

2. Security
   - RLS enabled
   - anon + authenticated: full CRUD
*/

CREATE TABLE IF NOT EXISTS table_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name text NOT NULL,
  collection_name text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (role_name, collection_name)
);

ALTER TABLE table_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tp_select" ON table_permissions;
CREATE POLICY "tp_select" ON table_permissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tp_insert" ON table_permissions;
CREATE POLICY "tp_insert" ON table_permissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "tp_update" ON table_permissions;
CREATE POLICY "tp_update" ON table_permissions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "tp_delete" ON table_permissions;
CREATE POLICY "tp_delete" ON table_permissions FOR DELETE
  TO anon, authenticated USING (true);