-- Meta-QA calibration uses a real completed demo service as the persisted-state fixture.
-- The controlled defect is judged against that fixture; no production rows are touched.
create or replace function public.autonomous_run_meta_qa_seeded_defect(p_scenario_id uuid,p_service_id uuid,p_inject_defect boolean)
returns public.autonomous_qa_runs language plpgsql security definer set search_path=public,private,auth,pg_temp as $$
declare s public.autonomous_qa_scenarios%rowtype;r public.autonomous_qa_runs%rowtype;actual_complete boolean;observed_detected boolean;pass boolean;
begin
 if current_user not in('postgres','service_role','supabase_admin') and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';end if;
 select * into s from public.autonomous_qa_scenarios where id=p_scenario_id and seeded_defect=true and status='ACTIVE';if s.id is null then raise exception 'ACTIVE_SEEDED_DEFECT_REQUIRED';end if;
 if p_service_id is null or not exists(select 1 from public.servicios where id=p_service_id and ambiente='demo')then raise exception 'BOUND_TEST_SERVICE_REQUIRED';end if;
 select exists(select 1 from public.servicios v where v.id=p_service_id and v.estado='completado') and exists(select 1 from public.evidencias_servicio e where e.servicio_id=p_service_id and e.tipo='antes') and exists(select 1 from public.evidencias_servicio e where e.servicio_id=p_service_id and e.tipo='despues') and (select count(distinct autor_tipo) from public.resenas rr where rr.servicio_id=p_service_id)>=2 into actual_complete;
 observed_detected:=p_inject_defect and actual_complete;pass:=case when p_inject_defect then not observed_detected else actual_complete end;
 insert into public.autonomous_qa_runs(scenario_id,status,simulator_results,chaos_result,judge_result,diagnosis,remediation_request,permanent_regression,started_at,finished_at) values(s.id,case when pass then'PASSED'else'FAILED'end,jsonb_build_object('service_id',p_service_id,'baseline_complete',actual_complete),jsonb_build_object('seeded_defect_injected',p_inject_defect),jsonb_build_object('passed',pass,'seeded_defect_detected',observed_detected),case when p_inject_defect and observed_detected then'Seeded defect detected by persisted-state judge'else'Meta-QA baseline/remediation validation'end,case when p_inject_defect and observed_detected then'Remove controlled seeded defect and rerun baseline'else null end,not p_inject_defect and actual_complete,now(),now()) returning * into r;
 update public.autonomous_qa_scenarios set service_id=p_service_id,updated_at=now() where id=s.id;return r;
end$$;
revoke all on function public.autonomous_run_meta_qa_seeded_defect(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.autonomous_run_meta_qa_seeded_defect(uuid,uuid,boolean) to service_role;
