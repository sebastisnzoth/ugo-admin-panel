do $$
declare
  t text;
  wanted text[] := array[
    'servicios',
    'ofertas_servicio',
    'pagos',
    'evidencias_servicio',
    'ampliaciones_servicio',
    'mensajes',
    'disputas',
    'disputa_mensajes',
    'perfiles_proveedor',
    'notificaciones'
  ];
begin
  foreach t in array wanted loop
    if to_regclass(format('public.%I', t)) is not null
       and not exists (
         select 1 from pg_publication_tables
         where pubname='supabase_realtime' and schemaname='public' and tablename=t
       ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
