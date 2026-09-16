-- UGO P0 · client final approval must not mutate another user's protected profile.
-- servicios is the source of truth for completed-job counts; the denormalized
-- usuarios.servicios_completados write conflicted with the privilege guard.

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
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into v_servicio from public.servicios where id=p_servicio_id for update;
  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.cliente_id<>auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado<>'esperando_aprobacion' then raise exception 'El servicio todavía no puede aprobarse'; end if;

  if not exists(select 1 from public.evidencias_servicio e where e.servicio_id=p_servicio_id and e.tipo='despues' and e.usuario_id=v_servicio.proveedor_id and nullif(trim(coalesce(e.storage_path,'')),'') is not null) then
    raise exception 'Falta la evidencia final del proveedor';
  end if;

  select * into v_pago from public.pagos where servicio_id=p_servicio_id and ambiente=v_servicio.ambiente order by created_at desc limit 1 for update;
  if not found then raise exception 'El servicio todavía no tiene una forma de pago confirmada'; end if;
  v_cash:=v_pago.metodo='efectivo' and v_pago.procesador='efectivo' and v_pago.modelo_pago='presencial';

  if v_cash then
    if v_pago.estado<>'liberado' or nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null then raise exception 'El proveedor todavía no confirmó la recepción del efectivo'; end if;
  else
    if v_pago.estado<>'retenido' or (nullif(btrim(coalesce(v_pago.mp_payment_id,'')),'') is null and nullif(btrim(coalesce(v_pago.pix_e2e_id,'')),'') is null and nullif(btrim(coalesce(v_pago.pago_externo_id,'')),'') is null) then raise exception 'El pago todavía no está confirmado y protegido'; end if;
  end if;

  update public.servicios set estado='completado',completado_at=coalesce(completado_at,now()),updated_at=now() where id=p_servicio_id returning * into v_servicio;
  if v_cash then
    update public.pagos set liberado_at=coalesce(liberado_at,now()),updated_at=now() where id=v_pago.id;
  else
    update public.pagos set estado='liberado',liberado_at=coalesce(liberado_at,now()),updated_at=now() where id=v_pago.id;
  end if;
  return v_servicio;
end;
$$;

revoke execute on function private.aprobar_servicio_impl(uuid) from public, anon;
grant execute on function private.aprobar_servicio_impl(uuid) to authenticated, service_role;
revoke execute on function public.aprobar_servicio(uuid) from public, anon;
grant execute on function public.aprobar_servicio(uuid) to authenticated, service_role;
