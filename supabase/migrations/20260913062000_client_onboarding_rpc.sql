create or replace function public.completar_onboarding_cliente(
  p_nombre text,
  p_apellido text,
  p_telefono text,
  p_direccion text,
  p_barrio text,
  p_ciudad text,
  p_idioma_preferido text,
  p_contacto_preferido text,
  p_termos_versao text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Usuario no autenticado' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.usuarios
    where id = v_uid
      and tipo = 'cliente'::public.usuario_tipo
      and activo = true
  ) then
    raise exception 'La cuenta autenticada no es un cliente activo' using errcode = '42501';
  end if;

  update public.usuarios
  set nombre = trim(coalesce(p_nombre, '')),
      apellido = nullif(trim(coalesce(p_apellido, '')), ''),
      telefono = nullif(trim(coalesce(p_telefono, '')), ''),
      lat = p_lat,
      lng = p_lng,
      updated_at = v_now
  where id = v_uid;

  insert into public.perfiles_cliente (
    usuario_id,
    telefono,
    direccion,
    barrio,
    ciudad,
    idioma_preferido,
    contacto_preferido,
    termos_aceitos_at,
    termos_versao,
    onboarding_completo_at,
    updated_at
  ) values (
    v_uid,
    nullif(trim(coalesce(p_telefono, '')), ''),
    nullif(trim(coalesce(p_direccion, '')), ''),
    nullif(trim(coalesce(p_barrio, '')), ''),
    nullif(trim(coalesce(p_ciudad, '')), ''),
    coalesce(nullif(trim(p_idioma_preferido), ''), 'pt-BR'),
    coalesce(nullif(trim(p_contacto_preferido), ''), 'whatsapp'),
    v_now,
    nullif(trim(coalesce(p_termos_versao, '')), ''),
    v_now,
    v_now
  )
  on conflict (usuario_id) do update
  set telefono = excluded.telefono,
      direccion = excluded.direccion,
      barrio = excluded.barrio,
      ciudad = excluded.ciudad,
      idioma_preferido = excluded.idioma_preferido,
      contacto_preferido = excluded.contacto_preferido,
      termos_aceitos_at = excluded.termos_aceitos_at,
      termos_versao = excluded.termos_versao,
      onboarding_completo_at = excluded.onboarding_completo_at,
      updated_at = excluded.updated_at;
end;
$$;

grant execute on function public.completar_onboarding_cliente(text,text,text,text,text,text,text,text,text,double precision,double precision) to authenticated;
