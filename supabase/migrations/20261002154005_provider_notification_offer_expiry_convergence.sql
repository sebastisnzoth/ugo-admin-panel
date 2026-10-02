-- UGO P0 · realtime notification expiry convergence.
-- Prevent a stale servicios.matching_expires_at from overwriting a fresh offer expiry.
-- This was causing nueva_oferta push deliveries to be born already expired.

create or replace function private.sync_offer_matching_deadline()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_deadline timestamptz;
begin
  if new.estado::text <> 'pendiente' then
    return new;
  end if;

  select matching_expires_at
    into v_deadline
    from public.servicios
   where id = new.servicio_id;

  if v_deadline is not null and v_deadline > now() then
    new.expira_at := v_deadline;
  elsif new.expira_at is null or new.expira_at <= now() then
    new.expira_at := now() + interval '5 minutes';
  end if;

  return new;
end;
$function$;

revoke all on function private.sync_offer_matching_deadline() from public, anon, authenticated;

notify pgrst,'reload schema';
