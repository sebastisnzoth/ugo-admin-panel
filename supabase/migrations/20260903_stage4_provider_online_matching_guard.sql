-- ETAPA 4: un proveedor solo es elegible si esta disponible Y online.

create or replace function private.iniciar_matching_impl(p_servicio_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  v_servicio public.servicios%rowtype;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then raise exception 'El servicio ya no admite matching'; end if;

  update public.ofertas_servicio set estado='expirada',respondida_at=now()
  where servicio_id=p_servicio_id and estado='pendiente';

  with candidatos as (
    select u.id as candidato_proveedor_id,u.nombre,u.karma,
      case when v_servicio.ubicacion_cliente is not null and pp.ubicacion is not null
        then round((extensions.st_distance(v_servicio.ubicacion_cliente,pp.ubicacion)/1000.0)::numeric,2)
        else null end as candidato_distancia_km,
      row_number() over (
        order by case when pp.categoria_principal_id=v_servicio.categoria_id then 0 else 1 end,
                 u.karma desc,pp.updated_at desc
      )::integer as candidato_ranking
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id=u.id
    where u.tipo='proveedor' and u.activo and pp.disponible and pp.online
      and u.id<>v_servicio.cliente_id
      and (pp.categoria_principal_id is null or pp.categoria_principal_id=v_servicio.categoria_id)
    limit 3
  ), inserted as (
    insert into public.ofertas_servicio as os(servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at)
    select p_servicio_id,c.candidato_proveedor_id,'pendiente'::public.oferta_estado,c.candidato_ranking,c.candidato_distancia_km,v_servicio.tarifa,now()+interval '5 minutes'
    from candidatos c
    on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
    do update set estado='pendiente',ranking=excluded.ranking,distancia_km=excluded.distancia_km,tarifa_ofrecida=excluded.tarifa_ofrecida,expira_at=excluded.expira_at,respondida_at=null
    returning os.id,os.proveedor_id,os.distancia_km,os.tarifa_ofrecida,os.ranking
  )
  select count(*) into v_count from inserted;

  update public.servicios set estado=case when v_count>0 then 'ofrecido'::public.servicio_estado else 'buscando'::public.servicio_estado end
  where id=p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o join public.usuarios u on u.id=o.proveedor_id
  where o.servicio_id=p_servicio_id and o.estado='pendiente'
  order by o.ranking;
end;
$function$;

create or replace function public.iniciar_matching_dirigido(p_servicio_id uuid,p_proveedor_id uuid)
returns table(oferta_id uuid, proveedor_id uuid, proveedor_nombre text, karma numeric, distancia_km numeric, tarifa_ofrecida numeric, ranking integer)
language plpgsql
security definer
set search_path to 'public','private','extensions','pg_temp'
as $function$
declare
  v_servicio public.servicios%rowtype;
  v_provider record;
  v_distancia numeric;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then raise exception 'El servicio ya no admite matching'; end if;

  select u.id,u.nombre,u.karma,pp.ubicacion,pp.disponible,pp.online,pp.categoria_principal_id
  into v_provider
  from public.usuarios u join public.perfiles_proveedor pp on pp.usuario_id=u.id
  where u.id=p_proveedor_id and u.tipo='proveedor' and u.activo and pp.disponible and pp.online;
  if not found then raise exception 'El proveedor está offline o no disponible'; end if;

  if v_provider.categoria_principal_id is not null and v_provider.categoria_principal_id<>v_servicio.categoria_id then
    raise exception 'El proveedor no trabaja en esta categoría';
  end if;

  if v_servicio.ubicacion_cliente is not null and v_provider.ubicacion is not null then
    v_distancia:=round((extensions.st_distance(v_servicio.ubicacion_cliente,v_provider.ubicacion)/1000.0)::numeric,2);
  else v_distancia:=null; end if;

  update public.ofertas_servicio set estado='expirada',respondida_at=now()
  where servicio_id=p_servicio_id and estado='pendiente';

  insert into public.ofertas_servicio(servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at)
  values(p_servicio_id,p_proveedor_id,'pendiente'::public.oferta_estado,1,v_distancia,v_servicio.tarifa,now()+interval '5 minutes')
  on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
  do update set estado='pendiente',ranking=1,distancia_km=excluded.distancia_km,tarifa_ofrecida=excluded.tarifa_ofrecida,expira_at=excluded.expira_at,respondida_at=null;

  update public.servicios set estado='ofrecido' where id=p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o join public.usuarios u on u.id=o.proveedor_id
  where o.servicio_id=p_servicio_id and o.proveedor_id=p_proveedor_id and o.estado='pendiente';
end;
$function$;
