create or replace function public.crear_pix_demo(p_servicio_id uuid)
returns public.pagos
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := coalesce(auth.jwt()->>'email','');
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_ref text;
begin
  if v_uid is null then
    raise exception 'Sesión requerida';
  end if;
  if v_email !~* '@ugo\.test$' then
    raise exception 'Pix DEMO disponible solo para cuentas de prueba UGO';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id;

  if not found then raise exception 'Servicio no encontrado'; end if;
  if v_servicio.cliente_id <> v_uid then raise exception 'Servicio no pertenece al cliente autenticado'; end if;
  if v_servicio.proveedor_id is null then raise exception 'Servicio sin proveedor asignado'; end if;
  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion') then
    raise exception 'Estado no admite pago demo: %', v_servicio.estado;
  end if;
  if coalesce(v_servicio.tarifa,0) <= 0 then raise exception 'Tarifa inválida'; end if;

  v_ref := 'demo_pix_' || replace(p_servicio_id::text,'-','');

  insert into public.pagos(
    servicio_id, cliente_id, proveedor_id, procesador, metodo,
    monto_bruto, comision_ugo, ganancia_proveedor, moneda, estado,
    pago_externo_id, mp_payment_id, mp_status, pix_txid,
    autorizado_at, updated_at
  ) values (
    v_servicio.id, v_servicio.cliente_id, v_servicio.proveedor_id,
    'demo', 'pix_demo',
    v_servicio.tarifa,
    coalesce(v_servicio.comision_ugo, round(v_servicio.tarifa * 0.15, 2)),
    coalesce(v_servicio.ganancia_proveedor, round(v_servicio.tarifa * 0.85, 2)),
    coalesce(v_servicio.moneda,'BRL'), 'retenido',
    v_ref, v_ref, 'approved_demo', v_ref,
    now(), now()
  )
  on conflict (servicio_id) do update set
    cliente_id = excluded.cliente_id,
    proveedor_id = excluded.proveedor_id,
    procesador = 'demo',
    metodo = 'pix_demo',
    monto_bruto = excluded.monto_bruto,
    comision_ugo = excluded.comision_ugo,
    ganancia_proveedor = excluded.ganancia_proveedor,
    moneda = excluded.moneda,
    estado = 'retenido',
    pago_externo_id = v_ref,
    mp_payment_id = v_ref,
    mp_status = 'approved_demo',
    pix_txid = v_ref,
    pix_copia_cola = null,
    pix_qr_code = null,
    pix_expira_at = null,
    pix_e2e_id = null,
    pix_informado_at = null,
    pix_conciliado_at = null,
    pix_conciliado_por = null,
    pix_conciliacion_nota = 'PAGO FICTICIO DE DEMOSTRACIÓN',
    autorizado_at = now(),
    updated_at = now()
  returning * into v_pago;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(
    v_servicio.proveedor_id,
    'pago_retenido',
    'Pago DEMO protegido',
    'Pix ficticio confirmado para probar el flujo del servicio #' || coalesce(v_servicio.numero::text, left(v_servicio.id::text,8)),
    jsonb_build_object('servicio_id',v_servicio.id,'pago_id',v_pago.id,'demo',true)
  );

  return v_pago;
end;
$$;

revoke all on function public.crear_pix_demo(uuid) from public;
grant execute on function public.crear_pix_demo(uuid) to authenticated;
