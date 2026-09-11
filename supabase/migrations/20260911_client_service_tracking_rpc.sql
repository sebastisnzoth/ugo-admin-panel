-- UGO · Tracking exacto durante un servicio activo
-- Mantiene la ubicación pública aproximada para discovery y expone coordenadas
-- exactas sólo a los participantes del servicio mientras el proveedor está en camino.

create or replace function public.obtener_tracking_servicio_cliente(p_servicio_id uuid)
returns table(
  servicio_id uuid,
  proveedor_id uuid,
  provider_lat double precision,
  provider_lng double precision,
  client_lat double precision,
  client_lng double precision,
  provider_updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if v_servicio.cliente_id <> auth.uid()
     and v_servicio.proveedor_id <> auth.uid()
     and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  -- La ubicación exacta del proveedor sólo se comparte durante el traslado.
  if v_servicio.estado <> 'en_camino' or v_servicio.proveedor_id is null then
    return;
  end if;

  return query
  select
    v_servicio.id,
    pp.usuario_id,
    case when pp.ubicacion is null then null else st_y(pp.ubicacion::geometry) end,
    case when pp.ubicacion is null then null else st_x(pp.ubicacion::geometry) end,
    case when v_servicio.ubicacion_cliente is null then null else st_y(v_servicio.ubicacion_cliente::geometry) end,
    case when v_servicio.ubicacion_cliente is null then null else st_x(v_servicio.ubicacion_cliente::geometry) end,
    pp.updated_at
  from public.perfiles_proveedor pp
  where pp.usuario_id = v_servicio.proveedor_id;
end;
$$;

revoke all on function public.obtener_tracking_servicio_cliente(uuid) from public;
revoke all on function public.obtener_tracking_servicio_cliente(uuid) from anon;
grant execute on function public.obtener_tracking_servicio_cliente(uuid) to authenticated;

comment on function public.obtener_tracking_servicio_cliente(uuid) is
'Exact service-scoped tracking for the assigned client/provider/admin only while service state is en_camino.';
