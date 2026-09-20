-- UGO · Reputación derivada de las calificaciones realmente recibidas.
create or replace function private.refresh_usuario_karma(p_usuario_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_avg numeric;
begin
  if p_usuario_id is null then return; end if;

  select round(avg(r.puntuacion)::numeric, 2)
    into v_avg
  from public.resenas r
  where case
    when coalesce(r.autor_tipo,'cliente')='cliente' then r.proveedor_id
    else r.cliente_id
  end = p_usuario_id;

  update public.usuarios
     set karma = coalesce(v_avg, 5.00),
         updated_at = now()
   where id = p_usuario_id;
end;
$$;

revoke all on function private.refresh_usuario_karma(uuid) from public, anon, authenticated;

create or replace function private.sync_resena_karma()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_old_target uuid;
  v_new_target uuid;
begin
  if tg_op <> 'INSERT' then
    v_old_target := case
      when coalesce(old.autor_tipo,'cliente')='cliente' then old.proveedor_id
      else old.cliente_id
    end;
  end if;

  if tg_op <> 'DELETE' then
    v_new_target := case
      when coalesce(new.autor_tipo,'cliente')='cliente' then new.proveedor_id
      else new.cliente_id
    end;
  end if;

  if v_old_target is not null then
    perform private.refresh_usuario_karma(v_old_target);
  end if;
  if v_new_target is not null and v_new_target is distinct from v_old_target then
    perform private.refresh_usuario_karma(v_new_target);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists resenas_sync_karma on public.resenas;
create trigger resenas_sync_karma
after insert or update or delete on public.resenas
for each row execute function private.sync_resena_karma();

do $$
declare
  rec record;
begin
  for rec in
    select distinct case
      when coalesce(r.autor_tipo,'cliente')='cliente' then r.proveedor_id
      else r.cliente_id
    end as usuario_id
    from public.resenas r
  loop
    perform private.refresh_usuario_karma(rec.usuario_id);
  end loop;
end $$;
