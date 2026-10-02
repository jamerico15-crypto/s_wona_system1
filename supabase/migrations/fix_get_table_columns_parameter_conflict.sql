/*
# Fix: get_table_columns parameter name conflict

Renames the parameter from `table_name` to `p_table_name` to avoid
ambiguity with the `table_name` column in the information_schema query
inside the function body. When both the parameter and a queried column
share the name `table_name`, Postgres can resolve the reference to the
parameter instead of the column, producing incorrect or empty results.

This migration drops and recreates the function with the renamed parameter.
*/

DROP FUNCTION IF EXISTS public.get_table_columns(table_name text);

CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name text)
RETURNS TABLE (column_name text, data_type text, is_nullable text, column_default text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_name = p_table_name
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
$$;
