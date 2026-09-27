-- Customer #1 gate must include Meta-QA and model-router readiness, never infer green.
create or replace function public.superadmin_evaluate_release_gate(p_gate_key text default 'CUSTOMER_1')
returns public.autonomous_release_gate language plpgsql security definer set search_path=public,private,auth as $$
declare blockers jsonb:='[]'::jsonb;r public.autonomous_release_gate%rowtype;meta_ok boolean:=false;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select coalesce(meta_qa_validated,false) into meta_ok from public.autonomous_release_gate where gate_key=p_gate_key;
 if exists(select 1 from public.autonomous_audit_findings where status='OPEN' and severity='CRITICAL')then blockers:=blockers||'"OPEN_CRITICAL_FINDING"'::jsonb;end if;
 if exists(select 1 from public.autonomous_quality_coverage where status<>'COVERED')then blockers:=blockers||'"QA_COVERAGE_INCOMPLETE"'::jsonb;end if;
 if exists(select 1 from public.autonomous_qa_runs where status in('FAILED','BLOCKED') and not(coalesce((judge_result->>'expected_failure_detected')::boolean,false)))then blockers:=blockers||'"QA_RUN_FAILURE"'::jsonb;end if;
 if exists(select 1 from public.autonomous_jobs where status='RUNNING' and lease_expires_at<now())then blockers:=blockers||'"STALE_AUTONOMOUS_JOB"'::jsonb;end if;
 if not meta_ok then blockers:=blockers||'"META_QA_NOT_VALIDATED"'::jsonb;end if;
 if exists(select 1 from public.autonomous_model_routes where status not in('READY','DISABLED'))then blockers:=blockers||'"MODEL_ROUTER_NOT_READY"'::jsonb;end if;
 insert into public.autonomous_release_gate(gate_key,status,blockers,evaluated_at,evaluated_by,meta_qa_validated)values(p_gate_key,case when jsonb_array_length(blockers)=0 then'READY'else'BLOCKED'end,blockers,now(),auth.uid(),meta_ok)
 on conflict(gate_key)do update set status=excluded.status,blockers=excluded.blockers,evaluated_at=now(),evaluated_by=auth.uid(),meta_qa_validated=meta_ok returning * into r;return r;end$$;