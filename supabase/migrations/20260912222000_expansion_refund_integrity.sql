create or replace function public.reembolsar_pago_ampliacion(
  p_ampliacion_id uuid,
  p_pago_externo_id text,
  p_monto numeric,
  p_moneda text default 'BRL'
)
returns public.ampliaciones_servicio
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_row public.ampliaciones_servicio%rowtype;
  v_servicio public.servicios%rowtype;
  v_monto numeric;
  v_comision numeric;
  v_neto numeric;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operación reservada al backend de pagos';
  end if;

  select * into v_row
  from public.ampliaciones_servicio
  where id = p_ampliacion_id
  for update;

  if not found then raise exception 'Ampliación no encontrada'; end if;
  if v_row.ajuste_estado = 'reembolsado' and v_row.pago_estado = 'pendiente_ajuste' then return v_row; end if;
  if v_row.estado <> 'aprobada' or v_row.pago_estado <> 'incluido' or v_row.ajuste_estado <> 'retenido' then
    raise exception 'La ampliación no tiene un ajuste retenido reembolsable';
  end if;
  if p_pago_externo_id is null or btrim(p_pago_externo_id) = '' then raise exception 'Falta referencia externa del reembolso'; end if;
  if v_row.ajuste_pago_externo_id is not null and v_row.ajuste_pago_externo_id <> p_pago_externo_id then
    raise exception 'El pago externo no coincide con la ampliación';
  end if;

  v_monto := coalesce(v_row.ajuste_monto, v_row.monto_extra, 0);
  if abs(coalesce(p_monto, 0) - v_monto) >= 0.01 then raise exception 'El monto reembolsado no coincide con la ampliación'; end if;
  if coalesce(v_row.ajuste_moneda, p_moneda, 'BRL') <> coalesce(p_moneda, 'BRL') then
    raise exception 'La moneda reembolsada no coincide con la ampliación';
  end if;

  select * into v_servicio from public.servicios where id = v_row.servicio_id for update;
  if not found then raise exception 'Servicio no encontrado'; end if;

  v_comision := round((v_monto * 0.15)::numeric, 2);
  v_neto := round((v_monto * 0.85)::numeric, 2);
  if coalesce(v_servicio.tarifa, 0) < v_monto
     or coalesce(v_servicio.comision_ugo, 0) < v_comision
     or coalesce(v_servicio.ganancia_proveedor, 0) < v_neto then
    raise exception 'Los totales del servicio no permiten revertir el ajuste sin inconsistencia';
  end if;

  update public.servicios
     set tarifa = round((coalesce(tarifa, 0) - v_monto)::numeric, 2),
         comision_ugo = round((coalesce(comision_ugo, 0) - v_comision)::numeric, 2),
         ganancia_proveedor = round((coalesce(ganancia_proveedor, 0) - v_neto)::numeric, 2),
         updated_at = now()
   where id = v_row.servicio_id;

  update public.ampliaciones_servicio
     set pago_estado = 'pendiente_ajuste', ajuste_estado = 'reembolsado', ajuste_actualizado_at = now(), updated_at = now()
   where id = v_row.id returning * into v_row;

  insert into public.notificaciones(usuario_id, tipo, titulo, cuerpo, datos)
  values(v_row.proveedor_id,'ampliacion_reembolsada','Trabajo adicional reembolsado',v_row.descripcion,
    jsonb_build_object('servicio_id',v_row.servicio_id,'ampliacion_id',v_row.id,'ajuste_estado',v_row.ajuste_estado,'pago_estado',v_row.pago_estado,'ajuste_pago_externo_id',p_pago_externo_id));

  return v_row;
end;
$function$;

revoke all on function public.reembolsar_pago_ampliacion(uuid,text,numeric,text) from public, anon, authenticated;
grant execute on function public.reembolsar_pago_ampliacion(uuid,text,numeric,text) to service_role;
