-- UGO PROD compatibility candidate — REVIEW ONLY / DO NOT EXECUTE
-- Source: read-only information_schema inspection of UGO Arena TEST (2026-10-30).
-- Target: UGO PROD trfsjuseqjxlhrxuvdsm.
-- REQUIRED BEFORE EXECUTION: full schema/RLS/RPC diff, confirmed recoverable backup,
-- independent review of application dependencies, explicit user authorization.
-- Neither this script nor its companion plan has been applied to Supabase.

ALTER TABLE public.perfiles_proveedor
  ADD COLUMN IF NOT EXISTS faxina_productos_lleva boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faxina_productos_valor numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pilot_capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.servicios
  ADD COLUMN IF NOT EXISTS zona text;

-- IMPORTANT: columns may be referenced by views, RPCs and RLS. This only covers
-- four observed column gaps, not all missing migrations or Auth differences.
-- ROLLBACK PLANNING: only after proving they are unused and free of newly written data;
-- dropping columns deletes their contents. Prefer leaving harmless new columns in place
-- rather than destructive rollback. No automated DROP is included.
