create or replace function private.cancelar_servicio_impl(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_servicio public.servicios%rowtype;
  v_actor uuid := auth.uid();
  v_estado_anterior public.servicio_estado;
begin
  if v_actor is null then
    raise exception 'Autenticación requerida';
  end if;

  select *
    into v_servicio
    from public.servicios
   where id = p_servicio_id
   for update;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if v_servicio.cliente_id <> v_actor and not private.is_admin(v_actor) then
    raise exception 'No autorizado';
  end if;

  if v_servicio.estado = 'cancelado' then
    return v_servicio;
  end if;

  if v_servicio.estado not in ('borrador','buscando','ofrecido','asignado','en_camino','llegado') then
    raise exception 'El servicio ya no puede cancelarse desde esta etapa';
  end if;

  v_estado_anterior := v_servicio.estado;

  update public.ofertas_servicio
     set estado = 'expirada',
         respondida_at = coalesce(respondida_at, now())
   where servicio_id = p_servicio_id
     and estado = 'pendiente';

  update public.servicios
     set estado = 'cancelado',
         cancelado_at = coalesce(cancelado_at, now()),
         updated_at = now()
   where id = p_servicio_id
  returning * into v_servicio;

  insert into public.eventos_servicio(
    servicio_id, actor_id, evento, estado_anterior, estado_nuevo, detalles
  ) values (
    p_servicio_id,
    v_actor,
    'cancelacion_cliente',
    v_estado_anterior,
    'cancelado',
    jsonb_build_object('origen','cliente','rpc','cancelar_servicio')
  );

  return v_servicio;
end;
$$;

create or replace function public.cancelar_servicio(p_servicio_id uuid)
returns public.servicios
language sql
set search_path = public, private, pg_temp
as $$
  select private.cancelar_servicio_impl(p_servicio_id);
$$;

revoke all on function public.cancelar_servicio(uuid) from public;
revoke all on function public.cancelar_servicio(uuid) from anon;
grant execute on function public.cancelar_servicio(uuid) to authenticated;
grant execute on function public.cancelar_servicio(uuid) to service_role;

revoke all on function private.cancelar_servicio_impl(uuid) from public;
revoke all on function private.cancelar_servicio_impl(uuid) from anon;
revoke all on function private.cancelar_servicio_impl(uuid) from authenticated;
grant execute on function private.cancelar_servicio_impl(uuid) to service_role;
