-- UGO TEST · Tracking canónico Cliente ↔ Proveedor.
-- Reconciliado con la migración ya aplicada en TEST el 14/09/2026.

create or replace function public.actualizar_ubicacion_y_distancia(
  p_lat double precision,
  p_lng double precision,
  p_servicio_id uuid default null
)
returns double precision
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_client_location extensions.geography;
  v_distance double precision;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if p_lat is null or p_lat < -90 or p_lat > 90 or p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas inválidas';
  end if;
  if not exists (select 1 from public.usuarios u where u.id=v_uid and u.tipo='proveedor') then
    raise exception 'Solo proveedores pueden actualizar este tracking';
  end if;

  update public.perfiles_proveedor
     set ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
         updated_at=now()
   where usuario_id=v_uid;
  if not found then raise exception 'Perfil de proveedor no disponible'; end if;

  update public.usuarios set lat=p_lat,lng=p_lng,updated_at=now() where id=v_uid;

  if p_servicio_id is null then return null; end if;

  select coalesce(s.ubicacion_cliente,pc.ubicacion)
    into v_client_location
    from public.servicios s
    left join public.perfiles_cliente pc on pc.usuario_id=s.cliente_id
   where s.id=p_servicio_id
     and s.proveedor_id=v_uid
     and s.estado in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado');
  if not found then raise exception 'Servicio no asignado al proveedor'; end if;
  if v_client_location is null then return null; end if;

  v_distance := extensions.st_distance(
    extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
    v_client_location
  );
  return v_distance;
end;
$$;

create or replace function public.obtener_tracking_servicio_cliente(
  p_servicio_id uuid
)
returns table(
  proveedor_id uuid,
  provider_lat double precision,
  provider_lng double precision,
  client_lat double precision,
  client_lng double precision,
  provider_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if not exists(select 1 from public.servicios s where s.id=p_servicio_id and s.cliente_id=v_uid) then
    raise exception 'No autorizado';
  end if;
  return query
  select s.proveedor_id,
         case when pp.ubicacion is null then null else extensions.st_y(pp.ubicacion::extensions.geometry) end,
         case when pp.ubicacion is null then null else extensions.st_x(pp.ubicacion::extensions.geometry) end,
         case when coalesce(s.ubicacion_cliente,pc.ubicacion) is null then null else extensions.st_y(coalesce(s.ubicacion_cliente,pc.ubicacion)::extensions.geometry) end,
         case when coalesce(s.ubicacion_cliente,pc.ubicacion) is null then null else extensions.st_x(coalesce(s.ubicacion_cliente,pc.ubicacion)::extensions.geometry) end,
         pp.updated_at
    from public.servicios s
    left join public.perfiles_proveedor pp on pp.usuario_id=s.proveedor_id
    left join public.perfiles_cliente pc on pc.usuario_id=s.cliente_id
   where s.id=p_servicio_id;
end;
$$;

revoke all on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) from public;
revoke all on function public.obtener_tracking_servicio_cliente(uuid) from public;
grant execute on function public.actualizar_ubicacion_y_distancia(double precision,double precision,uuid) to authenticated;
grant execute on function public.obtener_tracking_servicio_cliente(uuid) to authenticated;
