alter table public.perfiles_cliente
  add column if not exists termos_aceitos_at timestamptz,
  add column if not exists termos_versao text,
  add column if not exists onboarding_completo_at timestamptz;

create or replace function public.completar_onboarding_cliente(
  p_nombre text,
  p_apellido text,
  p_telefono text,
  p_direccion text,
  p_barrio text,
  p_ciudad text,
  p_idioma_preferido text default 'pt-BR',
  p_contacto_preferido text default 'whatsapp',
  p_termos_versao text default '2026-09-04'
)
returns public.perfiles_cliente
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_profile public.perfiles_cliente;
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if not exists(select 1 from public.usuarios where id=v_uid and tipo='cliente' and activo=true) then
    raise exception 'Cuenta de cliente inválida o inactiva';
  end if;
  if nullif(trim(p_nombre),'') is null then raise exception 'Nombre requerido'; end if;
  if nullif(regexp_replace(coalesce(p_telefono,''),'\D','','g'),'') is null or length(regexp_replace(coalesce(p_telefono,''),'\D','','g')) < 8 then raise exception 'Teléfono/WhatsApp inválido'; end if;
  if nullif(trim(p_direccion),'') is null then raise exception 'Dirección requerida'; end if;
  if nullif(trim(p_ciudad),'') is null then raise exception 'Ciudad requerida'; end if;

  update public.usuarios
     set nombre=trim(p_nombre),
         apellido=nullif(trim(coalesce(p_apellido,'')),''),
         telefono=trim(p_telefono),
         endereco=trim(p_direccion),
         zona=nullif(trim(coalesce(p_barrio,'')),''),
         pais='BR',
         updated_at=now()
   where id=v_uid;

  insert into public.perfiles_cliente(
    usuario_id,telefono,direccion,barrio,ciudad,idioma_preferido,contacto_preferido,
    termos_aceitos_at,termos_versao,onboarding_completo_at
  ) values (
    v_uid,trim(p_telefono),trim(p_direccion),nullif(trim(coalesce(p_barrio,'')),''),trim(p_ciudad),
    coalesce(nullif(trim(p_idioma_preferido),''),'pt-BR'),
    coalesce(nullif(trim(p_contacto_preferido),''),'whatsapp'),
    now(),coalesce(nullif(trim(p_termos_versao),''),'2026-09-04'),now()
  )
  on conflict (usuario_id) do update set
    telefono=excluded.telefono,
    direccion=excluded.direccion,
    barrio=excluded.barrio,
    ciudad=excluded.ciudad,
    idioma_preferido=excluded.idioma_preferido,
    contacto_preferido=excluded.contacto_preferido,
    termos_aceitos_at=excluded.termos_aceitos_at,
    termos_versao=excluded.termos_versao,
    onboarding_completo_at=coalesce(public.perfiles_cliente.onboarding_completo_at,excluded.onboarding_completo_at),
    updated_at=now()
  returning * into v_profile;

  return v_profile;
end;
$function$;

revoke all on function public.completar_onboarding_cliente(text,text,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.completar_onboarding_cliente(text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function private.enforce_client_onboarding_before_service()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
begin
  if private.is_admin(auth.uid()) then return new; end if;
  if new.cliente_id is distinct from auth.uid() then return new; end if;
  if not exists(
    select 1 from public.perfiles_cliente pc
    where pc.usuario_id=new.cliente_id
      and pc.onboarding_completo_at is not null
      and pc.termos_aceitos_at is not null
      and nullif(trim(pc.telefono),'') is not null
      and nullif(trim(pc.direccion),'') is not null
      and nullif(trim(pc.ciudad),'') is not null
  ) then
    raise exception 'Completá tu perfil y aceptá los términos antes de pedir un servicio';
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_client_onboarding_before_service on public.servicios;
create trigger trg_client_onboarding_before_service
before insert on public.servicios
for each row execute function private.enforce_client_onboarding_before_service();