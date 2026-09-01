create or replace function private.es_participante_servicio(service_id uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer
set search_path to 'public','private','pg_temp'
set row_security to 'off'
as $$
  select private.is_admin(uid) or exists (
    select 1 from public.servicios s where s.id=service_id and (s.cliente_id=uid or s.proveedor_id=uid)
  );
$$;

create or replace function private.es_cliente_servicio(service_id uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer
set search_path to 'public','private','pg_temp'
set row_security to 'off'
as $$
  select private.is_admin(uid) or exists (
    select 1 from public.servicios s where s.id=service_id and s.cliente_id=uid
  );
$$;

create or replace function private.proveedor_tiene_oferta(service_id uuid, uid uuid default auth.uid())
returns boolean language sql stable security definer
set search_path to 'public','private','pg_temp'
set row_security to 'off'
as $$
  select private.is_admin(uid) or exists (
    select 1 from public.ofertas_servicio o where o.servicio_id=service_id and o.proveedor_id=uid
  );
$$;

revoke all on function private.es_participante_servicio(uuid,uuid) from public;
revoke all on function private.es_cliente_servicio(uuid,uuid) from public;
revoke all on function private.proveedor_tiene_oferta(uuid,uuid) from public;
grant execute on function private.es_participante_servicio(uuid,uuid) to authenticated;
grant execute on function private.es_cliente_servicio(uuid,uuid) to authenticated;
grant execute on function private.proveedor_tiene_oferta(uuid,uuid) to authenticated;

drop policy if exists servicios_select on public.servicios;
create policy servicios_select on public.servicios for select to authenticated using (
  cliente_id=auth.uid() or proveedor_id=auth.uid() or private.is_admin(auth.uid()) or private.proveedor_tiene_oferta(id,auth.uid())
);

drop policy if exists ofertas_select on public.ofertas_servicio;
create policy ofertas_select on public.ofertas_servicio for select to authenticated using (
  proveedor_id=auth.uid() or private.is_admin(auth.uid()) or private.es_cliente_servicio(servicio_id,auth.uid())
);
