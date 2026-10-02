/*
# Fix project_table_visibility unique constraint

1. Changes
- Adds the UNIQUE constraint on (user_id, role_name, project_id, collection_name) that failed in a prior migration due to column not yet existing.
- The user_id column now exists, so this constraint can be safely created.
2. Security
- No RLS changes — table already has RLS enabled with existing policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ptv_user_role_project_collection_unique'
  ) THEN
    ALTER TABLE project_table_visibility
      ADD CONSTRAINT ptv_user_role_project_collection_unique
      UNIQUE (user_id, role_name, project_id, collection_name);
  END IF;
END $$;