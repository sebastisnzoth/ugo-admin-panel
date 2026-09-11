-- UGO · Integridad financiera de ampliaciones de servicio.
--
-- Problema: una ampliación con monto > 0 podía quedar `aprobada / pendiente_ajuste`
-- sobre un pago electrónico ya creado/protegido, sin existir todavía un flujo real
-- que cobre ese delta. Eso habilitaba alcance adicional no financiado.
--
-- Regla segura hasta implementar un checkout de ajuste electrónico independiente:
-- - sin pago: incorporar al total antes del checkout;
-- - efectivo pendiente: incorporar al total presencial;
-- - pago fallido/reembolsado: incorporar al total y exigir nuevo intento de pago;
-- - pago electrónico activo/protegido: NO aprobar monto extra todavía;
-- - ampliación con monto 0: puede aprobarse porque no altera custodia.

create or replace function public.resolver_ampliacion_servicio(
  p_ampliacion_id uuid,
  p_aprobar boolean
) returns public.ampliaciones_servicio
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_user uuid := auth.uid();
  v_row public.ampliaciones_servicio%rowtype;
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_nuevo_total numeric;
  v_nueva_comision numeric;
  v_nueva_ganancia numeric;
begin
  if v_user is null then raise exception 'Sesión requerida'; end if;

  select * into v_row
  from public.ampliaciones_servicio
  where id = p_ampliacion_id
  for update;

  if not found then raise exception 'Ampliación no encontrada'; end if;
  if v_user <> v_row.cliente_id then raise exception 'Sólo el cliente puede aprobar o rechazar la ampliación'; end if;
  if v_row.estado <> 'pendiente' then raise exception 'La ampliación ya fue resuelta'; end if;

  select * into v_servicio
  from public.servicios
  where id = v_row.servicio_id
  for update;

  if not found then raise exception 'Servicio no encontrado'; end if;
  if v_servicio.cliente_id <> v_user then raise exception 'El servicio no pertenece al cliente autenticado'; end if;
  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso') then
    raise exception 'El servicio ya no admite ampliaciones';
  end if;

  if not p_aprobar then
    update public.ampliaciones_servicio
      set estado='rechazada',
          pago_estado='no_aplica',
          resuelto_por=v_user,
          resuelto_at=now(),
          updated_at=now()
      where id=v_row.id
      returning * into v_row;
  else
    select * into v_pago
    from public.pagos
    where servicio_id=v_row.servicio_id
    order by created_at desc
    limit 1
    for update;

    -- Cambios sin impacto de dinero pueden aprobarse en cualquier método.
    if coalesce(v_row.monto_extra,0) = 0 then
      update public.ampliaciones_servicio
        set estado='aprobada',
            pago_estado='incluido',
            resuelto_por=v_user,
            resuelto_at=now(),
            updated_at=now()
        where id=v_row.id
        returning * into v_row;

    -- Sin pago aún: incorporamos el nuevo total antes del checkout.
    elsif not found then
      v_nuevo_total := round((coalesce(v_servicio.tarifa,0)+v_row.monto_extra)::numeric,2);
      v_nueva_comision := round((coalesce(v_servicio.comision_ugo,0)+(v_row.monto_extra*0.15))::numeric,2);
      v_nueva_ganancia := round((coalesce(v_servicio.ganancia_proveedor,0)+(v_row.monto_extra*0.85))::numeric,2);

      update public.servicios
         set tarifa=v_nuevo_total,
             comision_ugo=v_nueva_comision,
             ganancia_proveedor=v_nueva_ganancia,
             updated_at=now()
       where id=v_row.servicio_id;

      update public.ampliaciones_servicio
         set estado='aprobada',
             pago_estado='incluido',
             resuelto_por=v_user,
             resuelto_at=now(),
             updated_at=now()
       where id=v_row.id
       returning * into v_row;

    -- Efectivo todavía no cobrado: el total presencial sí puede reajustarse.
    elsif v_pago.metodo='efectivo'
       and v_pago.procesador='efectivo'
       and v_pago.modelo_pago='presencial'
       and v_pago.estado='pendiente' then
      v_nuevo_total := round((coalesce(v_pago.monto_bruto,0)+v_row.monto_extra)::numeric,2);
      v_nueva_comision := round((coalesce(v_pago.comision_ugo,0)+(v_row.monto_extra*0.15))::numeric,2);
      v_nueva_ganancia := round((coalesce(v_pago.ganancia_proveedor,0)+(v_row.monto_extra*0.85))::numeric,2);

      update public.pagos
         set monto_bruto=v_nuevo_total,
             comision_ugo=v_nueva_comision,
             ganancia_proveedor=v_nueva_ganancia,
             updated_at=now()
       where id=v_pago.id;

      update public.servicios
         set tarifa=v_nuevo_total,
             comision_ugo=v_nueva_comision,
             ganancia_proveedor=v_nueva_ganancia,
             updated_at=now()
       where id=v_row.servicio_id;

      update public.ampliaciones_servicio
         set estado='aprobada',
             pago_estado='incluido',
             resuelto_por=v_user,
             resuelto_at=now(),
             updated_at=now()
       where id=v_row.id
       returning * into v_row;

    -- Un pago fallido o reembolsado no representa fondos activos. Ajustamos el
    -- total del servicio y el siguiente intento de pago deberá usar ese total.
    elsif v_pago.estado in ('fallido','reembolsado') then
      v_nuevo_total := round((coalesce(v_servicio.tarifa,0)+v_row.monto_extra)::numeric,2);
      v_nueva_comision := round((coalesce(v_servicio.comision_ugo,0)+(v_row.monto_extra*0.15))::numeric,2);
      v_nueva_ganancia := round((coalesce(v_servicio.ganancia_proveedor,0)+(v_row.monto_extra*0.85))::numeric,2);

      update public.servicios
         set tarifa=v_nuevo_total,
             comision_ugo=v_nueva_comision,
             ganancia_proveedor=v_nueva_ganancia,
             updated_at=now()
       where id=v_row.servicio_id;

      update public.ampliaciones_servicio
         set estado='aprobada',
             pago_estado='incluido',
             resuelto_por=v_user,
             resuelto_at=now(),
             updated_at=now()
       where id=v_row.id
       returning * into v_row;

    else
      -- No aumentamos silenciosamente una obligación electrónica ya creada o
      -- protegida. El delta tendrá un checkout propio en una etapa posterior.
      raise exception 'Este servicio ya tiene un pago electrónico activo. El ajuste de monto adicional debe cobrarse antes de aprobar la ampliación';
    end if;
  end if;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(
    v_row.proveedor_id,
    'ampliacion_resuelta',
    case when v_row.estado='aprobada' then 'Trabajo adicional aprobado' else 'Trabajo adicional rechazado' end,
    v_row.descripcion,
    jsonb_build_object(
      'servicio_id',v_row.servicio_id,
      'ampliacion_id',v_row.id,
      'estado',v_row.estado,
      'pago_estado',v_row.pago_estado
    )
  );

  return v_row;
end;
$$;

revoke all on function public.resolver_ampliacion_servicio(uuid,boolean) from public, anon;
grant execute on function public.resolver_ampliacion_servicio(uuid,boolean) to authenticated, service_role;

-- Defensa para datos históricos o escrituras administrativas: un servicio no
-- puede entrar a revisión si conserva una ampliación aprobada cuyo ajuste no fue
-- financiado/reconciliado.
create or replace function private.guard_pending_expansion_before_review()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  if old.estado='en_progreso' and new.estado='esperando_aprobacion' then
    if exists (
      select 1
      from public.ampliaciones_servicio a
      where a.servicio_id=new.id
        and a.estado='aprobada'
        and a.pago_estado='pendiente_ajuste'
    ) then
      raise exception 'Hay un trabajo adicional aprobado con ajuste de pago pendiente';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_pending_expansion_before_review() from public, anon;
grant execute on function private.guard_pending_expansion_before_review() to authenticated, service_role;

drop trigger if exists trg_guard_pending_expansion_before_review on public.servicios;
create trigger trg_guard_pending_expansion_before_review
before update of estado on public.servicios
for each row
execute function private.guard_pending_expansion_before_review();
