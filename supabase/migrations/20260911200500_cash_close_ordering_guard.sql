-- UGO P0 · cierre correcto del flujo de efectivo
--
-- Invariante:
-- en servicios presenciales en efectivo, el proveedor debe confirmar la
-- recepción antes de que el servicio entre en esperando_aprobacion.
-- La confirmación es además el paso que habilita atómicamente la revisión
-- del cliente cuando ya existe evidencia final.

create or replace function private.guard_cash_before_approval()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_pago public.pagos%rowtype;
begin
  if old.estado = 'en_progreso' and new.estado = 'esperando_aprobacion' then
    select * into v_pago
    from public.pagos
    where servicio_id = new.id
      and ambiente = new.ambiente
    order by created_at desc
    limit 1;

    if found
       and v_pago.metodo = 'efectivo'
       and v_pago.procesador = 'efectivo'
       and v_pago.modelo_pago = 'presencial'
       and v_pago.estado <> 'liberado' then
      raise exception 'Confirmá la recepción del efectivo antes de pedir la aprobación del cliente';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_cash_before_approval on public.servicios;
create trigger trg_guard_cash_before_approval
before update of estado on public.servicios
for each row
execute function private.guard_cash_before_approval();

create or replace function private.confirmar_pago_efectivo_impl(p_servicio_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_ref text;
begin
  if v_uid is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id <> v_uid and not private.is_admin(v_uid) then
    raise exception 'Sólo el proveedor asignado puede confirmar el efectivo';
  end if;
  if v_servicio.estado not in ('en_progreso','esperando_aprobacion','completado') then
    raise exception 'Confirmá el efectivo al finalizar el trabajo';
  end if;

  if v_servicio.estado = 'en_progreso' and not exists (
    select 1 from public.evidencias_servicio e
    where e.servicio_id = p_servicio_id
      and e.usuario_id = v_servicio.proveedor_id
      and e.tipo = 'despues'
      and nullif(trim(coalesce(e.storage_path,'')),'') is not null
  ) then
    raise exception 'Agregá al menos una foto final antes de confirmar el efectivo';
  end if;

  select * into v_pago
  from public.pagos
  where servicio_id = p_servicio_id
    and ambiente = v_servicio.ambiente
  order by created_at desc
  limit 1
  for update;

  if not found
     or v_pago.metodo <> 'efectivo'
     or v_pago.procesador <> 'efectivo'
     or v_pago.modelo_pago <> 'presencial' then
    raise exception 'Este servicio no está configurado para pago en efectivo';
  end if;

  if v_pago.estado = 'liberado' then
    if v_servicio.estado = 'en_progreso' then
      update public.servicios
      set estado = 'esperando_aprobacion', updated_at = now()
      where id = p_servicio_id;
    end if;
    return v_pago;
  end if;

  if v_pago.estado <> 'pendiente' then
    raise exception 'El pago en efectivo no está en un estado confirmable';
  end if;

  v_ref := 'CASH-' || replace(v_pago.id::text,'-','');

  update public.pagos
  set estado = 'liberado',
      pago_externo_id = coalesce(nullif(pago_externo_id,''),v_ref),
      fecha_confirmacion = coalesce(fecha_confirmacion,now()),
      liberado_at = coalesce(liberado_at,now()),
      updated_at = now()
  where id = v_pago.id
    and estado = 'pendiente'
  returning * into v_pago;

  if not found then
    raise exception 'El estado del pago cambió. Actualizá e intentá nuevamente';
  end if;

  if v_servicio.estado = 'en_progreso' then
    update public.servicios
    set estado = 'esperando_aprobacion', updated_at = now()
    where id = p_servicio_id;
  end if;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(
    v_servicio.cliente_id,
    'pago_efectivo_confirmado',
    'Efectivo recibido',
    format('El proveedor confirmó la recepción del efectivo del servicio #%s.',coalesce(v_servicio.numero::text,left(v_servicio.id::text,8))),
    jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'metodo','efectivo','ambiente',v_servicio.ambiente)
  );

  return v_pago;
end;
$$;
