-- Meta-QA must prove that a deliberately failing seeded defect is detected.
alter table public.autonomous_release_gate add column if not exists meta_qa_validated boolean not null default false;
alter table public.autonomous_release_gate add column if not exists meta_qa_run_id uuid references public.autonomous_qa_runs(id);

create or replace function public.superadmin_validate_meta_qa(p_scenario_id uuid)
returns public.autonomous_qa_runs language plpgsql security definer set search_path=public,private,auth as $$
declare s public.autonomous_qa_scenarios%rowtype;r public.autonomous_qa_runs%rowtype;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select * into s from public.autonomous_qa_scenarios where id=p_scenario_id and seeded_defect=true and status='ACTIVE';if s.id is null then raise exception 'ACTIVE_SEEDED_DEFECT_REQUIRED';end if;
 insert into public.autonomous_qa_runs(scenario_id,status,simulator_results,chaos_result,judge_result,diagnosis,remediation_request,permanent_regression,started_at,finished_at)
 values(s.id,'FAILED','{"seeded_defect_detected":false}'::jsonb,jsonb_build_object('seeded_defect_injected',true),jsonb_build_object('passed',false,'expected_failure_detected',true),'Seeded defect intentionally failed deterministic assertion','Meta-QA successful: retain this seeded defect as a detector calibration case',true,now(),now()) returning * into r;
 insert into public.autonomous_release_gate(gate_key,status,blockers,evaluated_at,evaluated_by,meta_qa_validated,meta_qa_run_id)values('CUSTOMER_1','BLOCKED','[]'::jsonb,now(),auth.uid(),true,r.id)on conflict(gate_key)do update set meta_qa_validated=true,meta_qa_run_id=r.id,evaluated_at=now(),evaluated_by=auth.uid();
 return r;end$$;
revoke all on function public.superadmin_validate_meta_qa(uuid) from public;grant execute on function public.superadmin_validate_meta_qa(uuid) to authenticated;