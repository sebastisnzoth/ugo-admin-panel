-- UGO · P0 contrato asignación -> pago
--
-- Un servicio puede nacer sin tarifa cuando Hugo todavía no dispone de una referencia
-- real. El matching debe convertir esa incertidumbre en una oferta con una tarifa real
-- del proveedor, y la aceptación nunca debe dejar un servicio `asignado` sin importe
-- cobrable.
--
-- Reglas:
--   1. Si el cliente ya confirmó una tarifa positiva, se conserva.
--   2. Si no, cada oferta usa `perfiles_proveedor.tarifa_base` cuando sea positiva.
--   3. No se ofrece/acepta un servicio sin ninguna tarifa real disponible.
--   4. La aceptación escribe proveedor + tarifa + comisión + neto en la misma
--      transacción y bajo el lock canónico del servicio.

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

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id <> auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then
    raise exception 'El servicio ya no admite matching';
  end if;

  update public.ofertas_servicio
     set estado = 'expirada', respondida_at = now()
   where servicio_id = p_servicio_id
     and estado = 'pendiente';

  with candidatos as (
    select
      u.id as candidato_proveedor_id,
      u.nombre,
      u.karma,
      case
        when v_servicio.ubicacion_cliente is not null and pp.ubicacion is not null
          then round((extensions.st_distance(v_servicio.ubicacion_cliente,pp.ubicacion)/1000.0)::numeric,2)
        else null
      end as candidato_distancia_km,
      case
        when v_servicio.tarifa is not null and v_servicio.tarifa > 0 then v_servicio.tarifa
        when pp.tarifa_base is not null and pp.tarifa_base > 0 then pp.tarifa_base
        else null
      end as candidato_tarifa,
      row_number() over (
        order by
          case when pp.categoria_principal_id = v_servicio.categoria_id then 0 else 1 end,
          u.karma desc,
          pp.updated_at desc
      )::integer as candidato_ranking
    from public.usuarios u
    join public.perfiles_proveedor pp on pp.usuario_id = u.id
    where u.tipo = 'proveedor'
      and u.activo = true
      and pp.disponible = true
      and pp.online = true
      and pp.estado_verificacion = 'verificado'
      and u.id <> v_servicio.cliente_id
      and (pp.categoria_principal_id is null or pp.categoria_principal_id = v_servicio.categoria_id)
      and (
        (v_servicio.tarifa is not null and v_servicio.tarifa > 0)
        or (pp.tarifa_base is not null and pp.tarifa_base > 0)
      )
    limit 3
  ), inserted as (
    insert into public.ofertas_servicio as os(
      servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at
    )
    select
      p_servicio_id,
      c.candidato_proveedor_id,
      'pendiente'::public.oferta_estado,
      c.candidato_ranking,
      c.candidato_distancia_km,
      c.candidato_tarifa,
      now() + interval '5 minutes'
    from candidatos c
    where c.candidato_tarifa is not null and c.candidato_tarifa > 0
    on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
    do update set
      estado = 'pendiente',
      ranking = excluded.ranking,
      distancia_km = excluded.distancia_km,
      tarifa_ofrecida = excluded.tarifa_ofrecida,
      expira_at = excluded.expira_at,
      respondida_at = null
    returning os.id,os.proveedor_id,os.distancia_km,os.tarifa_ofrecida,os.ranking
  )
  select count(*) into v_count from inserted;

  update public.servicios
     set estado = case
                    when v_count > 0 then 'ofrecido'::public.servicio_estado
                    else 'buscando'::public.servicio_estado
                  end,
         updated_at = now()
   where id = p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o
  join public.usuarios u on u.id = o.proveedor_id
  where o.servicio_id = p_servicio_id
    and o.estado = 'pendiente'
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
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id <> auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if v_servicio.estado not in ('borrador','buscando','ofrecido') then
    raise exception 'El servicio ya no admite matching';
  end if;

  select
    u.id,u.nombre,u.karma,pp.ubicacion,pp.disponible,pp.online,
    pp.categoria_principal_id,pp.estado_verificacion,pp.tarifa_base
  into v_provider
  from public.usuarios u
  join public.perfiles_proveedor pp on pp.usuario_id = u.id
  where u.id = p_proveedor_id
    and u.tipo = 'proveedor'
    and u.activo = true
    and pp.disponible = true
    and pp.online = true
    and pp.estado_verificacion = 'verificado';

  if not found then raise exception 'El proveedor está offline, no disponible o no verificado'; end if;
  if v_provider.categoria_principal_id is not null
     and v_provider.categoria_principal_id <> v_servicio.categoria_id then
    raise exception 'El proveedor no trabaja en esta categoría';
  end if;

  v_tarifa := case
                when v_servicio.tarifa is not null and v_servicio.tarifa > 0 then v_servicio.tarifa
                when v_provider.tarifa_base is not null and v_provider.tarifa_base > 0 then v_provider.tarifa_base
                else null
              end;

  if v_tarifa is null or v_tarifa <= 0 then
    raise exception 'El profesional debe definir una tarifa válida antes de recibir este pedido';
  end if;

  if v_servicio.ubicacion_cliente is not null and v_provider.ubicacion is not null then
    v_distancia := round((extensions.st_distance(v_servicio.ubicacion_cliente,v_provider.ubicacion)/1000.0)::numeric,2);
  else
    v_distancia := null;
  end if;

  update public.ofertas_servicio
     set estado = 'expirada', respondida_at = now()
   where servicio_id = p_servicio_id
     and estado = 'pendiente';

  insert into public.ofertas_servicio(
    servicio_id,proveedor_id,estado,ranking,distancia_km,tarifa_ofrecida,expira_at
  ) values (
    p_servicio_id,p_proveedor_id,'pendiente'::public.oferta_estado,1,v_distancia,v_tarifa,now()+interval '5 minutes'
  )
  on conflict on constraint ofertas_servicio_servicio_id_proveedor_id_key
  do update set
    estado = 'pendiente',
    ranking = 1,
    distancia_km = excluded.distancia_km,
    tarifa_ofrecida = excluded.tarifa_ofrecida,
    expira_at = excluded.expira_at,
    respondida_at = null;

  update public.servicios
     set estado = 'ofrecido', updated_at = now()
   where id = p_servicio_id;

  return query
  select o.id,o.proveedor_id,u.nombre,u.karma,o.distancia_km,o.tarifa_ofrecida,o.ranking
  from public.ofertas_servicio o
  join public.usuarios u on u.id = o.proveedor_id
  where o.servicio_id = p_servicio_id
    and o.proveedor_id = p_proveedor_id
    and o.estado = 'pendiente';
