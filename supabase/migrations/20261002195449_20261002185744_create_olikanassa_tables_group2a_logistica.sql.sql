/*
# Create Olikanassa data tables — Group 2: Logistica

1. New Tables: ol_districts, ol_villages, ol_health_posts, ol_health_workers
2. Security: RLS enabled, anon + authenticated CRUD
*/

CREATE TABLE IF NOT EXISTS ol_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, province text, code text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_districts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, district_id uuid REFERENCES ol_districts(id) ON DELETE CASCADE,
  code text, population integer,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_villages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_health_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, district_id uuid REFERENCES ol_districts(id) ON DELETE CASCADE,
  type text, staff_count integer,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_health_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_health_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, role text, phone text,
  health_post_id uuid REFERENCES ol_health_posts(id) ON DELETE CASCADE,
  district_id uuid REFERENCES ol_districts(id),
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_health_workers ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['ol_districts','ol_villages','ol_health_posts','ol_health_workers'])
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

CREATE INDEX IF NOT EXISTS idx_ol_villages_district ON ol_villages(district_id);
CREATE INDEX IF NOT EXISTS idx_ol_health_posts_district ON ol_health_posts(district_id);
CREATE INDEX IF NOT EXISTS idx_ol_health_workers_post ON ol_health_workers(health_post_id);