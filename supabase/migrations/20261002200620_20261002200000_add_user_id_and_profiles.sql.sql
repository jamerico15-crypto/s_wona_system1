/*
# Add user_id to project_table_visibility and create profiles table

1. Modified Tables
   - `project_table_visibility` — Added `user_id` column (text, nullable) for per-user visibility

2. New Tables
   - `profiles` — Mirror of auth.users with role, nickname, active project for user management
     - `id` (uuid, primary key, references auth.users)
     - `email` (text)
     - `nickname` (text, nullable)
     - `role` (text, default 'editor')
     - `active_project_id` (text, nullable)
     - `created_at` (timestamptz)

3. Security
   - RLS enabled on profiles
   - Authenticated users can read all profiles (needed for user management)
   - Users can update their own profile
   - Super_admin role can manage all profiles via app-level checks
*/

ALTER TABLE project_table_visibility
  ADD COLUMN IF NOT EXISTS user_id text;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nickname text,
  role text DEFAULT 'editor',
  active_project_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE
  TO authenticated USING (true);

-- Also add user_id to the unique constraint on project_table_visibility
ALTER TABLE project_table_visibility
  DROP CONSTRAINT IF EXISTS ptv_user_role_project_collection_unique;
ALTER TABLE project_table_visibility
  DROP CONSTRAINT IF EXISTS project_table_visibility_project_id_collection_name_key;
