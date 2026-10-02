-- Align scheduled worker proof with every autonomy mode allowed by autonomous_company_state.
-- UGO TEST proof may observe SHADOW during concurrent readiness evaluation and must preserve it.

-- Preserve the pre-existing company mode when running the scheduled worker proof.
-- This prevents CI probes from forcing an already-ready autonomous company back to OFF.

create or replace function public.autonomous_run_scheduled_worker_proof(
  p_source_sha text,
  p_run_id text
) returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth','extensions','pg_temp'
as $function$
declare
  v_state public.autonomous_company_state%rowtype;
  v_previous_mode text;
  v_previous_reason text;
  v_cap public.autonomous_capability_registry%rowtype;
  v_agent public.autonomous_agents%rowtype;
  v_job public.autonomous_jobs%rowtype;
  v_reason text;
  v_worker text;
  v_decisions integer;
  v_evidence integer;
  v_other_green integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-test-scheduled-worker-proof',0));

  if p_source_sha is null or p_source_sha !~ '^[0-9a-f]{40}$' then
    raise exception 'VALID_GITHUB_SHA_REQUIRED';
  end if;
  if nullif(btrim(p_run_id),'') is null then
    raise exception 'RUN_ID_REQUIRED';
  end if;

  select * into v_state from public.autonomous_company_state where singleton=true for update;
  v_previous_mode:=v_state.mode;
  v_previous_reason:=v_state.reason;
  if v_previous_mode not in('OFF','SHADOW','SAFE_MODE','ON') then
    raise exception 'UNSUPPORTED_INITIAL_AUTONOMY_MODE:%',v_previous_mode;
  end if;

  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then
    raise exception 'RUNNING_JOBS_PRESENT';
  end if;
  if exists(select 1 from public.autonomous_kill_switches where enabled=true) then
    raise exception 'ACTIVE_KILL_SWITCH_PRESENT';
  end if;

  select count(*) into v_other_green
  from public.autonomous_jobs
  where status='QUEUED' and authority_class='GREEN';
  if v_other_green<>0 then
    raise exception 'OTHER_GREEN_JOBS_QUEUED';
  end if;

  select * into v_cap
  from public.autonomous_capability_registry
  where capability_key='qa.green.echo' and enabled=true and authority_class='GREEN';
  if v_cap.capability_key is null then
    raise exception 'GREEN_CAPABILITY_REQUIRED';
  end if;

  select * into v_agent
  from public.autonomous_agents
  where agent_key='quality-coverage-agent'
    and department_id=v_cap.department_id
    and authority_class='GREEN'
    and status<>'DISABLED';
  if v_agent.id is null then
    raise exception 'GREEN_AGENT_REQUIRED';
  end if;

  select * into v_job
  from public.autonomous_jobs
  where idempotency_key='scheduled-worker-on-proof:'||p_source_sha
  order by created_at desc
  limit 1;

  if v_job.id is null then
    insert into public.autonomous_jobs(
      department_id,agent_id,objective,trigger_type,target_type,target_id,
      authority_class,status,idempotency_key,input_evidence,data_quality_status,
      data_quality_assessment,capability,estimated_cost
    ) values(
      v_cap.department_id,v_agent.id,
      'Browser-independent scheduled worker ON-mode proof for '||p_source_sha,
      'SCHEDULED_TEST','UGO_TEST_WORKER',p_source_sha,
      'GREEN','QUEUED','scheduled-worker-on-proof:'||p_source_sha,
      jsonb_build_array(jsonb_build_object(
        'message','UGO scheduled worker ON proof '||p_source_sha,
        'source_sha',p_source_sha,
        'run_id',p_run_id
      )),
      'TRUSTED',
      jsonb_build_object(
        'freshness',true,'provenance',true,'completeness',true,'consistency',true,
        'source','UGO_TEST_SCHEDULED_WORKER_PROOF','source_sha',p_source_sha
      ),
      'qa.green.echo',0
    )
    returning * into v_job;
  elsif v_job.status<>'SUCCEEDED' and v_job.status<>'QUEUED' then
    raise exception 'PROOF_JOB_INVALID_STATE:%',v_job.status;
  end if;

  v_reason:='Scheduled worker ON proof '||p_source_sha;
  v_worker:='github-actions-scheduled-worker-'||p_run_id;

  if v_job.status<>'SUCCEEDED' then
    if v_previous_mode<>'ON' then
      update public.autonomous_company_state
      set mode='ON',reason=v_reason,updated_at=now()
      where singleton=true;
    end if;

    perform * from public.autonomous_worker_cycle(v_worker,1);

    select * into v_job from public.autonomous_jobs where id=v_job.id;
    if v_job.status<>'SUCCEEDED'
       or v_job.authority_class<>'GREEN'
       or v_job.capability<>'qa.green.echo'
       or v_job.authorization_decision<>'AUTHORIZED_POLICY'
       or v_job.verification_result->>'passed'<>'true' then
      raise exception 'TARGET_GREEN_JOB_NOT_COMPLETED';
    end if;
  end if;

  select count(*) into v_decisions
  from public.autonomous_decision_ledger
  where job_id=v_job.id
    and decision='WORKER_EXECUTED'
    and authorization_result='AUTHORIZED'
    and correlation_id=v_job.correlation_id;

  select count(*) into v_evidence
  from public.autonomous_evidence_ledger
  where job_id=v_job.id
    and evidence_type='CAPABILITY_VERIFICATION'
    and correlation_id=v_job.correlation_id
    and nullif(evidence_hash,'') is not null;

  if v_decisions<1 or v_evidence<1 then
    raise exception 'CORRELATED_LEDGER_EVIDENCE_REQUIRED';
  end if;

  update public.autonomous_company_state
  set mode=v_previous_mode,
      reason=v_previous_reason,
      updated_at=now()
  where singleton=true
    and (
      v_previous_mode='ON'
      or mode='ON'
    );

  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then
    raise exception 'RUNNING_JOBS_REMAIN';
  end if;

  return jsonb_build_object(
    'scheduledWorkerOnProof',true,
    'sourceSha',p_source_sha,
    'runId',p_run_id,
    'jobId',v_job.id,
    'status',v_job.status,
    'correlationId',v_job.correlation_id,
    'decisionLedger',v_decisions,
    'evidenceLedger',v_evidence,
    'verificationPassed',true,
    'initialMode',v_previous_mode,
    'finalMode',v_previous_mode
  );
exception when others then
  if v_previous_mode is not null then
    update public.autonomous_company_state
    set mode=v_previous_mode,
        reason=v_previous_reason,
        updated_at=now()
    where singleton=true
      and (mode='ON' or reason=coalesce(v_reason,''));
  end if;
  raise;
end
$function$;

revoke all on function public.autonomous_run_scheduled_worker_proof(text,text) from public,anon,authenticated;
grant execute on function public.autonomous_run_scheduled_worker_proof(text,text) to service_role;
