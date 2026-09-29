-- UGO · Directed provider offers must obey the same eligibility boundary as automatic matching.
-- Runtime application for this readiness control is limited to UGO Arena TEST.

create or replace function public.iniciar_matching_dirigido(
  p_servicio_id uuid,
  p_proveedor_id uuid
)
returns table(
  oferta_id uuid,
  proveedor_id uuid,
  proveedor_nombre text,
  karma numeric,
  distancia_km numeric,
  tarifa_ofrecida numeric,
  ranking integer
)
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_provider record;
  v_distancia numeric;
  v_tarifa numeric;
  v_alert_radius_m constant double precision := 20000;
  v_geo_epsilon_m constant double precision := 0.01;
  v_gps_freshness constant interval := interval '30 seconds';
  v_client_lat double precision;
  v_client_lng double precision;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then raise exception 'El servicio ya no admite matching'; end if;
  if v_servicio.ubicacion_cliente is null then raise exception 'Ubicación válida del cliente requerida para distribuir el pedido'; end if;

  v_client_lat := extensions.st_y(v_servicio.ubicacion_cliente::extensions.geometry);
  v_client_lng := extensions.st_x(v_servicio.ubicacion_cliente::extensions.geometry);
  if v_client_lat is null or v_client_lng is null
     or v_client_lat < -90 or v_client_lat > 90
     or v_client_lng < -180 or v_client_lng > 180
     or (abs(v_client_lat) < 0.0001 and abs(v_client_lng) < 0.0001) then
    raise exception 'Ubicación válida del cliente requerida para distribuir el pedido';
  end if;

  select u.id,u.nombre,u.karma,pp.ubicacion,pp.disponible,pp.online,
         pp.categoria_principal_id,pp.estado_verificacion,pp.tarifa_base,
         pp.ubicacion_updated_at,pp.ubicacion_accuracy_m
    into v_provider
  from public.usuarios u
  join public.perfiles_proveedor pp on pp.usuario_id=u.id
  where u.id=p_proveedor_id
    and u.tipo='proveedor'
    and u.activo=true
    and u.id<>v_servicio.cliente_id
    and pp.disponible=true
    and pp.online=true
    and pp.estado_verificacion='verificado'
    and pp.onboarding_completo_at is not null
    and pp.termos_aceitos_at is not null;

  if not found then raise exception 'El proveedor está offline, no disponible o no verificado'; end if;
  if private.proveedor_bloqueado_por_deuda_ugo(p_proveedor_id) then raise exception 'El proveedor alcanzó el límite de comisiones UGO pendientes'; end if;
  if not private.proveedor_trabaja_categoria(p_proveedor_id,v_servicio.categoria_id) then raise exception 'El proveedor no trabaja en esta categoría'; end if;
  if not private.proveedor_puede_recibir_oferta(p_proveedor_id,p_servicio_id) then raise exception 'El proveedor no puede recibir este pedido por disponibilidad u horario'; end if;

  if v_provider.ubicacion is null
     or v_provider.ubicacion_updated_at is null
     or v_provider.ubicacion_updated_at < now()-v_gps_freshness
     or v_provider.ubicacion_updated_at > now()+interval '5 seconds'
     or v_provider.ubicacion_accuracy_m is null
     or v_provider.ubicacion_accuracy_m <= 0
     or v_provider.ubicacion_accuracy_m > 250
     or (
       abs(extensions.st_y(v_provider.ubicacion::extensions.geometry)) < 0.0001
       and abs(extensions.st_x(v_provider.ubicacion::extensions.geometry)) < 0.0001
     ) then
    raise exception 'El proveedor no tiene una ubicación GPS reciente y válida para recibir este pedido';
  end if;

  if not extensions.st_dwithin(v_servicio.ubicacion_cliente,v_provider.ubicacion,v_alert_radius_m+v_geo_epsilon_m) then
    raise exception 'El proveedor está fuera del radio máximo de 20 km para este pedido';
  end if;

  v_distancia:=round((extensions.st_distance(v_servicio.ubicacion_cliente,v_provider.ubicacion)/1000.0)::numeric,2);
  v_tarifa:=case
    when v_servicio.tarifa is not null and v_servicio.tarifa>0 then v_servicio.tarifa
    when v_provider.tarifa_base is not null and v_provider.tarifa_base>0 then v_provider.tarifa_base
    else null
  end;
  if v_tarifa is null or v_tarifa<=0 then raise exception 'El profesional debe definir una tarifa válida antes de recibir este pedido'; end if;

  update public.ofertas_servicio
     set estado='expirada',respondida_at=coalesce(respondida_at,now())
   where servicio_id=p_servicio_id and estado='pendiente';

  insert into public.ofertas_servicio(servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at)
  values(p_servicio_id,p_proveedor_id,'pendiente'::public.oferta_estado,1,v_distancia,v_tarifa,now()+interval '5 minutes')
  on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
  do update set estado='pendiente',ranking=1,distancia_km=excluded.distancia_km,
    tarifa_ofrecida=excluded.tarifa_ofrecida,expira_at=excluded.expira_at,respondida_at=null;

  update public.servicios set estado='ofrecido',updated_at=now() where id=p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o
  join public.usuarios u on u.id=o.proveedor_id
  where o.servicio_id=p_servicio_id and o.proveedor_id=p_proveedor_id and o.estado='pendiente';
end;
$$;

revoke all on function public.iniciar_matching_dirigido(uuid,uuid) from public,anon;
grant execute on function public.iniciar_matching_dirigido(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
