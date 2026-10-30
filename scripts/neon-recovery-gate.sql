-- UGO Neon recovery acceptance gate (read-only).
-- Run with: psql "$NEON_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/neon-recovery-gate.sql
-- Never run migrations or publish UGO until the schema and identity checks pass.
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(tbl, ', ' ORDER BY tbl) INTO missing
  FROM unnest(ARRAY['usuarios','perfiles_cliente','perfiles_proveedor']) tbl
  WHERE to_regclass('public.' || tbl) IS NULL;
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'UGO Neon incomplete: missing public tables: %', missing;
  END IF;
END $$;
SELECT 'usuarios' AS source, count(*) AS rows FROM public.usuarios
UNION ALL SELECT 'perfiles_cliente', count(*) FROM public.perfiles_cliente
UNION ALL SELECT 'perfiles_proveedor', count(*) FROM public.perfiles_proveedor;
