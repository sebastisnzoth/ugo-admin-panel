-- UGO variable-price lifecycle authority.
-- Travel may begin with a persisted client payment preference while the onsite quote is still pending.
-- Work itself may not begin until the amount is positive and the chosen payment is actually ready.

create or replace function private.avanzar_servicio_impl(
  p_servicio_id uuid,
  p_estado servicio_estado
)
returns public.servicios
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_dist_m double precision;
  v_demo boolean := false;
  v_requested_method text;
  v_has_ready_payment boolean := false;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  select * into v_servicio
  from public.servicios
  where id=p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id<>auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  v_demo:=private.is_demo_service(p_servicio_id)
          and private.is_demo_account(auth.uid(),'proveedor');

  if not (
    (v_servicio.estado='asignado' and p_estado='en_camino')
    or (v_servicio.estado='en_camino' and p_estado='llegado')
    or (v_servicio.estado='llegado' and p_estado='en_progreso')
    or (v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion')
  ) then
    raise exception 'Transición de estado no permitida';
  end if;

  v_requested_method:=lower(coalesce(
    v_servicio.metadata->>'requested_payment_method',
    v_servicio.metadata->>'payment_method',
    ''
  ));
  if v_requested_method='cash' then v_requested_method:='efectivo'; end if;

  select exists(
    select 1
    from public.pagos p
    where p.servicio_id=p_servicio_id
      and p.ambiente=v_servicio.ambiente
      and (
        (
          p.estado='retenido'
          and (
            nullif(btrim(coalesce(p.mp_payment_id,'')),'') is not null
            or nullif(btrim(coalesce(p.pix_e2e_id,'')),'') is not null
            or nullif(btrim(coalesce(p.pago_externo_id,'')),'') is not null
          )
        )
        or (
          p.metodo='efectivo'
          and p.procesador='efectivo'
          and p.modelo_pago='presencial'
          and p.estado in ('pendiente','liberado')
        )
      )
  ) into v_has_ready_payment;

  if v_servicio.estado='asignado' and p_estado='en_camino' and not private.is_admin(auth.uid()) then
    if v_servicio.programado_para is not null
       and now() < v_servicio.programado_para - interval '60 minutes' then
      raise exception 'Este trabajo todavía está programado para más adelante. Podés iniciar el traslado hasta 60 minutos antes.';
    end if;

    -- Fixed-price work still requires a real payment before departure.
    -- For a variable-price/technical-visit flow, the client's persisted payment
    -- preference is enough to authorize travel, but never enough to start work.
    if not v_has_ready_payment then
      if not (
        coalesce(v_servicio.tarifa,0)<=0
        and v_requested_method in ('efectivo','pix')
      ) then
        raise exception 'El cliente todavía no confirmó una forma de pago habilitada';
      end if;
    end if;
  end if;

  if v_servicio.estado='en_camino'
     and p_estado='llegado'
     and not private.is_admin(auth.uid())
     and not v_demo
     and v_servicio.ubicacion_cliente is not null then
    select extensions.st_distance(pp.ubicacion,v_servicio.ubicacion_cliente)
      into v_dist_m
    from public.perfiles_proveedor pp
    where pp.usuario_id=auth.uid()
      and pp.ubicacion is not null;

    if v_dist_m is null then
      raise exception 'Actualizá tu ubicación antes de confirmar llegada';
    end if;
    if v_dist_m>200 then
      raise exception 'Todavía estás demasiado lejos del cliente para confirmar llegada';
    end if;
  end if;

  if v_servicio.estado='llegado' and p_estado='en_progreso' and not private.is_admin(auth.uid()) then
    if coalesce(v_servicio.tarifa,0)<=0 then
      raise exception 'Definí un importe aprobado por el cliente antes de empezar el trabajo';
    end if;

    if not v_has_ready_payment then
      raise exception 'La forma de pago todavía no está confirmada para empezar el trabajo';
    end if;

    if not exists(
      select 1
      from public.evidencias_servicio e
      where e.servicio_id=p_servicio_id
        and e.usuario_id=auth.uid()
        and e.tipo='antes'
        and nullif(trim(coalesce(e.storage_path,'')),'') is not null
    ) then
      raise exception 'Agregá al menos una foto inicial antes de iniciar el servicio';
    end if;
  end if;

  if v_servicio.estado='en_progreso'
     and p_estado='esperando_aprobacion'
     and not private.is_admin(auth.uid()) then
    if not exists(
      select 1
      from public.evidencias_servicio e
      where e.servicio_id=p_servicio_id
        and e.usuario_id=auth.uid()
        and e.tipo='despues'
        and nullif(trim(coalesce(e.storage_path,'')),'') is not null
    ) then
      raise exception 'Agregá al menos una foto final antes de pedir aprobación';
    end if;
  end if;

  update public.servicios
  set estado=p_estado,
      iniciado_at=case
        when p_estado='en_progreso' then coalesce(iniciado_at,now())
        else iniciado_at
      end,
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  return v_servicio;
end;
$$;

revoke all on function private.avanzar_servicio_impl(uuid,servicio_estado) from public,anon,authenticated;
notify pgrst,'reload schema';
