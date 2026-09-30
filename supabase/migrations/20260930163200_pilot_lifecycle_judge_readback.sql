-- UGO Pilot · least-privilege lifecycle readback for TEST judges.
create or replace function public.service_role_pilot_lifecycle_states(p_service_id uuid)
returns text[]
language sql
security definer
set search_path=public,pg_temp
as $$
  select coalesce(array_agg(estado_nuevo::text order by created_at),'{}'::text[])
  from public.servicio_estado_eventos
  where servicio_id=p_service_id
    and exists(
      select 1 from public.servicios s
      where s.id=p_service_id and s.ambiente in ('test','demo')
    )
$$;
revoke all on function public.service_role_pilot_lifecycle_states(uuid) from public,anon,authenticated;
grant execute on function public.service_role_pilot_lifecycle_states(uuid) to service_role;
