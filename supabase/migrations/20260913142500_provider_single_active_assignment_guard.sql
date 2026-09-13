-- UGO TEST · P0 integrity guard.
-- The current provider product contract supports one active assigned service at a time.
-- Enforce that rule server-side and serialize competing acceptances by provider row.

create or replace function private.aceptar_oferta_impl(p_oferta_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
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
    and pp.disponible = true
  for update of pp;

  if not found then
    raise exception 'Debés estar verificado, online y disponible para aceptar';
  end if;

  if exists (
    select 1
    from public.servicios existing
    where existing.proveedor_id = v_uid
      and existing.id <> v_servicio.id
      and existing.estado in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
  ) then
    raise exception 'Ya tenés un trabajo activo. Finalizalo antes de aceptar otro.';
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
$function$;
