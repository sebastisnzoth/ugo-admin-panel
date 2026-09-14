-- Keep automatic and directed matching consistent with the public multirubro radar.
-- A provider qualifies when the requested category is principal, is represented
-- by an active provider_subcategorias row, or the legacy principal category is null.

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

  update public.ofertas_servicio
     set estado='expirada',respondida_at=coalesce(respondida_at,now())
   where servicio_id=p_servicio_id and estado='pendiente';

  with candidatos as (
    select
      u.id candidato_proveedor_id,
      u.nombre,
      u.karma,
      case when v_servicio.ubicacion_cliente is not null and pp.ubicacion is not null
        then round((extensions.st_distance(v_servicio.ubicacion_cliente,pp.ubicacion)/1000.0)::numeric,2)
        else null end candidato_distancia_km,
      case
        when v_servicio.tarifa is not null and v_servicio.tarifa>0 then v_servicio.tarifa
        when pp.tarifa_base is not null and pp.tarifa_base>0 then pp.tarifa_base
        else null
      end candidato_tarifa,
      row_number() over(
        order by
          case
            when pp.categoria_principal_id=v_servicio.categoria_id then 0
            when exists (
              select 1
              from public.proveedor_subcategorias ps
              join public.subcategorias sc on sc.id=ps.subcategoria_id
              where ps.proveedor_id=u.id
                and ps.activa=true
                and sc.activa=true
                and sc.categoria_id=v_servicio.categoria_id
            ) then 1
            else 2
          end,
          u.karma desc,
          pp.updated_at desc
      )::integer candidato_ranking
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id=u.id
    where u.tipo='proveedor'
      and u.activo
      and pp.disponible
      and pp.online
      and pp.estado_verificacion='verificado'
      and pp.onboarding_completo_at is not null
      and pp.termos_aceitos_at is not null
      and u.id<>v_servicio.cliente_id
      and (
        pp.categoria_principal_id is null
        or pp.categoria_principal_id=v_servicio.categoria_id
        or exists (
          select 1
          from public.proveedor_subcategorias ps
          join public.subcategorias sc on sc.id=ps.subcategoria_id
          where ps.proveedor_id=u.id
            and ps.activa=true
            and sc.activa=true
            and sc.categoria_id=v_servicio.categoria_id
        )
      )
      and ((v_servicio.tarifa is not null and v_servicio.tarifa>0) or (pp.tarifa_base is not null and pp.tarifa_base>0))
      and not exists (
        select 1
          from public.ofertas_servicio prev
         where prev.servicio_id=p_servicio_id
           and prev.proveedor_id=u.id
           and (
             prev.estado='rechazada'
             or (
               prev.estado='expirada'
               and coalesce(prev.respondida_at,prev.expira_at,prev.created_at)>now()-interval '30 minutes'
             )
           )
      )
    limit 3
  ), inserted as (
    insert into public.ofertas_servicio as os(
      servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at
    )
    select
      p_servicio_id,c.candidato_proveedor_id,'pendiente',c.candidato_ranking,
      c.candidato_distancia_km,c.candidato_tarifa,now()+interval '5 minutes'
    from candidatos c
    where c.candidato_tarifa is not null and c.candidato_tarifa>0
    on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key do update set
      estado='pendiente',
      ranking=excluded.ranking,
      distancia_km=excluded.distancia_km,
      tarifa_ofrecida=excluded.tarifa_ofrecida,
      expira_at=excluded.expira_at,
      respondida_at=null
    returning os.id,os.proveedor_id,os.distancia_km,os.tarifa_ofrecida,os.ranking
  )
  select count(*) into v_count from inserted;

  update public.servicios
     set estado=case when v_count>0 then 'ofrecido'::public.servicio_estado else 'buscando'::public.servicio_estado end,
         updated_at=now()
   where id=p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
    from public.ofertas_servicio o
    join public.usuarios u on u.id=o.proveedor_id
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
  v_tarifa numeric;
  v_secondary_match boolean;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then raise exception 'El servicio ya no admite matching'; end if;

  select u.id,u.nombre,u.karma,pp.ubicacion,pp.disponible,pp.online,pp.categoria_principal_id,pp.estado_verificacion,pp.tarifa_base
    into v_provider
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id=u.id
   where u.id=p_proveedor_id
     and u.tipo='proveedor'
     and u.activo=true
     and pp.disponible=true
     and pp.online=true
     and pp.estado_verificacion='verificado'
     and pp.onboarding_completo_at is not null
     and pp.termos_aceitos_at is not null;
  if not found then raise exception 'El proveedor está offline, no disponible o no verificado'; end if;

  select exists (
    select 1
    from public.proveedor_subcategorias ps
    join public.subcategorias sc on sc.id=ps.subcategoria_id
    where ps.proveedor_id=p_proveedor_id
      and ps.activa=true
      and sc.activa=true
      and sc.categoria_id=v_servicio.categoria_id
  ) into v_secondary_match;

  if v_provider.categoria_principal_id is not null
     and v_provider.categoria_principal_id<>v_servicio.categoria_id
     and not v_secondary_match then
    raise exception 'El proveedor no trabaja en esta categoría';
  end if;

  v_tarifa:=case
    when v_servicio.tarifa is not null and v_servicio.tarifa>0 then v_servicio.tarifa
    when v_provider.tarifa_base is not null and v_provider.tarifa_base>0 then v_provider.tarifa_base
    else null
  end;
  if v_tarifa is null or v_tarifa<=0 then raise exception 'El profesional debe definir una tarifa válida antes de recibir este pedido'; end if;
  if v_servicio.ubicacion_cliente is not null and v_provider.ubicacion is not null then
    v_distancia:=round((extensions.st_distance(v_servicio.ubicacion_cliente,v_provider.ubicacion)/1000.0)::numeric,2);
  end if;

  update public.ofertas_servicio set estado='expirada',respondida_at=now() where servicio_id=p_servicio_id and estado='pendiente';
  insert into public.ofertas_servicio(servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at)
  values(p_servicio_id,p_proveedor_id,'pendiente',1,v_distancia,v_tarifa,now()+interval '5 minutes')
  on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key do update set
    estado='pendiente',ranking=1,distancia_km=excluded.distancia_km,tarifa_ofrecida=excluded.tarifa_ofrecida,
    expira_at=excluded.expira_at,respondida_at=null;

  update public.servicios set estado='ofrecido',updated_at=now() where id=p_servicio_id;
  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
    from public.ofertas_servicio o
    join public.usuarios u on u.id=o.proveedor_id
   where o.servicio_id=p_servicio_id and o.proveedor_id=p_proveedor_id and o.estado='pendiente';
end;
$function$;
