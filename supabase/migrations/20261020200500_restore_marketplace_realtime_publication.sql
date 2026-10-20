-- UGO TEST P0: restore realtime delivery for the marketplace entities.
-- PostgreSQL publication membership is distinct from RLS; existing RLS and grants remain enforced.
-- Confirmed missing from supabase_realtime in Arena TEST on 2026-10-20.
-- Deploy to TEST only. Production requires approval and independent audit.
DO $ugo$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'supabase_realtime publication missing; refusing to create a replacement';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='ofertas_servicio') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ofertas_servicio;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notificaciones') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='servicios') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.servicios;
  END IF;
END
$ugo$;
