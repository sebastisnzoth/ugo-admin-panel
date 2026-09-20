-- UGO · Admin operational realtime coverage.
-- Adds the audit/360 sources consumed by Admin to Supabase Realtime without
-- changing data authority. Admin still resyncs from persisted rows.

do $$
declare
  t text;
  wanted text[] := array[
    'servicio_estado_eventos',
    'eventos_servicio',
    'evidencias_solicitud',
    'resenas',
    'deudas_ugo_proveedor',
    'disputa_mensajes'
  ];
begin
  foreach t in array wanted loop
    if to_regclass(format('public.%I',t)) is not null
       and not exists(
         select 1 from pg_publication_tables
         where pubname='supabase_realtime'
           and schemaname='public'
           and tablename=t
       ) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
