-- UGO P0 · client closure must not mutate another user's protected profile.
-- Regression introduced by 20260918_provider_multi_jobs_cash_close_flow.sql:
-- client-owned completion updated usuarios.servicios_completados for the provider,
-- but trg_00_usuario_sensitive_guard correctly rejects cross-user profile writes.
--
-- Canonical rule: public.servicios is the source of truth for completed jobs.
-- Client approval/payment closure must only mutate the owned service/payment.

create or replace function private.aprobar_servicio_impl(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_cash boolean := false;
  v_amount_text text;
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
  if v_servicio.estado<>'esperando_aprobacion' then
    raise exception 'El servicio todavía no puede aprobarse';
  end if;

  if not exists (
    select 1
    from public.evidencias_servicio e
    where e.servicio_id=p_servicio_id
      and e.tipo='despues'
      and e.usuario_id=v_servicio.proveedor_id
      and nullif(trim(coalesce(e.storage_path,'')),'') is not null
  ) then
    raise exception 'Falta la evidencia final del proveedor';
  end if;

  select * into v_pago
  from public.pagos
  where servicio_id=p_servicio_id
    and ambiente=v_servicio.ambiente
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'El servicio todavía no tiene una forma de pago confirmada';
  end if;

  v_cash := v_pago.metodo='efectivo'
            and v_pago.procesador='efectivo'
            and v_pago.modelo_pago='presencial';

  if v_cash then
    if v_pago.estado not in ('pendiente','liberado') then
      raise exception 'El pago en efectivo no está en un estado válido';
    end if;

    if nullif(v_servicio.metadata->>'trabajo_aprobado_at','') is null then
      update public.servicios
      set metadata=jsonb_set(
            coalesce(metadata,'{}'::jsonb),
            '{trabajo_aprobado_at}',
            to_jsonb(now()::text),
            true
          ),
          updated_at=now()
      where id=p_servicio_id
      returning * into v_servicio;
    end if;

    v_amount_text := 'R$ ' || replace(
      to_char(round(coalesce(v_pago.monto_bruto,v_servicio.tarifa,0)::numeric,2),'FM999999990.00'),
      '.',','
    );

    perform private.crear_notificacion_unica(
      v_servicio.cliente_id,
      'pago_efectivo_pendiente',
      'Pagá al proveedor',
      format('Pagá %s al proveedor por el servicio #%s y confirmá el pago en UGO.',v_amount_text,coalesce(v_servicio.numero::text,left(v_servicio.id::text,8))),
      jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'metodo','efectivo','monto',coalesce(v_pago.monto_bruto,v_servicio.tarifa,0),'moneda',coalesce(v_pago.moneda,v_servicio.moneda,'BRL')),
      'servicio:'||v_servicio.id||':cash:pay-client'
    );

    perform private.crear_notificacion_unica(
      v_servicio.proveedor_id,
      'trabajo_aprobado',
      'El cliente aprobó el trabajo',
      format('El trabajo #%s fue aprobado. UGO ahora le indica al cliente que te pague %s.',coalesce(v_servicio.numero::text,left(v_servicio.id::text,8)),v_amount_text),
      jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'metodo','efectivo','monto',coalesce(v_pago.monto_bruto,v_servicio.tarifa,0),'moneda',coalesce(v_pago.moneda,v_servicio.moneda,'BRL')),
      'servicio:'||v_servicio.id||':cash:work-approved-provider'
    );

    return v_servicio;
  end if;

  if v_pago.estado<>'retenido'
     or (
       nullif(btrim(coalesce(v_pago.mp_payment_id,'')),'') is null
       and nullif(btrim(coalesce(v_pago.pix_e2e_id,'')),'') is null
       and nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null
     ) then
    raise exception 'El pago todavía no está confirmado y protegido';
  end if;

  update public.servicios
  set estado='completado',
      completado_at=coalesce(completado_at,now()),
      metadata=jsonb_set(
        coalesce(metadata,'{}'::jsonb),
        '{trabajo_aprobado_at}',
        to_jsonb(now()::text),
        true
      ),
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  update public.pagos
  set estado='liberado',
      liberado_at=coalesce(liberado_at,now()),
      updated_at=now()
  where id=v_pago.id;

  return v_servicio;
