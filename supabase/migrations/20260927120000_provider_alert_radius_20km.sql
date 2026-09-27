-- UGO P0 · Provider offer alerts are limited to 20 km from the service pickup.
-- Backend source of truth. Arrival geofence remains independently fixed at 200 m.

create or replace function public.publicar_ubicacion_disponibilidad_proveedor(
  p_lat double precision,
  p_lng double precision,
  p_captured_at timestamptz,
  p_accuracy_m double precision
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_age_ms double precision;
begin
  if v_uid is null then raise exception 'Sesión requerida'; end if;
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90
     or p_lng < -180 or p_lng > 180
     or (abs(p_lat) < 0.0001 and abs(p_lng) < 0.0001) then
    raise exception 'Coordenadas GPS inválidas';
  end if;
  if p_captured_at is null then raise exception 'Timestamp de captura GPS requerido'; end if;
  v_age_ms := extract(epoch from (now() - p_captured_at)) * 1000.0;
  if v_age_ms < -5000 or v_age_ms > 30000 then
    raise exception 'Ubicación GPS antigua o con reloj inválido';
  end if;
  if p_accuracy_m is null or p_accuracy_m <= 0 or p_accuracy_m > 250 then
    raise exception 'Precisión GPS insuficiente';
  end if;
  if not exists (
    select 1
      from public.usuarios u
      join public.perfiles_proveedor pp on pp.usuario_id=u.id
     where u.id=v_uid
       and u.tipo='proveedor'
       and u.activo=true
       and pp.online=true
       and pp.disponible=true
  ) then
    raise exception 'Proveedor no disponible para recibir pedidos';
  end if;

  perform set_config('ugo.trusted_provider_location',v_uid::text,true);
  update public.perfiles_proveedor
     set ubicacion=extensions.st_setsrid(extensions.st_makepoint(p_lng,p_lat),4326)::extensions.geography,
         ubicacion_updated_at=p_captured_at,
         ubicacion_accuracy_m=p_accuracy_m
   where usuario_id=v_uid
     and (ubicacion_updated_at is null or p_captured_at >= ubicacion_updated_at);
  perform set_config('ugo.trusted_provider_location','',true);

  if not found then
    raise exception 'La posición GPS es anterior a la última ubicación persistida';
  end if;

  update public.usuarios
     set lat=p_lat,lng=p_lng,updated_at=now()
   where id=v_uid;

  return jsonb_build_object(
    'status','published',
    'captured_at',p_captured_at,
    'accuracy_m',p_accuracy_m
  );
end;
$$;

revoke all on function public.publicar_ubicacion_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) from public;
revoke all on function public.publicar_ubicacion_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) from anon;
grant execute on function public.publicar_ubicacion_disponibilidad_proveedor(double precision,double precision,timestamptz,double precision) to authenticated;

