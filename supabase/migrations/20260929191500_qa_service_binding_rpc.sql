-- Narrow service-role bridge for binding an active QA scenario to one persisted UGO TEST service.
create or replace function public.autonomous_bind_qa_scenario_service(
  p_scenario_id uuid,
  p_service_id uuid
)
returns public.autonomous_qa_scenarios
language plpgsql
security definer
set search_path=public,private,auth,pg_temp
as $$
declare
  s public.autonomous_qa_scenarios%rowtype;
  svc public.servicios%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;
  select * into svc from public.servicios where id=p_service_id and ambiente='demo';
  if svc.id is null then raise exception 'UGO_TEST_SERVICE_REQUIRED'; end if;
  update public.autonomous_qa_scenarios
     set service_id=p_service_id,updated_at=now()
   where id=p_scenario_id and status='ACTIVE'
   returning * into s;
  if s.id is null then raise exception 'ACTIVE_SCENARIO_REQUIRED'; end if;
  return s;
end$$;
revoke all on function public.autonomous_bind_qa_scenario_service(uuid,uuid) from public,anon,authenticated;
grant execute on function public.autonomous_bind_qa_scenario_service(uuid,uuid) to service_role;
