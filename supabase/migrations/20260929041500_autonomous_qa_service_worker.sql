-- Service-role deterministic QA runner for browser-independent TEST worker.\ncreate or replace function public.autonomous_run_qa_service_scenario(p_scenario_id uuid,p_simulator_results jsonb,p_chaos_result jsonb default '{}'::jsonb)
returns public.autonomous_qa_runs language plpgsql security definer set search_path=public,private,auth as $$
declare s public.autonomous_qa_scenarios%rowtype;r public.autonomous_qa_runs%rowtype;passed boolean;missing text[]:='{}';expected jsonb;begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';end if;
 select * into s from public.autonomous_qa_scenarios where id=p_scenario_id and status='ACTIVE';if s.id is null then raise exception 'ACTIVE_SCENARIO_REQUIRED';end if;
 expected:=coalesce(s.deterministic_judge->'required_assertions','[]'::jsonb);
 select coalesce(array_agg(x),'{}') into missing from jsonb_array_elements_text(expected)x where coalesce((p_simulator_results->>x)::boolean,false)=false;
 passed:=cardinality(missing)=0 and not coalesce((p_chaos_result->>'unexpected_failure')::boolean,false);
 insert into public.autonomous_qa_runs(scenario_id,status,simulator_results,chaos_result,judge_result,diagnosis,remediation_request,permanent_regression,started_at,finished_at)
 values(s.id,case when passed then'PASSED'else'FAILED'end,coalesce(p_simulator_results,'{}'),coalesce(p_chaos_result,'{}'),jsonb_build_object('passed',passed,'missing_assertions',to_jsonb(missing),'seeded_defect',s.seeded_defect),case when passed then null else'Deterministic judge rejected scenario' end,case when passed then null else'Remediate failed assertions and rerun before release' end,passed and s.source_type='REGRESSION',now(),now()) returning * into r;
 update public.autonomous_quality_coverage set scenario_id=s.id,last_run_id=r.id,status=case when passed then'COVERED'else'FAILING'end,updated_at=now() where coverage_key=s.coverage_key;
 return r;end$$;
revoke all on function public.autonomous_run_qa_service_scenario(uuid,jsonb,jsonb) from public,anon,authenticated;grant execute on function public.autonomous_run_qa_service_scenario(uuid,jsonb,jsonb) to service_role;

