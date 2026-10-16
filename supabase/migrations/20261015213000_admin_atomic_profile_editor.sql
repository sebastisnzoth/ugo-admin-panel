-- UGO TEST-only rollout until reviewed. Atomic, strictly whitelisted profile updates.
-- Service-role-only RPC invoked after API verified the JWT and actor role.
create or replace function public.admin_update_user_profile_atomic(
  p_actor_id uuid,
  p_target_id uuid,
  p_base jsonb default '{}'::jsonb,
  p_detail jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_actor_role text;
  v_target_role text;
  v_user_name text;
  v_k text;
begin
  if p_actor_id is null or p_target_id is null then raise exception 'ACTOR_AND_TARGET_REQUIRED'; end if;
  if jsonb_typeof(coalesce(p_base,'{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_detail,'{}'::jsonb)) <> 'object'
  then raise exception 'INVALID_PATCH'; end if;
  p_base := coalesce(p_base,'{}'::jsonb);
  p_detail := coalesce(p_detail,'{}'::jsonb);
  if p_base = '{}'::jsonb and p_detail = '{}'::jsonb then raise exception 'EMPTY_PROFILE_PATCH'; end if;

  select tipo::text into v_actor_role from public.usuarios where id = p_actor_id and activo = true;
  if v_actor_role not in ('admin','superadmin') or v_actor_role is null then
    raise exception 'ADMIN_AUTHORIZATION_REQUIRED';
  end if;
  select tipo::text into v_target_role from public.usuarios where id = p_target_id for update;
  if v_target_role is null then raise exception 'TARGET_USER_NOT_FOUND'; end if;
  if v_target_role in ('admin','superadmin','arbitro') and
     (v_actor_role <> 'superadmin' and p_actor_id <> p_target_id) then
    raise exception 'SUPERADMIN_REQUIRED';
  end if;
  if v_target_role = 'superadmin' and p_actor_id <> p_target_id then
    raise exception 'SUPERADMIN_PROFILE_OWNER_REQUIRED';
  end if;

  if exists(select 1 from jsonb_object_keys(p_base) k
      where k not in ('nombre','apellido','telefono','pais','zona','endereco')) then
    raise exception 'BASE_FIELD_NOT_EDITABLE';
  end if;
  if (p_base ? 'nombre') and length(trim(coalesce(p_base->>'nombre',''))) = 0 then
    raise exception 'NAME_REQUIRED';
  end if;
  if (p_base ? 'pais') and (length(trim(coalesce(p_base->>'pais',''))) <> 2) then
    raise exception 'COUNTRY_CODE_REQUIRED';
  end if;
  if length(coalesce(p_base->>'nombre','')) > 80 or length(coalesce(p_base->>'apellido','')) > 80
    or length(coalesce(p_base->>'telefono','')) > 40 or length(coalesce(p_base->>'endereco','')) > 255
    or length(coalesce(p_base->>'zona','')) > 160 then
    raise exception 'PROFILE_FIELD_TOO_LONG';
  end if;

  update public.usuarios set
    nombre = case when p_base ? 'nombre' then trim(p_base->>'nombre') else nombre end,
    apellido = case when p_base ? 'apellido' then nullif(trim(p_base->>'apellido'),'') else apellido end,
    telefono = case when p_base ? 'telefono' then nullif(trim(p_base->>'telefono'),'') else telefono end,
    pais = case when p_base ? 'pais' then upper(trim(p_base->>'pais'))::char(2) else pais end,
    zona = case when p_base ? 'zona' then nullif(trim(p_base->>'zona'),'') else zona end,
    endereco = case when p_base ? 'endereco' then nullif(trim(p_base->>'endereco'),'') else endereco end,
    updated_at = now()
  where id = p_target_id;

  if v_target_role = 'cliente' then
    if exists(select 1 from jsonb_object_keys(p_detail) k
        where k not in ('telefono','direccion','barrio','ciudad','idioma_preferido','contacto_preferido')) then
      raise exception 'CLIENT_FIELD_NOT_EDITABLE';
    end if;
    if (p_detail ? 'idioma_preferido') and
      (p_detail->>'idioma_preferido' not in ('pt-BR','es-AR','es','en')) then
      raise exception 'CLIENT_LANGUAGE_INVALID';
    end if;
    if (p_detail ? 'contacto_preferido') and
      (lower(p_detail->>'contacto_preferido') not in ('whatsapp','telefono','chat','email')) then
      raise exception 'CLIENT_CONTACT_INVALID';
    end if;
    insert into public.perfiles_cliente(usuario_id) values(p_target_id)
      on conflict (usuario_id) do nothing;
    update public.perfiles_cliente set
      telefono=case when p_detail ? 'telefono' then nullif(trim(p_detail->>'telefono'),'') else telefono end,
      direccion=case when p_detail ? 'direccion' then nullif(trim(p_detail->>'direccion'),'') else direccion end,
      barrio=case when p_detail ? 'barrio' then nullif(trim(p_detail->>'barrio'),'') else barrio end,
      ciudad=case when p_detail ? 'ciudad' then nullif(trim(p_detail->>'ciudad'),'') else ciudad end,
      idioma_preferido=case when p_detail ? 'idioma_preferido' then p_detail->>'idioma_preferido' else idioma_preferido end,
      contacto_preferido=case when p_detail ? 'contacto_preferido' then lower(p_detail->>'contacto_preferido') else contacto_preferido end,
      updated_at=now()
    where usuario_id=p_target_id;
  elsif v_target_role = 'proveedor' then
    if exists(select 1 from jsonb_object_keys(p_detail) k
      where k not in ('telefono_profesional','ciudad_base','bio','especialidades','disponibilidad_horaria','experiencia_anos','zona_radio_km','tarifa_base')) then
      raise exception 'PROVIDER_FIELD_NOT_EDITABLE';
    end if;
    if (p_detail ? 'experiencia_anos') and
       (coalesce(p_detail->>'experiencia_anos','') !~ '^[0-9]{1,2}$'
        or (p_detail->>'experiencia_anos')::integer > 80) then
      raise exception 'PROVIDER_EXPERIENCE_INVALID';
    end if;
    if (p_detail ? 'zona_radio_km') and
       (coalesce(p_detail->>'zona_radio_km','') !~ '^[0-9]{1,3}(\\.[0-9]{1,2})?$'
        or (p_detail->>'zona_radio_km')::numeric < 1
        or (p_detail->>'zona_radio_km')::numeric > 100) then
      raise exception 'PROVIDER_RADIUS_INVALID';
    end if;
    if (p_detail ? 'tarifa_base') and
       (coalesce(p_detail->>'tarifa_base','') !~ '^[0-9]{1,7}(\\.[0-9]{1,2})?$'
        or (p_detail->>'tarifa_base')::numeric > 1000000) then
      raise exception 'PROVIDER_RATE_INVALID';
    end if;
    update public.perfiles_proveedor set
      telefono_profesional=case when p_detail ? 'telefono_profesional' then nullif(trim(p_detail->>'telefono_profesional'),'') else telefono_profesional end,
      ciudad_base=case when p_detail ? 'ciudad_base' then nullif(trim(p_detail->>'ciudad_base'),'') else ciudad_base end,
      bio=case when p_detail ? 'bio' then nullif(trim(p_detail->>'bio'),'') else bio end,
      especialidades=case when p_detail ? 'especialidades' then nullif(trim(p_detail->>'especialidades'),'') else especialidades end,
      disponibilidad_horaria=case when p_detail ? 'disponibilidad_horaria' then nullif(trim(p_detail->>'disponibilidad_horaria'),'') else disponibilidad_horaria end,
      experiencia_anos=case when p_detail ? 'experiencia_anos' then (p_detail->>'experiencia_anos')::integer else experiencia_anos end,
      zona_radio_km=case when p_detail ? 'zona_radio_km' then (p_detail->>'zona_radio_km')::numeric else zona_radio_km end,
      tarifa_base=case when p_detail ? 'tarifa_base' then (p_detail->>'tarifa_base')::numeric else tarifa_base end,
      updated_at=now()
    where usuario_id=p_target_id;
    if not found then raise exception 'PROVIDER_PROFILE_MISSING'; end if;
  elsif p_detail <> '{}'::jsonb then
    raise exception 'ROLE_DETAILS_NOT_EDITABLE';
  end if;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values('admin.profile.updated',p_actor_id,'usuario',p_target_id,
     jsonb_build_object('target_role',v_target_role,'base_keys',
       (select coalesce(jsonb_agg(key),'[]'::jsonb) from jsonb_object_keys(p_base) key),
       'detail_keys',
       (select coalesce(jsonb_agg(key),'[]'::jsonb) from jsonb_object_keys(p_detail) key),
       'source','admin-profile-editor'));
  return jsonb_build_object('saved',true,'id',p_target_id,'role',v_target_role);
end
$$;

revoke all on function public.admin_update_user_profile_atomic(uuid,uuid,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_update_user_profile_atomic(uuid,uuid,jsonb,jsonb)
  to service_role;
