-- UGO Neon TEST: migrated from supabase/migrations/20260901_whatsapp_channel.sql
-- Source-compatible standalone event table. No personal row data copied.
CREATE TABLE IF NOT EXISTS public.whatsapp_eventos (
  message_id text PRIMARY KEY,
  telefono text NOT NULL,
  direccion text NOT NULL CHECK (direccion IN ('in','out')),
  tipo text NOT NULL DEFAULT 'text',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS whatsapp_eventos_telefono_idx
  ON public.whatsapp_eventos(telefono, created_at DESC);
ALTER TABLE public.whatsapp_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_eventos FROM PUBLIC;
-- No permissive RLS policy: direct browser access is denied until Neon Auth
-- server-side authorization replaces the Supabase private.is_admin(auth.uid()) helper.
