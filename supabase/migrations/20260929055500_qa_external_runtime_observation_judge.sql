-- Runtime probes (authenticated JWT and Realtime clients) persist concrete observations through one fail-closed judge.
create or replace function public.autonomous_record_external_qa_probe(p_scenario_id uuid,p_service_id uuid,p_observations jsonb)
returns public.autonomous_qa_runs language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare s public.autonomous_qa_scenarios%rowtype;r public.autonomous_qa_runs%rowtype;req jsonb;missing text[]:='{}';ok boolean;
begin
 if current_user not in('postgres','service_role','supabase_admin') and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';end if;
 select * into s from public.autonomous_qa_scenarios where id=p_scenario_id and status='ACTIVE';if s.id is null then raise exception 'ACTIVE_SCENARIO_REQUIRED';end if;
 if p_service_id is null or not exists(select 1 from public.servicios where id=p_service_id and ambiente='demo') then raise exception 'BOUND_TEST_SERVICE_REQUIRED';end if;
 req:=coalesce(s.deterministic_judge->'required_assertions','[]'::jsonb);
 select coalesce(array_agg(x),'{}') into missing from jsonb_array_elements_text(req)x where coalesce((p_observations->>x)::boolean,false)=false;
 ok:=cardinality(missing)=0;
 insert into public.autonomous_qa_runs(scenario_id,status,simulator_results,chaos_result,judge_result,diagnosis,remediation_request,permanent_regression,started_at,finished_at)
 values(s.id,case when ok then'PASSED'else'FAILED'end,coalesce(p_observations,'{}'),'{}',jsonb_build_object('passed',ok,'missing_assertions',to_jsonb(missing),'source','EXTERNAL_RUNTIME_OBSERVATIONS'),'Runtime observations judged against required assertions',case when ok then null else'Remediate failed runtime assertions and rerun'end,false,now(),now()) returning * into r;
 update public.autonomous_qa_scenarios set service_id=p_service_id,updated_at=now() where id=s.id;
 update public.autonomous_quality_coverage set scenario_id=s.id,last_run_id=r.id,status=case when ok then'COVERED'else'FAILING'end,updated_at=now() where coverage_key=s.coverage_key;
 return r;
end$$;
revoke all on function public.autonomous_record_external_qa_probe(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.autonomous_record_external_qa_probe(uuid,uuid,jsonb) to service_role;
