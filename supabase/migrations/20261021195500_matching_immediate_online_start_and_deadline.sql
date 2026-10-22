-- UGO P0 2026-10-21: keep existing Online GPS guards and restore the matching cycle.
-- Immediate work must start during declared provider hours; scheduled work retains
-- full duration restrictions. Debt, zone, pilot, conflicts and strict GPS are unchanged.
-- Definer already authenticates and authorizes client or Admin before updating services;
-- public.iniciar_matching invokes it but cannot change matching_expires_at with owner RLS.

CREATE OR REPLACE FUNCTION private.proveedor_puede_recibir_oferta(p_proveedor_id uuid, p_servicio_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_target public.servicios%rowtype;
  v_target_start timestamptz;
  v_target_end timestamptz;
  v_target_duration integer;
  v_buffer interval := interval '30 minutes';
begin
  if not private.pilot_servicio_generico_permitido(p_servicio_id) then return false; end if;
  if not private.proveedor_zonas_permitem(p_proveedor_id,p_servicio_id) then return false; end if;
  select * into v_target
  from public.servicios
  where id=p_servicio_id;

  if not found or v_target.proveedor_id is not null
     or v_target.estado not in ('borrador','buscando','ofrecido') then
    return false;
  end if;

  v_target_start := v_target.programado_para;
  v_target_duration := private.service_duration_minutes(v_target.metadata);
  v_target_end := coalesce(v_target_start,now()) + make_interval(mins=>v_target_duration);
  -- In-hours immediate requests may start now; scheduled work must fit its full duration.
  if v_target_start is null then
    if not private.proveedor_horario_permite(p_proveedor_id,now(),1) then return false; end if;
  elsif not private.proveedor_horario_permite(p_proveedor_id,v_target_start,v_target_duration) then
    return false;
  end if;

  if v_target_start is not null and v_target_start < now() - interval '15 minutes' then
    return false;
  end if;

  if exists(
    select 1
    from public.servicios existing
    where existing.proveedor_id=p_proveedor_id
      and existing.id<>p_servicio_id
      and existing.estado in ('en_camino','llegado','en_progreso')
  ) then
    if v_target_start is null then return false; end if;

    if exists(
      select 1
      from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado in ('en_camino','llegado','en_progreso')
        and v_target_start < (
          case
            when existing.estado='en_progreso' and existing.iniciado_at is not null then
              greatest(
                existing.iniciado_at
                  + make_interval(mins=>private.service_duration_minutes(existing.metadata))
                  + v_buffer,
                now()+v_buffer
              )
            else
              greatest(coalesce(existing.programado_para,now()),now())
                + make_interval(mins=>private.service_duration_minutes(existing.metadata))
                + v_buffer
          end
        )
    ) then
      return false;
    end if;
  end if;

  if v_target_start is null then
    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is null
    ) then
      return false;
    end if;

    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para
              + make_interval(mins=>private.service_duration_minutes(existing.metadata))
            > now() - v_buffer
    ) then
      return false;
    end if;
  else
    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is null
    ) then
      return false;
    end if;

    if exists(
      select 1 from public.servicios existing
      where existing.proveedor_id=p_proveedor_id
        and existing.id<>p_servicio_id
        and existing.estado='asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para
              + make_interval(mins=>private.service_duration_minutes(existing.metadata))
            > v_target_start - v_buffer
    ) then
      return false;
    end if;
  end if;

  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.iniciar_matching_impl(p_servicio_id uuid)
 RETURNS TABLE(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions', 'pg_temp'
AS $function$
declare
  v_servicio public.servicios%rowtype;
  v_count integer;
  v_live_count integer;
  v_client_lat double precision;
  v_client_lng double precision;
  v_alert_radius_m constant double precision := 20000;
  v_geo_epsilon_m constant double precision := 0.01;
  v_gps_freshness constant interval := interval '90 seconds';
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
          and extensions.st_dwithin(v_servicio.ubicacion_cliente,pp.ubicacion,private.provider_operating_radius_m(pp.usuario_id)+v_geo_epsilon_m)
          and not private.proveedor_bloqueado_por_deuda_ugo(o.proveedor_id)
          and private.proveedor_puede_recibir_oferta(o.proveedor_id,p_servicio_id)
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
       set estado='ofrecido',updated_at=now(),matching_expires_at=now()+interval '5 minutes'
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
      and private.proveedor_puede_recibir_oferta(u.id,p_servicio_id)
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
      and extensions.st_dwithin(v_servicio.ubicacion_cliente,pp.ubicacion,private.provider_operating_radius_m(pp.usuario_id)+v_geo_epsilon_m)
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
    raise log 'provider_candidate service_id=% provider_id=% distance_km=% provider_radius_mode=dynamic eligible=true reason=within_radius',
      p_servicio_id,v_candidate.proveedor_id,v_candidate.distancia_km;
  end loop;

  update public.servicios
     set estado=case when v_count>0 then 'ofrecido'::public.servicio_estado else 'buscando'::public.servicio_estado end,
         updated_at=now(),matching_expires_at=now()+interval '5 minutes'
   where id=p_servicio_id;

  raise log 'provider_dispatch service_id=% eligible_count=% provider_radius_mode=dynamic gps_freshness_seconds=90',p_servicio_id,v_count;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
    from public.ofertas_servicio o
    join public.usuarios u on u.id=o.proveedor_id
   where o.servicio_id=p_servicio_id
     and o.estado='pendiente'
   order by o.ranking;
end;
$function$
;
