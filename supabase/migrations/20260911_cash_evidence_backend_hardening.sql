-- UGO · P0 backend hardening
-- Alinea el lifecycle real con los contratos maestros:
-- - efectivo habilita el inicio sin fingir custodia electrónica;
-- - evidencia "Antes" es obligatoria para iniciar;
-- - evidencia "Después" es obligatoria para pedir aprobación;
-- - aprobación soporta correctamente pago electrónico y efectivo.

alter table public.pagos
  add column if not exists fecha_confirmacion timestamptz null;

alter table public.pagos
  drop constraint if exists pagos_modelo_pago_check;

alter table public.pagos
  add constraint pagos_modelo_pago_check
  check (modelo_pago in ('custodia_ugo','split_1_1','presencial'));

create or replace function private.avanzar_servicio_impl(
  p_servicio_id uuid,
  p_estado public.servicio_estado
)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_dist_m double precision;
  v_demo boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id <> auth.uid() and not private.is_admin(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  v_demo := private.is_demo_service(p_servicio_id)
            and private.is_demo_account(auth.uid(),'proveedor');

  if not (
    (v_servicio.estado='asignado' and p_estado='en_camino') or
    (v_servicio.estado='en_camino' and p_estado='llegado') or
    (v_servicio.estado='llegado' and p_estado='en_progreso') or
    (v_servicio.estado='en_progreso' and p_estado='esperando_aprobacion')
  ) then
    raise exception 'Transición de estado no permitida';
  end if;

  -- El servicio puede comenzar con un pago electrónico realmente protegido
  -- o con efectivo seleccionado de forma explícita. Efectivo no se presenta
  -- como custodia/protección electrónica.
  if v_servicio.estado='asignado'
     and p_estado='en_camino'
     and not private.is_admin(auth.uid()) then
    if not exists (
      select 1
      from public.pagos p
      where p.servicio_id = p_servicio_id
        and p.ambiente = v_servicio.ambiente
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
    ) then
      raise exception 'El cliente todavía no confirmó una forma de pago habilitada';
    end if;
  end if;

  if v_servicio.estado='en_camino'
     and p_estado='llegado'
     and not private.is_admin(auth.uid())
     and not v_demo
     and v_servicio.ubicacion_cliente is not null then
    select st_distance(pp.ubicacion, v_servicio.ubicacion_cliente)
      into v_dist_m
      from public.perfiles_proveedor pp
      where pp.usuario_id=auth.uid()
        and pp.ubicacion is not null;

    if v_dist_m is null then
      raise exception 'Actualizá tu ubicación antes de confirmar llegada';
    end if;
    if v_dist_m > 200 then
      raise exception 'Todavía estás demasiado lejos del cliente para confirmar llegada';
    end if;
  end if;

  if v_servicio.estado='llegado'
     and p_estado='en_progreso'
     and not private.is_admin(auth.uid()) then
    if not exists (
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
    if not exists (
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
      iniciado_at=case when p_estado='en_progreso' then coalesce(iniciado_at,now()) else iniciado_at end,
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  return v_servicio;
end;
$$;

create or replace function private.aprobar_servicio_impl(p_servicio_id uuid)
returns public.servicios
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_servicio public.servicios%rowtype;
  v_pago public.pagos%rowtype;
  v_completed_count integer;
  v_cash boolean := false;
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
    if v_pago.estado<>'liberado'
       or nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null then
      raise exception 'El proveedor todavía no confirmó la recepción del efectivo';
    end if;
  else
    if v_pago.estado<>'retenido'
       or (
         nullif(btrim(coalesce(v_pago.mp_payment_id,'')),'') is null
         and nullif(btrim(coalesce(v_pago.pix_e2e_id,'')),'') is null
         and nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null
       ) then
      raise exception 'El pago todavía no está confirmado y protegido';
    end if;
  end if;

  update public.servicios
  set estado='completado',
      completado_at=now(),
      updated_at=now()
  where id=p_servicio_id
  returning * into v_servicio;

  if v_cash then
    update public.pagos
    set liberado_at=coalesce(liberado_at,now()),
        updated_at=now()
    where id=v_pago.id;
  else
    update public.pagos
    set estado='liberado',
        liberado_at=now(),
        updated_at=now()
    where id=v_pago.id;
  end if;

  select count(*)::integer into v_completed_count
  from public.servicios s
  where s.proveedor_id=v_servicio.proveedor_id
    and s.estado='completado';

  update public.usuarios
  set servicios_completados=v_completed_count
  where id=v_servicio.proveedor_id;

  return v_servicio;
end;
$$;