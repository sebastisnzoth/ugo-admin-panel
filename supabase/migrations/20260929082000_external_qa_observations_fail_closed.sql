-- Client-reported booleans are diagnostic observations, never deterministic
-- proof. The actual authenticated probes still fail CI on assertion errors.
create or replace function public.autonomous_record_external_qa_probe(
  p_scenario_id uuid,p_service_id uuid,p_observations jsonb)
returns public.autonomous_qa_runs language plpgsql security definer
set search_path=public,auth,pg_temp as $$
declare scenario public.autonomous_qa_scenarios%rowtype;
        run public.autonomous_qa_runs%rowtype;
begin
  select * into scenario from public.autonomous_qa_scenarios
    where id=p_scenario_id and status='ACTIVE';
  if scenario.id is null then raise exception 'ACTIVE_SCENARIO_REQUIRED';end if;
  if p_service_id is null or not exists(select 1 from public.servicios
    where id=p_service_id and ambiente='demo') then
    raise exception 'BOUND_TEST_SERVICE_REQUIRED';
  end if;
  insert into public.autonomous_qa_runs(
    scenario_id,status,simulator_results,chaos_result,judge_result,
    diagnosis,remediation_request,permanent_regression,started_at,finished_at)
  values(scenario.id,'BLOCKED',coalesce(p_observations,'{}'::jsonb),'{}'::jsonb,
    jsonb_build_object('passed',false,'source','EXTERNAL_RUNTIME_OBSERVATIONS',
      'reason','CALLER_OBSERVATIONS_NOT_AUTHORITATIVE'),
    'Authenticated CI probe observed results; an independent persisted judge is still required',
    'Implement an independent verifier for this scenario',false,now(),now())
  returning * into run;
  update public.autonomous_qa_scenarios
    set service_id=p_service_id,updated_at=now() where id=scenario.id;
  update public.autonomous_quality_coverage
    set scenario_id=scenario.id,last_run_id=run.id,status='UNCOVERED',updated_at=now()
    where coverage_key=scenario.coverage_key;
  return run;
end $$;
revoke all on function public.autonomous_record_external_qa_probe(uuid,uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.autonomous_record_external_qa_probe(uuid,uuid,jsonb)
  to service_role;

-- Historical caller-supplied PASS runs must not remain the latest green status.
update public.autonomous_quality_coverage
set status='UNCOVERED',updated_at=now()
where coverage_key in('gps-geofence','roles','permissions-rls','realtime');
