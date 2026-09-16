create or replace function public.guard_usuario_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_super boolean := false;
begin
  if v_uid is null then return new; end if;
  v_admin := private.is_admin(v_uid);
  v_super := private.is_superadmin();

  if new.id is distinct from old.id then
    raise exception 'USER_ID_IMMUTABLE' using errcode='42501';
  end if;

  if old.id = v_uid then
    if new.tipo is distinct from old.tipo
       or new.activo is distinct from old.activo
       or new.karma is distinct from old.karma
       or new.servicios_completados is distinct from old.servicios_completados
       or new.email is distinct from old.email
       or new.created_at is distinct from old.created_at
       or new.fecha_registro is distinct from old.fecha_registro
       or new.es_demo is distinct from old.es_demo
       or new.prospecto_id is distinct from old.prospecto_id then
      raise exception 'USER_SENSITIVE_FIELDS_ADMIN_ONLY' using errcode='42501';
    end if;
    new.updated_at := now();
    return new;
  end if;

  if not v_admin then
    raise exception 'ADMIN_REQUIRED' using errcode='42501';
  end if;

  if (old.tipo::text in ('admin','superadmin','arbitro')
      or new.tipo::text in ('admin','superadmin','arbitro')) and not v_super then
    if new.tipo is distinct from old.tipo or new.activo is distinct from old.activo then
      raise exception 'SUPERADMIN_REQUIRED_FOR_PRIVILEGED_ACCOUNT' using errcode='42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_00_usuario_sensitive_guard on public.usuarios;
create trigger trg_00_usuario_sensitive_guard
before update on public.usuarios
for each row execute function public.guard_usuario_sensitive_fields();
