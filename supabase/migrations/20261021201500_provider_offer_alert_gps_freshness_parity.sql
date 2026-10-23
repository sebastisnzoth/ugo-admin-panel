-- UGO P0: Match and notification MUST have the same 90-second trusted GPS freshness.
-- Offer dispatch already requires recent accurate GPS (<=90 s); the notification
-- previously suppressed valid dispatched offers older than 30 s, leaving the
-- provider without a persisted nueva_oferta or Web Push. Keep all other GPS,
-- geofence, online, accuracy, and dedupe guards identical.

CREATE OR REPLACE FUNCTION private.notify_provider_new_offer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'extensions', 'pg_temp'
AS $function$
declare
  v_numero bigint;
  v_programado timestamptz;
  v_client_location extensions.geography;
  v_provider_location extensions.geography;
  v_provider_location_at timestamptz;
  v_accuracy_m double precision;
  v_distance_m double precision;
  v_cycle_key text;
  v_alert_radius_m double precision;
  v_geo_epsilon_m constant double precision := 0.01;
begin
  if new.estado::text <> 'pendiente' then return new; end if;
  v_alert_radius_m := private.provider_operating_radius_m(new.proveedor_id);

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
     or v_provider_location_at < now()-interval '90 seconds'
     or v_provider_location_at > now()+interval '5 seconds'
     or v_accuracy_m is null
     or v_accuracy_m <= 0
     or v_accuracy_m > 250
     or (
       abs(extensions.st_y(v_provider_location::extensions.geometry)) < 0.0001
       and abs(extensions.st_x(v_provider_location::extensions.geometry)) < 0.0001
     )
     or not extensions.st_dwithin(v_client_location,v_provider_location,v_alert_radius_m+v_geo_epsilon_m) then
    if v_client_location is not null and v_provider_location is not null then
      v_distance_m := extensions.st_distance(v_client_location,v_provider_location);
    end if;
    raise log 'provider_offer_alert_suppressed service_id=% provider_id=% distance_m=% provider_radius_m=% reason=geo_or_gps_ineligible',
      new.servicio_id,new.proveedor_id,v_distance_m,v_alert_radius_m;
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
      'radio_max_km',round((v_alert_radius_m/1000.0)::numeric,2)
    ),
    'oferta:'||new.id::text||':'||v_cycle_key
  );

  raise log 'provider_offer_alert service_id=% provider_id=% distance_m=% provider_radius_m=% eligible=true',
    new.servicio_id,new.proveedor_id,v_distance_m,v_alert_radius_m;
  return new;
end;
$function$
;
