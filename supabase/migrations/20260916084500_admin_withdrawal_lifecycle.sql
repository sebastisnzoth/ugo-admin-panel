create or replace function public.admin_actualizar_retiro(
  p_retiro_id uuid,
  p_estado text,
  p_transferencia_externa_id text default null,
  p_notas text default null
)
returns public.retiros
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_row public.retiros%rowtype;
  v_next public.retiro_estado;
  v_ref text := nullif(btrim(coalesce(p_transferencia_externa_id,'')),'');
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;
  if p_retiro_id is null then
    raise exception 'WITHDRAWAL_ID_REQUIRED' using errcode='22023';
  end if;
  begin
    v_next := lower(btrim(coalesce(p_estado,'')))::public.retiro_estado;
  exception when others then
    raise exception 'INVALID_WITHDRAWAL_STATE' using errcode='22023';
  end;

  select * into v_row from public.retiros where id=p_retiro_id for update;
  if not found then raise exception 'WITHDRAWAL_NOT_FOUND' using errcode='P0002'; end if;
  if v_row.ambiente <> 'real' then raise exception 'DEMO_WITHDRAWAL_FORBIDDEN' using errcode='42501'; end if;
  if v_row.estado in ('pagado'::public.retiro_estado,'fallido'::public.retiro_estado) then
    raise exception 'WITHDRAWAL_ALREADY_FINAL' using errcode='22023';
  end if;
  if v_next not in ('procesando'::public.retiro_estado,'pagado'::public.retiro_estado,'fallido'::public.retiro_estado) then
    raise exception 'INVALID_WITHDRAWAL_TRANSITION' using errcode='22023';
  end if;
  if v_next='pagado'::public.retiro_estado and v_ref is null then
    raise exception 'TRANSFER_REFERENCE_REQUIRED' using errcode='22023';
  end if;

  update public.retiros
  set estado=v_next,
      transferencia_externa_id=case when v_next='pagado'::public.retiro_estado then v_ref else coalesce(v_ref,transferencia_externa_id) end,
      notas=coalesce(nullif(btrim(coalesce(p_notas,'')),''),notas),
      procesado_at=case when v_next in ('pagado'::public.retiro_estado,'fallido'::public.retiro_estado) then now() else procesado_at end
  where id=p_retiro_id
  returning * into v_row;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin.withdrawal.update',auth.uid(),'retiro',p_retiro_id,jsonb_build_object('estado',v_next,'transferencia_externa_id',v_ref,'monto',v_row.monto,'proveedor_id',v_row.proveedor_id));

  return v_row;
end;
$$;

revoke all on function public.admin_actualizar_retiro(uuid,text,text,text) from public;
grant execute on function public.admin_actualizar_retiro(uuid,text,text,text) to authenticated;
