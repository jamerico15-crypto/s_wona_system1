/*
# Create Olikanassa data tables — Group 2b: Comunidade and Core Clinico

1. New Tables
- ol_groups — Savings/self-care groups (FK to districts, villages)
- ol_liderancas — Community leaders (FK to districts, villages)
- ol_members — Beneficiaries (FK to districts, villages, groups)
- ol_group_activities — Group activities (FK to groups)
- ol_activity_attendance — Attendance (FK to activities, members)
- ol_food_security_support — Food security support (FK to districts, villages)
- ol_screenings — Clinical screenings (FK to districts, villages, health posts)
- ol_pspark_casos_de_lepra — Confirmed leprosy cases (FK to districts, villages)

2. Security: RLS enabled, anon + authenticated CRUD
*/

CREATE TABLE IF NOT EXISTS ol_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  group_type text,
  district_id uuid REFERENCES ol_districts(id),
  village_id uuid REFERENCES ol_villages(id),
  formed_date date,
  member_count integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_liderancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  role text,
  phone text,
  district_id uuid REFERENCES ol_districts(id),
  village_id uuid REFERENCES ol_villages(id),
  assigned_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_liderancas ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  age integer,
  gender text,
  phone text,
  district_id uuid REFERENCES ol_districts(id),
  village_id uuid REFERENCES ol_villages(id),
  group_id uuid REFERENCES ol_groups(id),
  role text,
  joined_date date,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_group_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES ol_groups(id) ON DELETE CASCADE,
  activity_name text,
  activity_type text,
  activity_date date,
  location text,
  facilitator text,
  participants_count integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_group_activities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_activity_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES ol_group_activities(id) ON DELETE CASCADE,
  member_id uuid REFERENCES ol_members(id) ON DELETE CASCADE,
  attended boolean DEFAULT false,
  attendance_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_activity_attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_food_security_support (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_name text,
  district_id uuid REFERENCES ol_districts(id),
  village_id uuid REFERENCES ol_villages(id),
  support_type text,
  quantity numeric(14,2),
  unit text,
  date_provided date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_food_security_support ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_screenings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text,
  patient_age integer,
  patient_gender text,
  district_id uuid REFERENCES ol_districts(id),
  village_id uuid REFERENCES ol_villages(id),
  health_post_id uuid REFERENCES ol_health_posts(id),
  screening_date date,
  result text,
  referred boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_screenings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_pspark_casos_de_lepra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_name text,
  patient_age integer,
  patient_gender text,
  district_id uuid REFERENCES ol_districts(id),
  village_id uuid REFERENCES ol_villages(id),
  diagnosis_date date,
  leprosy_type text,
  treatment_status text,
  treatment_start_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_pspark_casos_de_lepra ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'ol_groups','ol_liderancas','ol_members','ol_group_activities',
    'ol_activity_attendance','ol_food_security_support','ol_screenings','ol_pspark_casos_de_lepra'
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

CREATE INDEX IF NOT EXISTS idx_ol_groups_village ON ol_groups(village_id);
CREATE INDEX IF NOT EXISTS idx_ol_liderancas_village ON ol_liderancas(village_id);
CREATE INDEX IF NOT EXISTS idx_ol_members_village ON ol_members(village_id);
CREATE INDEX IF NOT EXISTS idx_ol_members_group ON ol_members(group_id);
CREATE INDEX IF NOT EXISTS idx_ol_group_activities_group ON ol_group_activities(group_id);
CREATE INDEX IF NOT EXISTS idx_ol_activity_attendance_activity ON ol_activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_ol_screenings_district ON ol_screenings(district_id);
CREATE INDEX IF NOT EXISTS idx_ol_casos_district ON ol_pspark_casos_de_lepra(district_id);
