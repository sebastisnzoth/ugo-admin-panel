-- UGO P0.1 · GPS real -> backend -> geofence 200m -> YA LLEGUÉ
-- Versioned only. Do not apply to production as part of CI.
--
-- perfiles_proveedor.updated_at is touched by unrelated profile changes, so it is
-- not a valid GPS freshness clock. Arrival gets a dedicated capture timestamp.

alter table public.perfiles_proveedor
  add column if not exists ubicacion_updated_at timestamptz,
  add column if not exists ubicacion_accuracy_m double precision;

alter table public.perfiles_proveedor
  drop constraint if exists perfiles_proveedor_ubicacion_accuracy_m_check;

alter table public.perfiles_proveedor
  add constraint perfiles_proveedor_ubicacion_accuracy_m_check
  check (
    ubicacion_accuracy_m is null
    or (ubicacion_accuracy_m > 0 and ubicacion_accuracy_m <= 250)
  );

comment on column public.perfiles_proveedor.ubicacion_updated_at is
  'Timestamp de captura GPS persistida. No usar updated_at del perfil como reloj de ubicación.';
comment on column public.perfiles_proveedor.ubicacion_accuracy_m is
  'Precisión reportada por Geolocation API para la última ubicación GPS persistida; máximo P0.1 = 250m.';

