-- UGO · bidirectional push routing metadata.
-- Every notification gets the canonical recipient app role before the existing
-- push enqueue trigger runs. This makes Web Push routing reliable for both
-- Cliente and Proveedor without duplicating notification pipelines.

create or replace function private.enrich_notification_delivery_metadata()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_tipo text;
  v_role text;
begin
  select u.tipo::text
    into v_tipo
    from public.usuarios u
   where u.id=new.usuario_id;

  v_role:=case v_tipo
    when 'cliente' then 'client'
    when 'proveedor' then 'provider'
    when 'admin' then 'admin'
    when 'superadmin' then 'admin'
    else null
  end;

  if v_role is not null then
    new.datos:=coalesce(new.datos,'{}'::jsonb) || jsonb_build_object('role',v_role);
  else
    new.datos:=coalesce(new.datos,'{}'::jsonb);
  end if;

  return new;
end;
$$;

revoke all on function private.enrich_notification_delivery_metadata() from public,anon,authenticated;

drop trigger if exists trg_00_enrich_notification_delivery_metadata on public.notificaciones;
create trigger trg_00_enrich_notification_delivery_metadata
before insert on public.notificaciones
for each row execute function private.enrich_notification_delivery_metadata();

notify pgrst,'reload schema';
