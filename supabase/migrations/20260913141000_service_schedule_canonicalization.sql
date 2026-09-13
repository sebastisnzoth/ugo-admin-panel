-- UGO TEST · canonical schedule persistence for client requests.
-- `servicios.programado_para` is the operational source of truth.
-- Legacy/current clients may still send metadata.scheduled_at; this trigger normalizes it
-- into the canonical column and keeps the metadata mirror aligned for compatibility.

create schema if not exists private;

create or replace function private.sync_service_schedule_canonical()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'private', 'pg_temp'
as $function$
declare
  v_scheduled_at text;
begin
  if new.programado_para is null then
    v_scheduled_at := nullif(btrim(coalesce(new.metadata->>'scheduled_at','')), '');
    if v_scheduled_at is not null then
      begin
        new.programado_para := v_scheduled_at::timestamptz;
      exception when others then
        raise exception 'Fecha programada inválida';
      end;
    end if;
  end if;

  if new.programado_para is not null then
    new.metadata := jsonb_set(
      coalesce(new.metadata, '{}'::jsonb),
      '{scheduled_at}',
      to_jsonb(new.programado_para),
      true
    );
  else
    new.metadata := coalesce(new.metadata, '{}'::jsonb) - 'scheduled_at';
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_service_schedule_canonical() from public;

update public.servicios
set programado_para = (metadata->>'scheduled_at')::timestamptz
where programado_para is null
  and nullif(btrim(coalesce(metadata->>'scheduled_at','')), '') is not null;

drop trigger if exists trg_sync_service_schedule_canonical on public.servicios;
create trigger trg_sync_service_schedule_canonical
before insert or update of programado_para, metadata on public.servicios
for each row execute function private.sync_service_schedule_canonical();

comment on column public.servicios.programado_para is
  'Fecha/hora canónica del servicio programado. metadata.scheduled_at es sólo espejo de compatibilidad.';