create or replace function public.publicar_ubicacion_proveedor(
  p_servicio_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_captured_at timestamptz,
  p_accuracy_m double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_client_location extensions.geography;
  v_distance double precision;
  v_age_ms double precision;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if p_servicio_id is null then raise exception 'serviceId requerido'; end if;

  if not exists (
    select 1 from public.usuarios u
    where u.id=v_uid and u.tipo='proveedor' and u.activo=true
  ) then
    raise exception 'Solo un proveedor activo puede publicar GPS';
  end if;

  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180 then
    raise exception 'Coordenadas GPS inválidas';
  end if;

  if abs(p_lat) < 0.0001 and abs(p_lng) < 0.0001 then
    raise exception 'Ubicación GPS inválida (0,0)';
  end if;

  if p_captured_at is null then
    raise exception 'Timestamp de captura GPS requerido';
  end if;

  v_age_ms := extract(epoch from (now() - p_captured_at)) * 1000.0;
  if v_age_ms < -5000 or v_age_ms > 30000 then
    raise exception 'Ubicación GPS antigua o con reloj inválido';
  end if;

  if p_accuracy_m is not null
     and (p_accuracy_m <= 0 or p_accuracy_m > 250) then
    raise exception 'Precisión GPS insuficiente';
  end if;

  select coalesce(s.ubicacion_cliente,pc.ubicacion)
    into v_client_location
    from public.servicios s
    left join public.perfiles_cliente pc on pc.usuario_id=s.cliente_id
   where s.id=p_servicio_id
     and s.proveedor_id=v_uid
     and s.estado in ('en_camino','llegado');

  if not found then
    raise exception 'Servicio no asignado al proveedor o estado no habilitado para tracking de llegada';
  end if;

  update public.perfiles_proveedor
     set ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
         ubicacion_updated_at=p_captured_at,
         ubicacion_accuracy_m=p_accuracy_m
   where usuario_id=v_uid
     and (ubicacion_updated_at is null or p_captured_at >= ubicacion_updated_at);

  if not found then
    if not exists(select 1 from public.perfiles_proveedor pp where pp.usuario_id=v_uid) then
      raise exception 'Perfil de proveedor no disponible';
    end if;
    raise exception 'La posición GPS es anterior a la última ubicación persistida';
  end if;

  update public.usuarios
     set lat=p_lat,lng=p_lng,updated_at=now()
   where id=v_uid;

  if v_client_location is not null then
    v_distance := extensions.st_distance(
      extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
      v_client_location
    );
  end if;

  return jsonb_build_object(
    'status','published',
    'service_id',p_servicio_id,
    'captured_at',p_captured_at,
    'accuracy_m',p_accuracy_m,
    'distance_m',v_distance
  );
end;
$$;

revoke all on function public.publicar_ubicacion_proveedor(uuid,double precision,double precision,timestamptz,double precision) from public;
revoke all on function public.publicar_ubicacion_proveedor(uuid,double precision,double precision,timestamptz,double precision) from anon;
grant execute on function public.publicar_ubicacion_proveedor(uuid,double precision,double precision,timestamptz,double precision) to authenticated;

create or replace function public.obtener_tracking_servicio_cliente(
  p_servicio_id uuid
)
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
stable
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_servicio public.servicios%rowtype;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id;

  if not found then raise exception 'Servicio inexistente'; end if;

  if v_servicio.cliente_id is distinct from v_uid
     and v_servicio.proveedor_id is distinct from v_uid
     and not private.is_admin(v_uid) then
    raise exception 'No autorizado';
  end if;

  if v_servicio.estado <> 'en_camino' or v_servicio.proveedor_id is null then
    return;
  end if;

  return query
  select
    v_servicio.id,
    pp.usuario_id,
    case when pp.ubicacion is null then null else extensions.st_y(pp.ubicacion::extensions.geometry) end,
    case when pp.ubicacion is null then null else extensions.st_x(pp.ubicacion::extensions.geometry) end,
    case when coalesce(v_servicio.ubicacion_cliente,pc.ubicacion) is null then null else extensions.st_y(coalesce(v_servicio.ubicacion_cliente,pc.ubicacion)::extensions.geometry) end,
    case when coalesce(v_servicio.ubicacion_cliente,pc.ubicacion) is null then null else extensions.st_x(coalesce(v_servicio.ubicacion_cliente,pc.ubicacion)::extensions.geometry) end,
    pp.ubicacion_updated_at
  from public.perfiles_proveedor pp
  left join public.perfiles_cliente pc on pc.usuario_id=v_servicio.cliente_id
  where pp.usuario_id=v_servicio.proveedor_id;
end;
$$;

revoke all on function public.obtener_tracking_servicio_cliente(uuid) from public;
revoke all on function public.obtener_tracking_servicio_cliente(uuid) from anon;
grant execute on function public.obtener_tracking_servicio_cliente(uuid) to authenticated;

create or replace function private.enforce_validated_provider_arrival()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  if old.estado='en_camino'
     and new.estado='llegado'
     and old.estado is distinct from new.estado then
    if current_setting('ugo.arrival_validated_service',true) is distinct from new.id::text then
      raise exception 'La llegada requiere validación GPS del backend';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_validated_provider_arrival on public.servicios;
create trigger trg_enforce_validated_provider_arrival
before update of estado on public.servicios
for each row execute function private.enforce_validated_provider_arrival();

create or replace function public.marcar_llegada_proveedor(p_servicio_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_servicio public.servicios%rowtype;
  v_provider_location extensions.geography;
  v_client_location extensions.geography;
  v_location_at timestamptz;
  v_accuracy_m double precision;
  v_provider_lat double precision;
  v_provider_lng double precision;
  v_client_lat double precision;
  v_client_lng double precision;
  v_distance_m double precision;
  v_age_ms double precision;
begin
  if v_uid is null or not exists (
    select 1 from public.usuarios u
    where u.id=v_uid and u.tipo='proveedor' and u.activo=true
  ) then
    return jsonb_build_object('status','rejected','code','unauthorized','service_id',p_servicio_id,'state',null,'distance_m',null);
  end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found or v_servicio.proveedor_id is distinct from v_uid then
    return jsonb_build_object('status','rejected','code','unauthorized','service_id',p_servicio_id,'state',null,'distance_m',null);
  end if;

  if v_servicio.estado='llegado' then
    return jsonb_build_object(
      'status','arrived','service_id',v_servicio.id,
      'previous_state','llegado','state','llegado',
      'distance_m',null,'location_age_ms',null,'idempotent',true
    );
  end if;

  if v_servicio.estado <> 'en_camino' then
    return jsonb_build_object(
      'status','rejected','code','invalid_state',
      'service_id',v_servicio.id,'state',v_servicio.estado,'distance_m',null
    );
  end if;

  select pp.ubicacion,pp.ubicacion_updated_at,pp.ubicacion_accuracy_m
    into v_provider_location,v_location_at,v_accuracy_m
    from public.perfiles_proveedor pp
   where pp.usuario_id=v_uid;

  if v_provider_location is null or v_location_at is null then
    return jsonb_build_object('status','rejected','code','gps_unavailable','service_id',v_servicio.id,'state',v_servicio.estado,'distance_m',null);
  end if;

  v_provider_lat := extensions.st_y(v_provider_location::extensions.geometry);
  v_provider_lng := extensions.st_x(v_provider_location::extensions.geometry);

  if v_provider_lat is null or v_provider_lng is null
     or v_provider_lat < -90 or v_provider_lat > 90
     or v_provider_lng < -180 or v_provider_lng > 180
     or (abs(v_provider_lat) < 0.0001 and abs(v_provider_lng) < 0.0001) then
    return jsonb_build_object('status','rejected','code','gps_unavailable','service_id',v_servicio.id,'state',v_servicio.estado,'distance_m',null);
  end if;

  v_age_ms := extract(epoch from (now() - v_location_at)) * 1000.0;
  if v_age_ms < -5000 or v_age_ms > 30000 then
    return jsonb_build_object(
      'status','rejected','code','gps_stale','service_id',v_servicio.id,
      'state',v_servicio.estado,'distance_m',null,'location_age_ms',greatest(v_age_ms,0)
    );
  end if;

  if v_accuracy_m is null or v_accuracy_m <= 0 or v_accuracy_m > 250 then
    return jsonb_build_object(
      'status','rejected','code','gps_inaccurate','service_id',v_servicio.id,
      'state',v_servicio.estado,'distance_m',null,'location_age_ms',greatest(v_age_ms,0)
    );
  end if;

  v_client_location := v_servicio.ubicacion_cliente;
  if v_client_location is null then
    select pc.ubicacion into v_client_location
    from public.perfiles_cliente pc
    where pc.usuario_id=v_servicio.cliente_id;
  end if;

  if v_client_location is null then
    return jsonb_build_object('status','rejected','code','client_location_unavailable','service_id',v_servicio.id,'state',v_servicio.estado,'distance_m',null);
  end if;

  v_client_lat := extensions.st_y(v_client_location::extensions.geometry);
  v_client_lng := extensions.st_x(v_client_location::extensions.geometry);

  if v_client_lat is null or v_client_lng is null
     or v_client_lat < -90 or v_client_lat > 90
     or v_client_lng < -180 or v_client_lng > 180
     or (abs(v_client_lat) < 0.0001 and abs(v_client_lng) < 0.0001) then
    return jsonb_build_object('status','rejected','code','client_location_unavailable','service_id',v_servicio.id,'state',v_servicio.estado,'distance_m',null);
  end if;

  v_distance_m := extensions.st_distance(v_provider_location,v_client_location);

  if v_distance_m > 200 then
    return jsonb_build_object(
      'status','rejected','code','outside_geofence',
      'service_id',v_servicio.id,'state',v_servicio.estado,
      'distance_m',round(v_distance_m::numeric,1),
      'location_age_ms',greatest(v_age_ms,0)
    );
  end if;

  perform set_config('ugo.arrival_validated_service',v_servicio.id::text,true);

  update public.servicios
     set estado='llegado',updated_at=now()
   where id=v_servicio.id and proveedor_id=v_uid and estado='en_camino'
  returning * into v_servicio;

  perform set_config('ugo.arrival_validated_service','',true);

  if not found then
    select * into v_servicio from public.servicios where id=p_servicio_id;
    if v_servicio.estado='llegado' and v_servicio.proveedor_id=v_uid then
      return jsonb_build_object(
        'status','arrived','service_id',v_servicio.id,
        'previous_state','llegado','state','llegado',
        'distance_m',round(v_distance_m::numeric,1),
        'location_age_ms',greatest(v_age_ms,0),'idempotent',true
      );
    end if;
    return jsonb_build_object('status','rejected','code','invalid_state','service_id',p_servicio_id,'state',v_servicio.estado,'distance_m',null);
  end if;

  return jsonb_build_object(
    'status','arrived','service_id',v_servicio.id,
    'previous_state','en_camino','state','llegado',
    'distance_m',round(v_distance_m::numeric,1),
    'location_age_ms',greatest(v_age_ms,0),'idempotent',false
  );
end;
$$;

revoke all on function public.marcar_llegada_proveedor(uuid) from public;
revoke all on function public.marcar_llegada_proveedor(uuid) from anon;
grant execute on function public.marcar_llegada_proveedor(uuid) to authenticated;

notify pgrst,'reload schema';