create or replace function private.iniciar_matching_impl(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_count integer;
  v_live_count integer;
  v_client_lat double precision;
  v_client_lng double precision;
  v_alert_radius_m constant double precision := 20000;
  v_gps_freshness constant interval := interval '30 seconds';
  v_candidate record;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
    from public.servicios
   where id=p_servicio_id
   for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then
    raise exception 'El servicio ya no admite matching';
  end if;

  if v_servicio.ubicacion_cliente is null then
    raise log 'provider_dispatch service_id=% eligible=false reason=client_location_missing max_radius_m=%',p_servicio_id,v_alert_radius_m;
    raise exception 'Ubicación válida del cliente requerida para distribuir el pedido';
  end if;

  v_client_lat := extensions.st_y(v_servicio.ubicacion_cliente::extensions.geometry);
  v_client_lng := extensions.st_x(v_servicio.ubicacion_cliente::extensions.geometry);

  if v_client_lat is null or v_client_lng is null
     or v_client_lat < -90 or v_client_lat > 90
     or v_client_lng < -180 or v_client_lng > 180
     or (abs(v_client_lat) < 0.0001 and abs(v_client_lng) < 0.0001) then
    raise log 'provider_dispatch service_id=% eligible=false reason=client_location_invalid max_radius_m=%',p_servicio_id,v_alert_radius_m;
    raise exception 'Ubicación válida del cliente requerida para distribuir el pedido';
  end if;

  -- Pending offers are still eligible only while the provider remains online,
  -- debt-safe, on fresh trusted GPS, and within the 20 km dispatch radius.
  update public.ofertas_servicio o
     set estado='expirada',
         respondida_at=coalesce(o.respondida_at,now())
   where o.servicio_id=p_servicio_id
     and o.estado='pendiente'
     and not exists (
       select 1
         from public.perfiles_proveedor pp
        where pp.usuario_id=o.proveedor_id
          and pp.online=true
          and pp.disponible=true
          and pp.ubicacion is not null
          and pp.ubicacion_updated_at is not null
          and pp.ubicacion_updated_at >= now()-v_gps_freshness
          and pp.ubicacion_updated_at <= now()+interval '5 seconds'
          and pp.ubicacion_accuracy_m is not null
          and pp.ubicacion_accuracy_m > 0
          and pp.ubicacion_accuracy_m <= 250
          and not (
            abs(extensions.st_y(pp.ubicacion::extensions.geometry)) < 0.0001
            and abs(extensions.st_x(pp.ubicacion::extensions.geometry)) < 0.0001
          )
          and extensions.st_dwithin(v_servicio.ubicacion_cliente,pp.ubicacion,v_alert_radius_m)
          and not private.proveedor_bloqueado_por_deuda_ugo(o.proveedor_id)
     );

  select count(*) into v_live_count
    from public.ofertas_servicio
   where servicio_id=p_servicio_id
     and estado='pendiente'
     and (expira_at is null or expira_at>now());

  if v_live_count>0 then
    update public.ofertas_servicio
       set expira_at=now()+interval '5 minutes'
     where servicio_id=p_servicio_id
       and estado='pendiente'
       and (expira_at is null or expira_at>now());

    update public.servicios
       set estado='ofrecido',updated_at=now()
     where id=p_servicio_id and estado<>'ofrecido';

    return query
    select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
      from public.ofertas_servicio o
      join public.usuarios u on u.id=o.proveedor_id
     where o.servicio_id=p_servicio_id
       and o.estado='pendiente'
       and (o.expira_at is null or o.expira_at>now())
     order by o.ranking;
    return;
  end if;

  update public.ofertas_servicio
     set estado='expirada',respondida_at=coalesce(respondida_at,now())
   where servicio_id=p_servicio_id and estado='pendiente';

  with candidatos_base as (
    select
      u.id candidato_proveedor_id,
      u.nombre,
      u.karma,
      round((extensions.st_distance(v_servicio.ubicacion_cliente,pp.ubicacion)/1000.0)::numeric,2) candidato_distancia_km,
      case
        when v_servicio.tarifa is not null and v_servicio.tarifa>0 then v_servicio.tarifa
        when pp.tarifa_base is not null and pp.tarifa_base>0 then pp.tarifa_base
        else null
      end candidato_tarifa,
      case
        when pp.categoria_principal_id=v_servicio.categoria_id then 0
        when v_servicio.categoria_id=any(coalesce(u.categorias_ids,'{}'::uuid[])) then 1
        when exists(
          select 1
            from public.proveedor_subcategorias ps
            join public.subcategorias sc on sc.id=ps.subcategoria_id
           where ps.proveedor_id=u.id
             and ps.activa=true
             and sc.activa=true
             and sc.categoria_id=v_servicio.categoria_id
        ) then 2
        else 3
      end category_rank
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id=u.id
    where u.tipo='proveedor'
      and u.activo=true
      and pp.disponible=true
      and pp.online=true
      and pp.estado_verificacion='verificado'
      and pp.onboarding_completo_at is not null
      and pp.termos_aceitos_at is not null
      and u.id<>v_servicio.cliente_id
      and private.proveedor_trabaja_categoria(u.id,v_servicio.categoria_id)
      and not private.proveedor_bloqueado_por_deuda_ugo(u.id)
      and ((v_servicio.tarifa is not null and v_servicio.tarifa>0) or (pp.tarifa_base is not null and pp.tarifa_base>0))
      and pp.ubicacion is not null
      and pp.ubicacion_updated_at is not null
      and pp.ubicacion_updated_at >= now()-v_gps_freshness
      and pp.ubicacion_updated_at <= now()+interval '5 seconds'
      and pp.ubicacion_accuracy_m is not null
      and pp.ubicacion_accuracy_m > 0
      and pp.ubicacion_accuracy_m <= 250
      and not (
        abs(extensions.st_y(pp.ubicacion::extensions.geometry)) < 0.0001
        and abs(extensions.st_x(pp.ubicacion::extensions.geometry)) < 0.0001
      )
      and extensions.st_dwithin(v_servicio.ubicacion_cliente,pp.ubicacion,v_alert_radius_m)
      and not exists(
        select 1
          from public.ofertas_servicio prev
         where prev.servicio_id=p_servicio_id
           and prev.proveedor_id=u.id
           and prev.estado='rechazada'
      )
  ), candidatos as (
    select b.*,
      row_number() over(
        order by b.category_rank,b.candidato_distancia_km asc,b.karma desc,b.candidato_proveedor_id
      )::integer candidato_ranking
      from candidatos_base b
     order by b.category_rank,b.candidato_distancia_km asc,b.karma desc,b.candidato_proveedor_id
     limit 3
  ), inserted as (
    insert into public.ofertas_servicio as os(
      servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at
    )
    select
      p_servicio_id,c.candidato_proveedor_id,'pendiente'::public.oferta_estado,
      c.candidato_ranking,c.candidato_distancia_km,c.candidato_tarifa,now()+interval '5 minutes'
      from candidatos c
     where c.candidato_tarifa is not null and c.candidato_tarifa>0
    on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
    do update set
      estado='pendiente',
      ranking=excluded.ranking,
      distancia_km=excluded.distancia_km,
      tarifa_ofrecida=excluded.tarifa_ofrecida,
      expira_at=excluded.expira_at,
      respondida_at=null
    returning os.id,os.proveedor_id,os.distancia_km,os.tarifa_ofrecida,os.ranking
  )
  select count(*) into v_count from inserted;

  for v_candidate in
    select o.proveedor_id,o.distancia_km
      from public.ofertas_servicio o
     where o.servicio_id=p_servicio_id
       and o.estado='pendiente'
     order by o.ranking
  loop
    raise log 'provider_candidate service_id=% provider_id=% distance_km=% max_radius_km=20 eligible=true reason=within_radius',
      p_servicio_id,v_candidate.proveedor_id,v_candidate.distancia_km;
  end loop;

  update public.servicios
     set estado=case when v_count>0 then 'ofrecido'::public.servicio_estado else 'buscando'::public.servicio_estado end,
         updated_at=now()
   where id=p_servicio_id;

  raise log 'provider_dispatch service_id=% eligible_count=% max_radius_km=20 gps_freshness_seconds=30',p_servicio_id,v_count;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
    from public.ofertas_servicio o
    join public.usuarios u on u.id=o.proveedor_id
   where o.servicio_id=p_servicio_id
     and o.estado='pendiente'
   order by o.ranking;
end;
$$;

-- Defense in depth: notification delivery independently re-checks the same
-- 20 km + trusted fresh GPS contract. Direct/legacy offer inserts cannot ring
-- a provider outside the dispatch radius.
create or replace function private.notify_provider_new_offer()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  v_numero bigint;
  v_programado timestamptz;
  v_client_location extensions.geography;
  v_provider_location extensions.geography;
  v_provider_location_at timestamptz;
  v_accuracy_m double precision;
  v_distance_m double precision;
  v_cycle_key text;
  v_alert_radius_m constant double precision := 20000;
begin
  if new.estado::text <> 'pendiente' then return new; end if;

  if tg_op='UPDATE'
     and old.estado::text='pendiente'
     and old.expira_at is not distinct from new.expira_at then
    return new;
  end if;

  select s.numero,s.programado_para,s.ubicacion_cliente
    into v_numero,v_programado,v_client_location
    from public.servicios s
   where s.id=new.servicio_id;

  select pp.ubicacion,pp.ubicacion_updated_at,pp.ubicacion_accuracy_m
    into v_provider_location,v_provider_location_at,v_accuracy_m
    from public.perfiles_proveedor pp
   where pp.usuario_id=new.proveedor_id
     and pp.online=true
     and pp.disponible=true;

  if v_client_location is null
     or v_provider_location is null
     or v_provider_location_at is null
     or v_provider_location_at < now()-interval '30 seconds'
     or v_provider_location_at > now()+interval '5 seconds'
     or v_accuracy_m is null
     or v_accuracy_m <= 0
     or v_accuracy_m > 250
     or (
       abs(extensions.st_y(v_provider_location::extensions.geometry)) < 0.0001
       and abs(extensions.st_x(v_provider_location::extensions.geometry)) < 0.0001
     )
     or not extensions.st_dwithin(v_client_location,v_provider_location,v_alert_radius_m) then
    if v_client_location is not null and v_provider_location is not null then
      v_distance_m := extensions.st_distance(v_client_location,v_provider_location);
    end if;
    raise log 'provider_offer_alert_suppressed service_id=% provider_id=% distance_m=% max_radius_m=20000 reason=geo_or_gps_ineligible',
      new.servicio_id,new.proveedor_id,v_distance_m;
    return new;
  end if;

  v_distance_m := extensions.st_distance(v_client_location,v_provider_location);
  v_cycle_key := coalesce(
    floor(extract(epoch from new.expira_at)*1000)::bigint::text,
    'sin-vencimiento'
  );

  perform private.crear_notificacion_unica(
    new.proveedor_id,
    'nueva_oferta',
    'Nuevo servicio en tu zona',
    case when v_programado is not null
      then 'Tenés una oportunidad programada para revisar.'
      else 'Hay un servicio disponible para revisar ahora.' end,
    jsonb_build_object(
      'oferta_id',new.id,
      'servicio_id',new.servicio_id,
      'numero',v_numero,
      'programado_para',v_programado,
      'expira_at',new.expira_at,
      'distancia_km',round((v_distance_m/1000.0)::numeric,2),
      'radio_max_km',20
    ),
    'oferta:'||new.id::text||':'||v_cycle_key
  );

  raise log 'provider_offer_alert service_id=% provider_id=% distance_m=% max_radius_m=20000 eligible=true',
    new.servicio_id,new.proveedor_id,v_distance_m;
  return new;
end;
$function$;

drop trigger if exists trg_notify_provider_new_offer on public.ofertas_servicio;
create trigger trg_notify_provider_new_offer
after insert or update of estado,expira_at on public.ofertas_servicio
for each row execute function private.notify_provider_new_offer();

revoke execute on function private.iniciar_matching_impl(uuid) from public, anon, authenticated;
revoke execute on function private.notify_provider_new_offer() from public, anon, authenticated;

notify pgrst,'reload schema';
