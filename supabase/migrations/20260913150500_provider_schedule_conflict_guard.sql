-- UGO TEST · provider agenda conflict guard.
-- Providers may keep multiple future scheduled assignments when their working windows do not overlap.
-- Live work stays single-threaded and all acceptance remains serialized by the provider profile row.

create or replace function private.service_duration_minutes(p_metadata jsonb)
returns integer
language sql
immutable
set search_path to 'public', 'private', 'pg_temp'
as $function$
  select greatest(
    30,
    least(
      480,
      case
        when coalesce(p_metadata->>'estimated_duration_minutes','') ~ '^\d+$'
          then (p_metadata->>'estimated_duration_minutes')::integer
        else 120
      end
    )
  );
$function$;

revoke all on function private.service_duration_minutes(jsonb) from public;

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
  v_target_start timestamptz;
  v_target_end timestamptz;
  v_target_duration integer;
  v_buffer interval := interval '30 minutes';
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

  -- A provider can only execute one live job at a time.
  if exists (
    select 1
    from public.servicios existing
    where existing.proveedor_id = v_uid
      and existing.id <> v_servicio.id
      and existing.estado in ('en_camino','llegado','en_progreso','esperando_aprobacion','disputado')
  ) then
    raise exception 'Ya tenés un trabajo en ejecución. Finalizalo antes de aceptar otro.';
  end if;

  v_target_start := v_servicio.programado_para;
  v_target_duration := private.service_duration_minutes(v_servicio.metadata);
  v_target_end := coalesce(v_target_start, now()) + make_interval(mins => v_target_duration);

  if v_target_start is not null and v_target_start < now() - interval '15 minutes' then
    raise exception 'El horario programado ya pasó. Pedile al cliente que reprograme el servicio.';
  end if;

  if v_target_start is null then
    -- An unplanned assignment has no reliable future window, so only one may stay assigned.
    if exists (
      select 1
      from public.servicios existing
      where existing.proveedor_id = v_uid
        and existing.id <> v_servicio.id
        and existing.estado = 'asignado'
        and existing.programado_para is null
    ) then
      raise exception 'Ya tenés un trabajo inmediato asignado. Finalizalo o programalo antes de aceptar otro.';
    end if;

    -- Immediate work is allowed only when it fits before the next scheduled assignment.
    if exists (
      select 1
      from public.servicios existing
      where existing.proveedor_id = v_uid
        and existing.id <> v_servicio.id
        and existing.estado = 'asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para + make_interval(mins => private.service_duration_minutes(existing.metadata)) > now() - v_buffer
    ) then
      raise exception 'Tenés un trabajo programado demasiado cerca. Dejá al menos 30 minutos entre servicios.';
    end if;
  else
    -- A still-unplanned assignment blocks adding future commitments because its end time is unknown.
    if exists (
      select 1
      from public.servicios existing
      where existing.proveedor_id = v_uid
        and existing.id <> v_servicio.id
        and existing.estado = 'asignado'
        and existing.programado_para is null
    ) then
      raise exception 'Tenés un trabajo asignado sin horario definido. Resolvelo antes de sumar otro a la agenda.';
    end if;

    -- Multiple scheduled jobs are valid when their duration + 30 minute buffer do not overlap.
    if exists (
      select 1
      from public.servicios existing
      where existing.proveedor_id = v_uid
        and existing.id <> v_servicio.id
        and existing.estado = 'asignado'
        and existing.programado_para is not null
        and existing.programado_para < v_target_end + v_buffer
        and existing.programado_para + make_interval(mins => private.service_duration_minutes(existing.metadata)) > v_target_start - v_buffer
    ) then
      raise exception 'Ese horario se superpone con otro trabajo de tu agenda. Dejá al menos 30 minutos entre servicios.';
    end if;
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

create or replace function private.avanzar_servicio_impl(p_servicio_id uuid, p_estado public.servicio_estado)
returns public.servicios
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_servicio public.servicios%rowtype;
  v_dist_m double precision;
  v_demo boolean := false;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  v_demo:=private.is_demo_service(p_servicio_id) and private.is_demo_account(auth.uid(),'proveedor');

  if not ((v_servicio.estado='asignado' and p_estado='en_camino') or (v_servicio.estado='en_camino' and p_estado='llegado') or (v_servicio.estado='llegado' and p_estado='en_progreso') or (v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion')) then
    raise exception 'Transición de estado no permitida';
  end if;

  if v_servicio.estado='asignado' and p_estado='en_camino' and not private.is_admin(auth.uid()) then
    if v_servicio.programado_para is not null and now() < v_servicio.programado_para - interval '60 minutes' then
      raise exception 'Este trabajo todavía está programado para más adelante. Podés iniciar el traslado hasta 60 minutos antes.';
    end if;
    if not exists(
      select 1 from public.pagos p
      where p.servicio_id=p_servicio_id
        and p.ambiente=v_servicio.ambiente
        and (
          (p.estado='retenido' and (nullif(btrim(coalesce(p.mp_payment_id,'')),'') is not null or nullif(btrim(coalesce(p.pix_e2e_id,'')),'') is not null or nullif(btrim(coalesce(p.pago_externo_id,'')),'') is not null))
          or (p.metodo='efectivo' and p.procesador='efectivo' and p.modelo_pago='presencial' and p.estado in ('pendiente','liberado'))
        )
    ) then
      raise exception 'El cliente todavía no confirmó una forma de pago habilitada';
    end if;
  end if;

  if v_servicio.estado='en_camino' and p_estado='llegado' and not private.is_admin(auth.uid()) and not v_demo and v_servicio.ubicacion_cliente is not null then
    select extensions.st_distance(pp.ubicacion,v_servicio.ubicacion_cliente)
      into v_dist_m
    from public.perfiles_proveedor pp
    where pp.usuario_id=auth.uid() and pp.ubicacion is not null;
    if v_dist_m is null then raise exception 'Actualizá tu ubicación antes de confirmar llegada'; end if;
    if v_dist_m>200 then raise exception 'Todavía estás demasiado lejos del cliente para confirmar llegada'; end if;
  end if;

  if v_servicio.estado='llegado' and p_estado='en_progreso' and not private.is_admin(auth.uid()) then
    if not exists(select 1 from public.evidencias_servicio e where e.servicio_id=p_servicio_id and e.usuario_id=auth.uid() and e.tipo='antes' and nullif(trim(coalesce(e.storage_path,'')),'') is not null) then
      raise exception 'Agregá al menos una foto inicial antes de iniciar el servicio';
    end if;
  end if;

  if v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion' and not private.is_admin(auth.uid()) then
    if not exists(select 1 from public.evidencias_servicio e where e.servicio_id=p_servicio_id and e.usuario_id=auth.uid() and e.tipo='despues' and nullif(trim(coalesce(e.storage_path,'')),'') is not null) then
      raise exception 'Agregá al menos una foto final antes de pedir aprobación';
    end if;
  end if;

  update public.servicios
     set estado=p_estado,
         iniciado_at=case when p_estado='en_progreso' then coalesce(iniciado_at,now()) else iniciado_at end,
         updated_at=now()
   where id=p_servicio_id
  returning * into v_servicio;

  return v_servicio;
end;
$function$;