end;
$$;

revoke execute on function private.aprobar_servicio_impl(uuid) from public, anon;
grant execute on function private.aprobar_servicio_impl(uuid) to authenticated, service_role;

create or replace function public.confirmar_pago_efectivo_cliente(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_ref text;
  v_amount_text text;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'Sólo el cliente puede confirmar este pago';
  end if;

  select * into v_pago
  from public.pagos
  where servicio_id=p_servicio_id
    and ambiente=v_servicio.ambiente
  order by created_at desc
  limit 1
  for update;

  if not found
     or v_pago.metodo<>'efectivo'
     or v_pago.procesador<>'efectivo'
     or v_pago.modelo_pago<>'presencial' then
    raise exception 'Este servicio no está configurado para pago en efectivo';
  end if;

  if v_servicio.estado='completado' and v_pago.estado='liberado' then
    return v_servicio;
  end if;

  if v_servicio.estado<>'esperando_aprobacion' then
    raise exception 'Primero confirmá el trabajo realizado';
  end if;

  if nullif(v_servicio.metadata->>'trabajo_aprobado_at','') is null then
    raise exception 'Primero confirmá que el trabajo quedó bien';
  end if;

  if v_pago.estado not in ('pendiente','liberado') then
    raise exception 'El pago en efectivo no está en un estado confirmable';
  end if;

  if v_pago.estado='pendiente' then
    v_ref := 'CASH-CLIENT-' || replace(v_pago.id::text,'-','');
    update public.pagos
    set estado='liberado',
        pago_externo_id=coalesce(nullif(pago_externo_id,''),v_ref),
        fecha_confirmacion=coalesce(fecha_confirmacion,now()),
        liberado_at=coalesce(liberado_at,now()),
        updated_at=now()
    where id=v_pago.id
      and estado='pendiente'
    returning * into v_pago;

    if not found then
      raise exception 'El estado del pago cambió. Actualizá e intentá nuevamente';
    end if;
  end if;

  update public.servicios
  set estado='completado',
      completado_at=coalesce(completado_at,now()),
      metadata=jsonb_set(
        coalesce(metadata,'{}'::jsonb),
        '{cliente_pago_efectivo_at}',
        to_jsonb(now()::text),
        true
      ),
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  v_amount_text := 'R$ ' || replace(
    to_char(round(coalesce(v_pago.monto_bruto,v_servicio.tarifa,0)::numeric,2),'FM999999990.00'),
    '.',','
  );

  perform private.crear_notificacion_unica(
    v_servicio.proveedor_id,
    'pago_efectivo_confirmado',
    'El cliente pagó',
    format('El cliente confirmó el pago de %s. El servicio #%s quedó cerrado.',v_amount_text,coalesce(v_servicio.numero::text,left(v_servicio.id::text,8))),
    jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'metodo','efectivo','monto',coalesce(v_pago.monto_bruto,v_servicio.tarifa,0),'moneda',coalesce(v_pago.moneda,v_servicio.moneda,'BRL'),'estado','completado'),
    'servicio:'||v_servicio.id||':cash:paid-provider'
  );

  return v_servicio;
end;
$$;

revoke all on function public.confirmar_pago_efectivo_cliente(uuid) from public;
revoke all on function public.confirmar_pago_efectivo_cliente(uuid) from anon;
grant execute on function public.confirmar_pago_efectivo_cliente(uuid) to authenticated;

comment on function public.confirmar_pago_efectivo_cliente(uuid) is
'Cliente confirma el pago en efectivo después de aprobar el trabajo. Cierra servicio/pago sin mutar el perfil protegido del proveedor.';
