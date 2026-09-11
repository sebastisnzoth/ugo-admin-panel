-- UGO · Pago en efectivo como método de primera clase.
--
-- Objetivo: permitir que un servicio asignado avance con pago presencial sin
-- depender de un checkout electrónico ni de una Function/Vercel para persistir
-- la elección. El dinero en efectivo NO queda bajo custodia de UGO.
--
-- Contrato:
--   cliente   -> seleccionar_pago_efectivo(servicio)
--   proveedor -> confirmar_pago_efectivo(servicio) al finalizar
--
-- Ambos RPC son idempotentes y serializan por servicio/pago para evitar cambios
-- de método o confirmaciones dobles bajo concurrencia.

create or replace function private.seleccionar_pago_efectivo_impl(p_servicio_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_total numeric(12,2);
  v_comision numeric(12,2);
  v_neto numeric(12,2);
  v_changed boolean := false;
begin
  if v_uid is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if v_servicio.cliente_id <> v_uid and not private.is_admin(v_uid) then
    raise exception 'Sólo el cliente puede elegir pago en efectivo';
  end if;

  if v_servicio.proveedor_id is null then
    raise exception 'El servicio todavía no tiene proveedor asignado';
  end if;

  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion') then
    raise exception 'No podés elegir efectivo en el estado actual del servicio';
  end if;

  v_total := round(coalesce(v_servicio.tarifa,0)::numeric,2);
  if v_total <= 0 then
    raise exception 'El servicio no tiene una tarifa válida';
  end if;

  v_comision := round(coalesce(v_servicio.comision_ugo, v_total * 0.15)::numeric,2);
  v_neto := round(coalesce(v_servicio.ganancia_proveedor, v_total - v_comision)::numeric,2);

  select * into v_pago
  from public.pagos
  where servicio_id = p_servicio_id
  for update;

  if found then
    -- Repetir la misma elección no crea pagos ni notificaciones duplicadas.
    if v_pago.metodo = 'efectivo'
       and v_pago.procesador = 'efectivo'
       and v_pago.modelo_pago = 'presencial'
       and v_pago.estado in ('pendiente','liberado') then
      return v_pago;
    end if;

    -- No cambiar a efectivo cuando ya existe un estado electrónico que puede
    -- representar autorización/custodia/cobro/disputa. Evita doble pago.
    if v_pago.estado in ('autorizado','retenido','liberado','reembolsado','disputado') then
      raise exception 'El servicio ya tiene un pago electrónico confirmado o en resolución';
    end if;

    update public.pagos
       set cliente_id = v_servicio.cliente_id,
           proveedor_id = v_servicio.proveedor_id,
           procesador = 'efectivo',
           metodo = 'efectivo',
           modelo_pago = 'presencial',
           ambiente = v_servicio.ambiente,
           pago_externo_id = null,
           monto_bruto = v_total,
           comision_ugo = v_comision,
           ganancia_proveedor = v_neto,
           moneda = coalesce(v_servicio.moneda,'BRL'),
           estado = 'pendiente',
           autorizado_at = null,
           liberado_at = null,
           reembolsado_at = null,
           fecha_confirmacion = null,
           mp_preference_id = null,
           mp_init_point = null,
           mp_payment_id = null,
           mp_status = null,
           pix_txid = null,
           pix_copia_cola = null,
           pix_qr_code = null,
           pix_expira_at = null,
           pix_e2e_id = null,
           pix_informado_at = null,
           pix_conciliado_at = null,
           pix_conciliado_por = null,
           pix_conciliacion_nota = null,
           updated_at = now()
     where id = v_pago.id
    returning * into v_pago;
    v_changed := true;
  else
    insert into public.pagos(
      servicio_id, cliente_id, proveedor_id,
      procesador, metodo, modelo_pago, ambiente,
      monto_bruto, comision_ugo, ganancia_proveedor, moneda, estado
    ) values (
      v_servicio.id, v_servicio.cliente_id, v_servicio.proveedor_id,
      'efectivo','efectivo','presencial',v_servicio.ambiente,
      v_total,v_comision,v_neto,coalesce(v_servicio.moneda,'BRL'),'pendiente'
    )
    returning * into v_pago;
    v_changed := true;
  end if;

  if v_changed then
    insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
    values(
      v_servicio.proveedor_id,
      'pago_efectivo_seleccionado',
      'Pago en efectivo',
      format('El cliente eligió pagar en efectivo el servicio #%s.',coalesce(v_servicio.numero::text,left(v_servicio.id::text,8))),
      jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'metodo','efectivo','ambiente',v_servicio.ambiente)
    );
  end if;

  return v_pago;
end;
$$;

create or replace function public.seleccionar_pago_efectivo(p_servicio_id uuid)
returns public.pagos
language sql
set search_path to 'public','private','pg_temp'
as $$
  select private.seleccionar_pago_efectivo_impl(p_servicio_id);
$$;

revoke execute on function private.seleccionar_pago_efectivo_impl(uuid) from public, anon;
grant execute on function private.seleccionar_pago_efectivo_impl(uuid) to authenticated, service_role;
revoke execute on function public.seleccionar_pago_efectivo(uuid) from public, anon;
grant execute on function public.seleccionar_pago_efectivo(uuid) to authenticated, service_role;

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

  if not found then
    raise exception 'Servicio inexistente';
  end if;

  if v_servicio.proveedor_id <> v_uid and not private.is_admin(v_uid) then
    raise exception 'Sólo el proveedor asignado puede confirmar el efectivo';
  end if;

  if v_servicio.estado not in ('en_progreso','esperando_aprobacion','completado') then
    raise exception 'Confirmá el efectivo al finalizar el trabajo';
  end if;

  select * into v_pago
  from public.pagos
  where servicio_id = p_servicio_id
  for update;

  if not found
     or v_pago.metodo <> 'efectivo'
     or v_pago.procesador <> 'efectivo'
     or v_pago.modelo_pago <> 'presencial' then
    raise exception 'Este servicio no está configurado para pago en efectivo';
  end if;

  if v_pago.ambiente <> v_servicio.ambiente then
    raise exception 'El pago no pertenece al mismo ambiente del servicio';
  end if;

  if v_pago.estado = 'liberado' then
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

create or replace function public.confirmar_pago_efectivo(p_servicio_id uuid)
returns public.pagos
language sql
set search_path to 'public','private','pg_temp'
as $$
  select private.confirmar_pago_efectivo_impl(p_servicio_id);
$$;

revoke execute on function private.confirmar_pago_efectivo_impl(uuid) from public, anon;
grant execute on function private.confirmar_pago_efectivo_impl(uuid) to authenticated, service_role;
revoke execute on function public.confirmar_pago_efectivo(uuid) from public, anon;
grant execute on function public.confirmar_pago_efectivo(uuid) to authenticated, service_role;
