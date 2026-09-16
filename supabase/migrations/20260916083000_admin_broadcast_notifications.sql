create or replace function public.admin_notificacion_masiva(
  p_titulo text,
  p_cuerpo text,
  p_target text default 'todos',
  p_zona text default null
)
returns integer
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_target text := lower(btrim(coalesce(p_target, 'todos')));
  v_titulo text := btrim(coalesce(p_titulo, ''));
  v_cuerpo text := btrim(coalesce(p_cuerpo, ''));
  v_batch text := gen_random_uuid()::text;
  v_count integer := 0;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if v_titulo = '' or length(v_titulo) > 120 then
    raise exception 'INVALID_NOTIFICATION_TITLE' using errcode = '22023';
  end if;
  if v_cuerpo = '' or length(v_cuerpo) > 2000 then
    raise exception 'INVALID_NOTIFICATION_BODY' using errcode = '22023';
  end if;
  if v_target not in ('todos','clientes','proveedores','admins') then
    raise exception 'INVALID_NOTIFICATION_TARGET' using errcode = '22023';
  end if;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos,dedupe_key)
  select
    u.id,
    'admin_broadcast',
    v_titulo,
    v_cuerpo,
    jsonb_build_object('source','admin_broadcast','target',v_target,'zona',nullif(btrim(coalesce(p_zona,'')),''),'actor_id',auth.uid(),'batch_id',v_batch),
    'admin_broadcast:' || v_batch || ':' || u.id::text
  from public.usuarios u
  where u.activo = true
    and (nullif(btrim(coalesce(p_zona,'')),'') is null or lower(coalesce(u.zona,'')) = lower(btrim(p_zona)))
    and (
      v_target = 'todos'
      or (v_target = 'clientes' and u.tipo = 'cliente'::public.usuario_tipo)
      or (v_target = 'proveedores' and u.tipo = 'proveedor'::public.usuario_tipo)
      or (v_target = 'admins' and u.tipo in ('admin'::public.usuario_tipo,'superadmin'::public.usuario_tipo))
    );
  get diagnostics v_count = row_count;

  insert into public.audit_log(evento,actor_id,entidad_tipo,detalles)
  values ('admin.notification.broadcast',auth.uid(),'notificaciones',jsonb_build_object('batch_id',v_batch,'target',v_target,'zona',nullif(btrim(coalesce(p_zona,'')),''),'count',v_count,'titulo',v_titulo));

  return v_count;
end;
$$;

revoke all on function public.admin_notificacion_masiva(text,text,text,text) from public;
grant execute on function public.admin_notificacion_masiva(text,text,text,text) to authenticated;
