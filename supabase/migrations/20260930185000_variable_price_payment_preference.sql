-- UGO: separate payment-method choice from payment amount for variable-price services.
-- A client can choose PIX/efectivo while tarifa is still pending. A real payment row
-- is only materialized once the amount is positive, preserving pagos.monto_bruto > 0.

create or replace function private.seleccionar_metodo_pago_servicio_impl(
  p_servicio_id uuid,
  p_metodo text
)
returns jsonb
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_metodo text:=lower(trim(coalesce(p_metodo,'')));
  v_previo text;
  v_cash_enabled boolean;
  v_market_enabled boolean;
  v_amount_ready boolean;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if v_metodo='cash' then v_metodo:='efectivo'; end if;
  if v_metodo not in ('efectivo','pix') then raise exception 'Forma de pago no válida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>v_uid and not private.is_admin(v_uid) then
    raise exception 'Sólo el cliente puede elegir la forma de pago';
  end if;
  if v_servicio.proveedor_id is null then
    raise exception 'El servicio todavía no tiene proveedor asignado';
  end if;
  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion') then
    raise exception 'No podés cambiar la forma de pago en el estado actual del servicio';
  end if;

  if v_metodo='efectivo' then
    select lower(coalesce((select valor from public.config_sistema where clave='pago_efectivo_activo'),'true'))
      in ('true','1','si','sí','on') into v_cash_enabled;
    if not v_cash_enabled then raise exception 'El pago en efectivo está deshabilitado por UGO'; end if;

    if coalesce(v_servicio.moneda,'BRL')='BRL' then
      select lower(coalesce((select valor from public.config_sistema where clave='pago_efectivo_br_activo'),'true'))
        in ('true','1','si','sí','on') into v_market_enabled;
      if not v_market_enabled then raise exception 'El pago en efectivo está deshabilitado para Brasil'; end if;
    elsif coalesce(v_servicio.moneda,'BRL')='ARS' then
      select lower(coalesce((select valor from public.config_sistema where clave='pago_efectivo_ar_activo'),'true'))
        in ('true','1','si','sí','on') into v_market_enabled;
      if not v_market_enabled then raise exception 'El pago en efectivo está deshabilitado para Argentina'; end if;
    end if;
  elsif coalesce(v_servicio.moneda,'BRL')<>'BRL' then
    raise exception 'Pix está disponible únicamente para pagos en BRL';
  end if;

  v_previo:=lower(coalesce(
    v_servicio.metadata->>'requested_payment_method',
    v_servicio.metadata->>'payment_method',
    ''
  ));
  if v_previo='cash' then v_previo:='efectivo'; end if;

  update public.servicios
  set metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'requested_payment_method',v_metodo,
        'payment_method',v_metodo,
        'payment_preference_source','assigned_client_choice',
        'payment_selected_before_order',false,
        'payment_selected_at',now()::text
      ),
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  v_amount_ready:=round(coalesce(v_servicio.tarifa,0)::numeric,2)>0;

  if v_metodo='efectivo' and v_amount_ready then
    v_pago:=private.seleccionar_pago_efectivo_impl(p_servicio_id);
  end if;

  if v_previo is distinct from v_metodo and not (v_metodo='efectivo' and v_amount_ready) then
    insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
    values(
      v_servicio.proveedor_id,
      'forma_pago_elegida',
      'Forma de pago elegida',
      case
        when v_amount_ready then format('El cliente eligió %s para el servicio #%s.',upper(v_metodo),coalesce(v_servicio.numero::text,left(v_servicio.id::text,8)))
        else format('El cliente eligió %s para el servicio #%s. El importe se confirma antes de comenzar el trabajo.',upper(v_metodo),coalesce(v_servicio.numero::text,left(v_servicio.id::text,8)))
      end,
      jsonb_build_object(
        'servicio_id',v_servicio.id,
        'metodo',v_metodo,
        'amount_ready',v_amount_ready,
        'ambiente',v_servicio.ambiente
      )
    );
  end if;

  return jsonb_build_object(
    'status',case when v_amount_ready then 'amount_ready' else 'preference_saved' end,
    'method',v_metodo,
    'amount_ready',v_amount_ready,
    'tarifa',coalesce(v_servicio.tarifa,0),
    'payment_id',v_pago.id
  );
end;
$$;

revoke all on function private.seleccionar_metodo_pago_servicio_impl(uuid,text) from public,anon,authenticated;

create or replace function public.seleccionar_metodo_pago_servicio(
  p_servicio_id uuid,
  p_metodo text
)
returns jsonb
language sql
set search_path='public','private','pg_temp'
as $$
  select private.seleccionar_metodo_pago_servicio_impl(p_servicio_id,p_metodo);
$$;

revoke all on function public.seleccionar_metodo_pago_servicio(uuid,text) from public,anon;
grant execute on function public.seleccionar_metodo_pago_servicio(uuid,text) to authenticated,service_role;

notify pgrst,'reload schema';
