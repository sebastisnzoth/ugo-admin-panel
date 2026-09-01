create or replace function public.admin_actualizar_retiro(
  p_retiro_id uuid,
  p_estado retiro_estado,
  p_transferencia_externa_id text default null,
  p_notas text default null
)
returns public.retiros
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_row public.retiros%rowtype;
begin
  if v_uid is null or not private.is_admin(v_uid) then raise exception 'Solo administradores'; end if;
  if p_estado not in ('procesando','pagado','fallido') then raise exception 'Estado de retiro no permitido'; end if;
  select * into v_row from public.retiros where id=p_retiro_id for update;
  if not found then raise exception 'Retiro inexistente'; end if;
  if v_row.estado='pagado' then raise exception 'El retiro ya está pagado'; end if;
  if v_row.estado='fallido' and p_estado<>'fallido' then raise exception 'Un retiro fallido no puede reabrirse desde esta acción'; end if;
  if p_estado='pagado' and coalesce(trim(p_transferencia_externa_id),'')='' then raise exception 'Se requiere referencia externa para marcar como pagado'; end if;
  update public.retiros
  set estado=p_estado,
      transferencia_externa_id=case when p_estado='pagado' then trim(p_transferencia_externa_id) else coalesce(transferencia_externa_id,nullif(trim(p_transferencia_externa_id),'')) end,
      procesado_at=case when p_estado in ('pagado','fallido') then now() else procesado_at end,
      notas=coalesce(nullif(trim(p_notas),''),notas)
  where id=p_retiro_id returning * into v_row;
  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin_retiro_'||p_estado::text,v_uid,'retiro',p_retiro_id,jsonb_build_object('estado',p_estado::text,'monto',v_row.monto,'referencia',v_row.transferencia_externa_id));
  return v_row;
end;
$$;
revoke all on function public.admin_actualizar_retiro(uuid,retiro_estado,text,text) from public;
grant execute on function public.admin_actualizar_retiro(uuid,retiro_estado,text,text) to authenticated;
