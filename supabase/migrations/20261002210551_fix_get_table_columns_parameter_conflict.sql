/*
# Fix get_table_columns function

The function parameter name `table_name` was conflicting with the column name in the WHERE clause,
causing it to return ALL columns from ALL tables instead of filtering by the specified table.

1. Changes
- Drop and recreate the function with parameter renamed to `p_table_name` to avoid the name collision.
- SECURITY DEFINER with explicit search_path for safety.
2. Security
- Function is SECURITY DEFINER as before, scoped to public schema.
*/

DROP FUNCTION IF EXISTS public.get_table_columns(text);

CREATE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE(column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'information_schema'
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table_name
  ORDER BY c.ordinal_position;
$$;