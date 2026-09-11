-- UGO · Checkout electrónico independiente para ampliaciones de servicio.
-- Permite financiar un monto adicional sin mutar el pago base ya activo.

alter table public.ampliaciones_servicio
  add column if not exists ajuste_estado text not null default 'no_iniciado',
  add column if not exists ajuste_procesador text,
  add column if not exists ajuste_metodo text,
  add column if not exists ajuste_pago_externo_id text,
  add column if not exists ajuste_preference_id text,
  add column if not exists ajuste_init_point text,
  add column if not exists ajuste_monto numeric(12,2),
  add column if not exists ajuste_moneda text,
  add column if not exists ajuste_actualizado_at timestamptz;

do $$ begin
  alter table public.ampliaciones_servicio
    add constraint ampliaciones_ajuste_estado_check
    check (ajuste_estado in ('no_iniciado','pendiente','retenido','fallido','reembolsado'));
exception when duplicate_object then null; end $$;

create unique index if not exists ampliaciones_ajuste_pago_externo_uidx
  on public.ampliaciones_servicio(ajuste_pago_externo_id)
  where ajuste_pago_externo_id is not null;

create unique index if not exists ampliaciones_ajuste_preference_uidx
  on public.ampliaciones_servicio(ajuste_preference_id)
  where ajuste_preference_id is not null;

create or replace function public.confirmar_pago_ampliacion(
  p_ampliacion_id uuid,
  p_pago_externo_id text,
  p_monto numeric,
  p_moneda text default 'BRL'
) returns public.ampliaciones_servicio
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_row public.ampliaciones_servicio%rowtype;
  v_servicio public.servicios%rowtype;
  v_total numeric;
  v_comision numeric;
  v_neto numeric;
begin
  -- Esta RPC es exclusivamente server-side/webhook.
  if auth.role() <> 'service_role' then
    raise exception 'Operación reservada al backend de pagos';
  end if;

  select * into v_row
  from public.ampliaciones_servicio
  where id=p_ampliacion_id
  for update;

  if not found then raise exception 'Ampliación no encontrada'; end if;
  if v_row.estado <> 'pendiente' then
    -- Idempotencia: si ya fue aprobada e incluida, devolvemos la fila.
    if v_row.estado='aprobada' and v_row.pago_estado='incluido' and v_row.ajuste_estado='retenido' then
      return v_row;
    end if;
    raise exception 'La ampliación ya fue resuelta';
  end if;
  if coalesce(v_row.monto_extra,0) <= 0 then raise exception 'La ampliación no requiere ajuste electrónico'; end if;
  if p_pago_externo_id is null or btrim(p_pago_externo_id)='' then raise exception 'Falta referencia externa del ajuste'; end if;
  if abs(coalesce(p_monto,0)-v_row.monto_extra) >= 0.01 then raise exception 'El monto cobrado no coincide con la ampliación'; end if;

  select * into v_servicio
  from public.servicios
  where id=v_row.servicio_id
  for update;

  if not found then raise exception 'Servicio no encontrado'; end if;
  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso') then raise exception 'El servicio ya no admite esta ampliación'; end if;
  if coalesce(v_servicio.moneda,'BRL') <> coalesce(p_moneda,'BRL') then raise exception 'La moneda cobrada no coincide con el servicio'; end if;

  v_total := round((coalesce(v_servicio.tarifa,0)+v_row.monto_extra)::numeric,2);
  v_comision := round((coalesce(v_servicio.comision_ugo,0)+(v_row.monto_extra*0.15))::numeric,2);
  v_neto := round((coalesce(v_servicio.ganancia_proveedor,0)+(v_row.monto_extra*0.85))::numeric,2);

  update public.servicios
     set tarifa=v_total,
         comision_ugo=v_comision,
         ganancia_proveedor=v_neto,
         updated_at=now()
   where id=v_row.servicio_id;

  update public.ampliaciones_servicio
     set estado='aprobada',
         pago_estado='incluido',
         ajuste_estado='retenido',
         ajuste_pago_externo_id=p_pago_externo_id,
         ajuste_monto=p_monto,
         ajuste_moneda=coalesce(p_moneda,'BRL'),
         ajuste_actualizado_at=now(),
         resuelto_por=cliente_id,
         resuelto_at=now(),
         updated_at=now()
   where id=v_row.id
   returning * into v_row;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(
    v_row.proveedor_id,
    'ampliacion_resuelta',
    'Trabajo adicional aprobado y financiado',
    v_row.descripcion,
    jsonb_build_object('servicio_id',v_row.servicio_id,'ampliacion_id',v_row.id,'estado',v_row.estado,'pago_estado',v_row.pago_estado,'ajuste_pago_externo_id',p_pago_externo_id)
  );

  return v_row;
end;
$$;

revoke all on function public.confirmar_pago_ampliacion(uuid,text,numeric,text) from public, anon, authenticated;
grant execute on function public.confirmar_pago_ampliacion(uuid,text,numeric,text) to service_role;
