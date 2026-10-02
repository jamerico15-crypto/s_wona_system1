/*
# Fix get_table_columns security warnings

1. Modified Functions
- `get_table_columns(table_name text)` — Added explicit `search_path` parameter to fix mutable search_path warning. Changed from SECURITY DEFINER to SECURITY INVOKER since the function only reads from information_schema which is accessible to all roles.

2. Security
- Fixes 3 advisor warnings: mutable search_path, anon-executable SECURITY DEFINER, authenticated-executable SECURITY DEFINER
*/

CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, information_schema
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = table_name
  ORDER BY c.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION get_table_columns(text) TO anon, authenticated;
