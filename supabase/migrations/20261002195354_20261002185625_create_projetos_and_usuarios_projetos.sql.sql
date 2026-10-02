/*
# Create projetos and usuarios_projetos tables

1. New Tables
   - `projetos` — Project definitions (name, description, status, table prefix, NocoDB base ID and API token)
   - `usuarios_projetos` — Junction table linking users to projects with a role per assignment

2. Security
   - RLS enabled on both tables
   - anon + authenticated can CRUD (app has its own auth layer)
*/

CREATE TABLE IF NOT EXISTS projetos (
  id text PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  status text,
  table_prefix text,
  base_id text,
  api_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projetos" ON projetos;
CREATE POLICY "anon_select_projetos" ON projetos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projetos" ON projetos;
CREATE POLICY "anon_insert_projetos" ON projetos FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projetos" ON projetos;
CREATE POLICY "anon_update_projetos" ON projetos FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projetos" ON projetos;
CREATE POLICY "anon_delete_projetos" ON projetos FOR DELETE
TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS usuarios_projetos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_fkey text NOT NULL,
  projeto_id text NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  role_no_projeto text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE usuarios_projetos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_usuarios_projetos" ON usuarios_projetos;
CREATE POLICY "anon_select_usuarios_projetos" ON usuarios_projetos FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_usuarios_projetos" ON usuarios_projetos;
CREATE POLICY "anon_insert_usuarios_projetos" ON usuarios_projetos FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_usuarios_projetos" ON usuarios_projetos;
CREATE POLICY "anon_update_usuarios_projetos" ON usuarios_projetos FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_usuarios_projetos" ON usuarios_projetos;
CREATE POLICY "anon_delete_usuarios_projetos" ON usuarios_projetos FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_usuarios_projetos_usuario ON usuarios_projetos(usuario_fkey);
CREATE INDEX IF NOT EXISTS idx_usuarios_projetos_projeto ON usuarios_projetos(projeto_id);