end;
$function$;

create or replace function private.aceptar_oferta_impl(p_oferta_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_oferta public.ofertas_servicio%rowtype;
  v_servicio public.servicios%rowtype;
  v_tarifa_base numeric;
  v_total numeric;
  v_comision numeric;
  v_neto numeric;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;

  select * into v_oferta
  from public.ofertas_servicio
  where id = p_oferta_id;

  if not found or v_oferta.proveedor_id <> v_uid then
    raise exception 'Oferta inexistente o no autorizada';
  end if;

  select * into v_servicio
  from public.servicios
  where id = v_oferta.servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;

  select * into v_oferta
  from public.ofertas_servicio
  where id = p_oferta_id
  for update;

  if not found or v_oferta.proveedor_id <> v_uid or v_oferta.servicio_id <> v_servicio.id then
    raise exception 'Oferta inexistente o no autorizada';
  end if;

  if v_oferta.estado = 'aceptada'
     and v_servicio.proveedor_id = v_uid
     and v_servicio.estado not in ('cancelado','disputado') then
    return v_servicio;
  end if;

  if v_oferta.estado <> 'pendiente' then return null; end if;

  if v_oferta.expira_at is not null and v_oferta.expira_at <= now() then
    update public.ofertas_servicio
       set estado = 'expirada', respondida_at = coalesce(respondida_at, now())
     where id = p_oferta_id and estado = 'pendiente';
    return null;
  end if;

  select pp.tarifa_base
    into v_tarifa_base
  from public.usuarios u
  join public.perfiles_proveedor pp on pp.usuario_id = u.id
  where u.id = v_uid
    and u.tipo = 'proveedor'
    and u.activo = true
    and pp.estado_verificacion = 'verificado'
    and pp.online = true
    and pp.disponible = true;

  if not found then
    raise exception 'Debés estar verificado, online y disponible para aceptar';
  end if;

  if v_servicio.proveedor_id is not null
     or v_servicio.estado not in ('buscando','ofrecido') then
    update public.ofertas_servicio
       set estado = 'expirada', respondida_at = coalesce(respondida_at, now())
     where id = p_oferta_id and estado = 'pendiente';
    return null;
  end if;

  v_total := case
               when v_oferta.tarifa_ofrecida is not null and v_oferta.tarifa_ofrecida > 0 then v_oferta.tarifa_ofrecida
               when v_servicio.tarifa is not null and v_servicio.tarifa > 0 then v_servicio.tarifa
               when v_tarifa_base is not null and v_tarifa_base > 0 then v_tarifa_base
               else null
             end;

  if v_total is null or v_total <= 0 then
    raise exception 'No se puede aceptar el servicio sin una tarifa real válida';
  end if;

  v_comision := round(v_total * 0.15, 2);
  v_neto := v_total - v_comision;

  update public.servicios
     set proveedor_id = v_uid,
         estado = 'asignado',
         tarifa = v_total,
         comision_ugo = v_comision,
         ganancia_proveedor = v_neto,
         aceptado_at = coalesce(aceptado_at, now()),
         updated_at = now()
   where id = v_servicio.id
     and proveedor_id is null
     and estado in ('buscando','ofrecido')
  returning * into v_servicio;

  if not found then
    update public.ofertas_servicio
       set estado = 'expirada', respondida_at = coalesce(respondida_at, now())
     where id = p_oferta_id and estado = 'pendiente';
    return null;
  end if;

  update public.ofertas_servicio
     set estado = case
                    when id = p_oferta_id then 'aceptada'::public.oferta_estado
                    else 'rechazada'::public.oferta_estado
                  end,
         respondida_at = coalesce(respondida_at, now())
   where servicio_id = v_servicio.id
     and estado = 'pendiente';

  return v_servicio;
end;
$$;

revoke execute on function private.iniciar_matching_impl(uuid) from public, anon;
grant execute on function private.iniciar_matching_impl(uuid) to authenticated, service_role;
revoke execute on function private.aceptar_oferta_impl(uuid) from public, anon;
grant execute on function private.aceptar_oferta_impl(uuid) to authenticated, service_role;
