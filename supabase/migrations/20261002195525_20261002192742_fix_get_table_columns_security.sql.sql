/*
# Create get_table_columns function (security-fixed version)

1. New Functions
- `get_table_columns(table_name text)` — Returns column metadata for a given table.
  SECURITY INVOKER with explicit search_path to avoid security warnings.

2. Security
- Executable by anon and authenticated roles
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