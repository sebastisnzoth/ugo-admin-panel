-- Route release-gate validation through the GREEN deterministic judge.
create or replace function public.autonomous_validate_release_gate_determinism(
  p_gate_key text default 'CUSTOMER_1',
  p_source_sha text default null,
  p_correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  agent public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  actual_snapshot jsonb;
  actual_blockers jsonb;
  actual_status text;
  negative_snapshot jsonb;
  negative_blockers jsonb;
  negative_status text;
  positive_snapshot jsonb;
  positive_blockers jsonb;
  positive_status text;
  result_json jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
     and current_user not in ('postgres','supabase_admin') then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;
  select * into agent from public.autonomous_agents
  where agent_key='deterministic-judge' and department_id=9
    and status in ('READY','IDLE','ACTIVE') and authority_class='GREEN';
  if agent.id is null then raise exception 'AUTHORIZED_DETERMINISTIC_JUDGE_NOT_FOUND'; end if;

  actual_snapshot:=private.current_release_gate_snapshot(p_gate_key);
  actual_blockers:=private.release_gate_blockers_from_snapshot(actual_snapshot);
  actual_status:=case when jsonb_array_length(actual_blockers)=0 then 'READY' else 'BLOCKED' end;

  negative_snapshot:=actual_snapshot||jsonb_build_object(
    'qa_coverage_complete',false,
    'real_customer_journey_verified',true,
    'customer_acceptance_approved',true
  );
  negative_blockers:=private.release_gate_blockers_from_snapshot(negative_snapshot);
  negative_status:=case when jsonb_array_length(negative_blockers)=0 then 'READY' else 'BLOCKED' end;

  positive_snapshot:=actual_snapshot||jsonb_build_object(
    'no_open_critical_findings',true,
    'qa_coverage_complete',true,
    'qa_runs_passing',true,
    'no_stale_jobs',true,
    'meta_qa_validated',true,
    'model_router_ready',true,
    'kill_switches_clear',true,
    'real_customer_journey_verified',true,
    'customer_acceptance_approved',true
  );
  positive_blockers:=private.release_gate_blockers_from_snapshot(positive_snapshot);
  positive_status:=case when jsonb_array_length(positive_blockers)=0 then 'READY' else 'BLOCKED' end;

  if negative_status<>'BLOCKED' or not (negative_blockers ? 'QA_COVERAGE_INCOMPLETE') then
    raise exception 'RELEASE_GATE_NEGATIVE_SCENARIO_FAILED';
  end if;
  if positive_status<>'READY' or jsonb_array_length(positive_blockers)<>0 then
    raise exception 'RELEASE_GATE_POSITIVE_SCENARIO_FAILED';
  end if;

  insert into public.autonomous_release_gate(gate_key,status,blockers,evaluated_at,meta_qa_validated)
  values(
    p_gate_key,actual_status,actual_blockers,now(),
    coalesce((actual_snapshot->>'meta_qa_validated')::boolean,false)
  )
  on conflict(gate_key) do update set
    status=excluded.status,
    blockers=excluded.blockers,
    evaluated_at=excluded.evaluated_at,
    meta_qa_validated=excluded.meta_qa_validated;

  result_json:=jsonb_build_object(
    'source_sha',p_source_sha,
    'gate_key',p_gate_key,
    'actual',jsonb_build_object('status',actual_status,'blockers',actual_blockers,'snapshot',actual_snapshot),
    'negative',jsonb_build_object('status',negative_status,'blockers',negative_blockers,'snapshot',negative_snapshot),
    'positive',jsonb_build_object('status',positive_status,'blockers',positive_blockers,'snapshot',positive_snapshot),
    'production_touched',false,
    'validation_only',true
  );

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at
  )
  values(
    9,agent.id,'Validate deterministic blocking and eligible release-gate scenarios',
    'QA_RELEASE_GATE_DETERMINISM','RELEASE_GATE',p_gate_key,
    'GREEN','SUCCEEDED','qa-release-determinism:'||p_correlation_id::text,p_correlation_id,
    jsonb_build_array(
      jsonb_build_object('source','PERSISTED_RELEASE_GATE_STATE','gate_key',p_gate_key),
      jsonb_build_object('source_sha',p_source_sha)
    ),
    'TRUSTED',
    jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true),
    'qa.release_gate_determinism',result_json,
    'AUTHORIZED_VALIDATION_ONLY',result_json,
    jsonb_build_object(
      'passed',true,
      'actual_status',actual_status,
      'actual_blockers',actual_blockers,
      'negative_status',negative_status,
      'negative_blockers',negative_blockers,
      'positive_status',positive_status,
      'positive_blockers',positive_blockers,
      'source_sha',p_source_sha,
      'production_touched',false
    ),
    now(),now()
  ) returning * into job;

  insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(
    job.id,'RELEASE_GATE_DETERMINISM',
    'autonomous_release_gate/'||p_gate_key,
    encode(extensions.digest(result_json::text,'sha256'),'hex'),
    jsonb_build_object('source_sha',p_source_sha,'actual_status',actual_status,'negative_status',negative_status,'positive_status',positive_status),
    p_correlation_id
  );

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,
    policy_version,evidence_refs,authorization_result,correlation_id
  )
  values(
    job.id,9,agent.id,'RELEASE_GATE_DETERMINISTIC',
    'Actual persisted blockers reproduced; negative BLOCKED and all-satisfied positive READY',
    'GREEN',job.policy_version,
    jsonb_build_array('autonomous_release_gate/'||p_gate_key,p_source_sha),
    'AUTHORIZED_VALIDATION_ONLY',p_correlation_id
  );

  return jsonb_build_object(
    'passed',true,
    'job_id',job.id,
    'correlation_id',p_correlation_id,
    'verifier_agent',agent.agent_key,
    'source_sha',p_source_sha,
    'actual_status',actual_status,
    'actual_blockers',actual_blockers,
    'negative_status',negative_status,
    'negative_blockers',negative_blockers,
    'positive_status',positive_status,
    'positive_blockers',positive_blockers
  );
end$$;

revoke all on function public.autonomous_validate_release_gate_determinism(text,text,uuid) from public,anon,authenticated;
grant execute on function public.autonomous_validate_release_gate_determinism(text,text,uuid) to service_role;
