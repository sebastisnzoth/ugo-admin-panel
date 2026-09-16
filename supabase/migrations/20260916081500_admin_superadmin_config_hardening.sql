create or replace function private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, private, auth
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.tipo = 'superadmin'::public.usuario_tipo
      and u.activo = true
  );
$$;

revoke all on function private.is_superadmin() from public;
grant execute on function private.is_superadmin() to authenticated;

create or replace function public.admin_update_config(p_clave text, p_valor jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_row public.config_sistema%rowtype;
begin
  if auth.uid() is null or not private.is_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if p_clave is null or btrim(p_clave) = '' then
    raise exception 'CONFIG_KEY_REQUIRED' using errcode = '22023';
  end if;

  if p_clave like 'feature\_%' escape '\' and not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED_FOR_FEATURE_FLAGS' using errcode = '42501';
  end if;

  insert into public.config_sistema(clave, valor, updated_at, updated_by)
  values (btrim(p_clave), coalesce(p_valor, 'null'::jsonb), now(), auth.uid())
  on conflict (clave) do update
    set valor = excluded.valor,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
  returning * into v_row;

  insert into public.audit_log(evento, actor_id, entidad_tipo, detalles)
  values (
    'admin.config.update',
    auth.uid(),
    'config_sistema',
    jsonb_build_object('clave', v_row.clave, 'valor', v_row.valor)
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.admin_update_config(text, jsonb) from public;
grant execute on function public.admin_update_config(text, jsonb) to authenticated;

create or replace function public.admin_set_feature_flag(p_clave text, p_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_key text;
  v_row public.config_sistema%rowtype;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_key := btrim(coalesce(p_clave, ''));
  if v_key = '' then
    raise exception 'FEATURE_FLAG_KEY_REQUIRED' using errcode = '22023';
  end if;
  if v_key not like 'feature\_%' escape '\' then
    v_key := 'feature_' || v_key;
  end if;

  insert into public.config_sistema(clave, valor, grupo, updated_at, updated_by)
  values (v_key, to_jsonb(coalesce(p_enabled, false)), 'feature_flags', now(), auth.uid())
  on conflict (clave) do update
    set valor = excluded.valor,
        grupo = 'feature_flags',
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
  returning * into v_row;

  insert into public.audit_log(evento, actor_id, entidad_tipo, detalles)
  values (
    'superadmin.feature_flag.update',
    auth.uid(),
    'config_sistema',
    jsonb_build_object('clave', v_row.clave, 'enabled', p_enabled)
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.admin_set_feature_flag(text, boolean) from public;
grant execute on function public.admin_set_feature_flag(text, boolean) to authenticated;
