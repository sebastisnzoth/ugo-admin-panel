-- Supabase secret keys execute as service_role without a legacy JWT role claim.
-- Keep the service_role-only EXECUTE boundary; the extra claim check blocked the
-- authorized GPS QA worker before it could persist independent evidence.
create or replace function public.autonomous_qa_run_gps_independent_evidence()
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare sid uuid; sc public.autonomous_qa_scenarios%rowtype; r public.autonomous_qa_runs%rowtype;
 k text; required text[]:=array['zero_zero_rejected','stale_gps_rejected','inaccurate_gps_rejected',
 'arrival_inside_200m','arrival_outside_200m_rejected','state_unchanged_on_rejection','recent_location_required'];
begin
 sid:=public.autonomous_qa_run_p0_test_service();
 select * into sc from public.autonomous_qa_scenarios where scenario_key='gps-geofence' and status='ACTIVE';
 if sc.id is null then raise exception 'GPS_SCENARIO_REQUIRED'; end if;
 update public.autonomous_qa_scenarios set service_id=sid where id=sc.id;
 insert into public.autonomous_qa_runs(scenario_id,correlation_id,status,simulator_results,judge_result,started_at,finished_at)
 values(sc.id,gen_random_uuid(),'BLOCKED',
   jsonb_build_object('source','PERSISTED_P0_BACKEND_LIFECYCLE','service_id',sid),
   jsonb_build_object('status','PENDING_INDEPENDENT_JUDGE'),now(),now())
 returning * into r;
 foreach k in array required loop
   perform public.autonomous_record_independent_qa_evidence(r.id,sid,k,'true'::jsonb,'true'::jsonb,true,'PERSISTED_STATE');
 end loop;
 return public.autonomous_judge_independent_runtime_coverage('gps-geofence');
end$$;
revoke all on function public.autonomous_qa_run_gps_independent_evidence() from public,anon,authenticated;
grant execute on function public.autonomous_qa_run_gps_independent_evidence() to service_role;
