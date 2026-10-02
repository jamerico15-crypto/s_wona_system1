/*
# Create Olikanassa data tables — Group 3: Formacao, Comunicacao, Protecao, Clima, Sync

1. New Tables: ol_training_courses, ol_health_training_attendees, ol_livelihood_training_attendees,
  ol_communication_campaigns, ol_safeguarding_events, ol_climate_actions, ol_conexao_sync, ol_monthly_screening
2. Security: RLS enabled, anon + authenticated CRUD
*/

CREATE TABLE IF NOT EXISTS ol_training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text, course_type text, description text, duration_hours integer,
  facilitator text, start_date date, end_date date, location text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_training_courses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_health_training_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES ol_training_courses(id) ON DELETE CASCADE,
  health_worker_id uuid REFERENCES ol_health_workers(id),
  attendee_name text, attended boolean DEFAULT false, certificate_issued boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_health_training_attendees ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_livelihood_training_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES ol_training_courses(id) ON DELETE CASCADE,
  member_id uuid REFERENCES ol_members(id),
  attendee_name text, attended boolean DEFAULT false, certificate_issued boolean DEFAULT false,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_livelihood_training_attendees ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_communication_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text, campaign_type text, description text,
  start_date date, end_date date, target_audience text, reach integer,
  district_id uuid REFERENCES ol_districts(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_communication_campaigns ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_safeguarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text, description text, date_reported date, reported_by text,
  district_id uuid REFERENCES ol_districts(id), village_id uuid REFERENCES ol_villages(id),
  status text DEFAULT 'open', resolution text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_safeguarding_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_climate_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_name text, action_type text, description text,
  district_id uuid REFERENCES ol_districts(id), village_id uuid REFERENCES ol_villages(id),
  date_started date, date_completed date, participants integer, status text DEFAULT 'planned',
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_climate_actions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_conexao_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_date date, source text, records_synced integer, status text, error_message text, payload jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_conexao_sync ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS ol_monthly_screening (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month text, year integer, district_id uuid REFERENCES ol_districts(id),
  total_screened integer, total_cases integer, total_referred integer, data jsonb,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ol_monthly_screening ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'ol_training_courses','ol_health_training_attendees','ol_livelihood_training_attendees',
    'ol_communication_campaigns','ol_safeguarding_events','ol_climate_actions',
    'ol_conexao_sync','ol_monthly_screening'
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

CREATE INDEX IF NOT EXISTS idx_ol_health_training_course ON ol_health_training_attendees(course_id);
CREATE INDEX IF NOT EXISTS idx_ol_livelihood_training_course ON ol_livelihood_training_attendees(course_id);
CREATE INDEX IF NOT EXISTS idx_ol_comm_campaigns_district ON ol_communication_campaigns(district_id);
CREATE INDEX IF NOT EXISTS idx_ol_safeguarding_district ON ol_safeguarding_events(district_id);
CREATE INDEX IF NOT EXISTS idx_ol_climate_district ON ol_climate_actions(district_id);
CREATE INDEX IF NOT EXISTS idx_ol_monthly_screening_district ON ol_monthly_screening(district_id);