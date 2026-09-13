-- UGO TEST · schedule timezone guard for the initial Florianópolis market.
-- Browser datetime-local values arrive without an offset. Interpret those legacy/current
-- wall-clock values in America/Sao_Paulo; values that already include Z/offset stay absolute.

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
        if v_scheduled_at ~ '([zZ]|[+-][0-9]{2}:[0-9]{2})$' then
          new.programado_para := v_scheduled_at::timestamptz;
        else
          new.programado_para := v_scheduled_at::timestamp at time zone 'America/Sao_Paulo';
        end if;
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

-- Repair any row that may have been canonicalized from a timezone-less browser value.
update public.servicios
set programado_para = (metadata->>'scheduled_at')::timestamp at time zone 'America/Sao_Paulo'
where programado_para is not null
  and nullif(btrim(coalesce(metadata->>'scheduled_at','')), '') is not null
  and (metadata->>'scheduled_at') !~ '([zZ]|[+-][0-9]{2}:[0-9]{2})$';
