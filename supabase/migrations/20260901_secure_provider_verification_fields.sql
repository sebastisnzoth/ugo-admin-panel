create or replace function private.proteger_verificacion_proveedor()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  if private.is_admin(auth.uid()) then return new; end if;
  if new.estado_verificacion is distinct from old.estado_verificacion
     or new.motivo_rechazo is distinct from old.motivo_rechazo then
    raise exception 'Solo UGO puede modificar el estado de verificación';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_verificacion_proveedor on public.perfiles_proveedor;
create trigger trg_proteger_verificacion_proveedor
before update on public.perfiles_proveedor
for each row execute function private.proteger_verificacion_proveedor();

create or replace function public.admin_cambiar_verificacion_proveedor(
  p_proveedor_id uuid,
  p_estado verificacion_estado,
  p_motivo text default null
)
returns public.perfiles_proveedor
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
  v_row public.perfiles_proveedor%rowtype;
begin
  if v_uid is null or not private.is_admin(v_uid) then raise exception 'Solo administradores'; end if;
  if p_estado='rechazado' and coalesce(trim(p_motivo),'')='' then raise exception 'Indicá el motivo del rechazo'; end if;
  update public.perfiles_proveedor
  set estado_verificacion=p_estado,
      motivo_rechazo=case when p_estado='rechazado' then trim(p_motivo) else null end,
      updated_at=now()
  where usuario_id=p_proveedor_id
  returning * into v_row;
  if not found then raise exception 'Proveedor inexistente'; end if;
  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin_verificacion_proveedor',v_uid,'proveedor',p_proveedor_id,jsonb_build_object('estado',p_estado::text,'motivo',case when p_estado='rechazado' then trim(p_motivo) else null end));
  return v_row;
end;
$$;
revoke all on function public.admin_cambiar_verificacion_proveedor(uuid,verificacion_estado,text) from public;
grant execute on function public.admin_cambiar_verificacion_proveedor(uuid,verificacion_estado,text) to authenticated;
