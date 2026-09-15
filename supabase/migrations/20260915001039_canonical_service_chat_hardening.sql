-- UGO TEST · Chat canónico en public.mensajes.
-- Elimina la tabla paralela histórica mensajes_servicio si existe, preservando su contenido,
-- y reduce UPDATE a la única columna mutable por participantes: leido_at.

do $$
begin
  if to_regclass('public.mensajes_servicio') is not null then
    execute $copy$
      insert into public.mensajes(servicio_id, emisor_id, emisor_rol, contenido, datos, created_at)
      select ms.servicio_id,
             ms.autor_id,
             case
               when s.cliente_id = ms.autor_id then 'cliente'::public.mensaje_rol
               when s.proveedor_id = ms.autor_id then 'proveedor'::public.mensaje_rol
               when private.is_admin(ms.autor_id) then 'admin'::public.mensaje_rol
               else 'sistema'::public.mensaje_rol
             end,
             ms.mensaje,
             jsonb_build_object('legacy_mensajes_servicio_id', ms.id::text),
             ms.created_at
      from public.mensajes_servicio ms
      join public.servicios s on s.id = ms.servicio_id
      where not exists (
        select 1
        from public.mensajes m
        where m.datos ->> 'legacy_mensajes_servicio_id' = ms.id::text
      )
    $copy$;

    if exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'mensajes_servicio'
    ) then
      execute 'alter publication supabase_realtime drop table public.mensajes_servicio';
    end if;

    execute 'drop table public.mensajes_servicio';
  end if;
end $$;

drop policy if exists mensajes_sender_insert on public.mensajes;
create policy mensajes_sender_insert
on public.mensajes
for insert
to authenticated
with check (
  emisor_id = auth.uid()
  and private.is_service_participant(servicio_id, auth.uid())
  and (
    (
      emisor_rol = 'cliente'
      and exists (
        select 1 from public.servicios s
        where s.id = mensajes.servicio_id and s.cliente_id = auth.uid()
      )
    )
    or (
      emisor_rol = 'proveedor'
      and exists (
        select 1 from public.servicios s
        where s.id = mensajes.servicio_id and s.proveedor_id = auth.uid()
      )
    )
    or (
      emisor_rol = 'admin'
      and private.is_admin(auth.uid())
    )
  )
);

revoke update on table public.mensajes from authenticated;
grant select, insert on table public.mensajes to authenticated;
grant update(leido_at) on table public.mensajes to authenticated;
