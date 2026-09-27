-- UGO P0 · keep user karma synchronized with bilateral service ratings.
-- Only persisted completed-service reviews participate in the average.
-- Nested trigger writes may update karma+updated_at only; direct users remain protected.

create or replace function public.guard_usuario_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','auth','pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_admin boolean := false;
  v_super boolean := false;
  v_nested_karma_only boolean := false;
begin
  if v_uid is null then return new; end if;
  v_admin := private.is_admin(v_uid);
  v_super := private.is_superadmin();

  if new.id is distinct from old.id then
    raise exception 'USER_ID_IMMUTABLE' using errcode='42501';
  end if;

  if tg_op='UPDATE' and pg_trigger_depth()>1 then
    v_nested_karma_only :=
      new.id is not distinct from old.id
      and (
        to_jsonb(new) - array['karma','updated_at']::text[]
      ) = (
        to_jsonb(old) - array['karma','updated_at']::text[]
      );
    if v_nested_karma_only then
      new.updated_at := now();
      return new;
    end if;
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

revoke execute on function public.guard_usuario_sensitive_fields() from public,anon,authenticated;

create or replace function private.recalculate_rating_karma(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_karma numeric(4,2);
begin
  if p_user_id is null then return; end if;

  select round(coalesce(avg(x.puntuacion),5.00)::numeric,2)
    into v_karma
  from (
    select r.puntuacion
      from public.resenas r
     where r.autor_tipo='cliente'
       and r.proveedor_id=p_user_id
    union all
    select r.puntuacion
      from public.resenas r
     where r.autor_tipo='proveedor'
       and r.cliente_id=p_user_id
  ) x;

  update public.usuarios
     set karma=least(5.00,greatest(1.00,coalesce(v_karma,5.00))),
         updated_at=now()
   where id=p_user_id;
end;
$$;

revoke all on function private.recalculate_rating_karma(uuid) from public,anon,authenticated;

create or replace function private.sync_rating_karma()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
declare
  v_new_target uuid;
  v_old_target uuid;
begin
  if tg_op<>'DELETE' then
    v_new_target := case
      when new.autor_tipo='cliente' then new.proveedor_id
      when new.autor_tipo='proveedor' then new.cliente_id
      else null end;
  end if;

  if tg_op<>'INSERT' then
    v_old_target := case
      when old.autor_tipo='cliente' then old.proveedor_id
      when old.autor_tipo='proveedor' then old.cliente_id
      else null end;
  end if;

  if v_old_target is not null and v_old_target is distinct from v_new_target then
    perform private.recalculate_rating_karma(v_old_target);
  end if;
  if v_new_target is not null then
    perform private.recalculate_rating_karma(v_new_target);
  elsif v_old_target is not null then
    perform private.recalculate_rating_karma(v_old_target);
  end if;

  return coalesce(new,old);
end;
$$;

revoke all on function private.sync_rating_karma() from public,anon,authenticated;

drop trigger if exists trg_sync_rating_karma on public.resenas;
create trigger trg_sync_rating_karma
after insert or update of puntuacion,autor_tipo,cliente_id,proveedor_id or delete
on public.resenas
for each row execute function private.sync_rating_karma();

-- Backfill existing TEST/real data deterministically.
do $$
declare r record;
begin
  for r in
    select distinct target_id
    from (
      select proveedor_id as target_id from public.resenas where autor_tipo='cliente'
      union
      select cliente_id as target_id from public.resenas where autor_tipo='proveedor'
    ) q
    where target_id is not null
  loop
    perform private.recalculate_rating_karma(r.target_id);
  end loop;
end
$$;

notify pgrst,'reload schema';
