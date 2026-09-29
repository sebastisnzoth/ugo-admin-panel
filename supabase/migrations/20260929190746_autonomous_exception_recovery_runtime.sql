-- UGO TEST only: autonomous normal-exception recovery runtime.
-- Applied in UGO Arena as migration 20260929190746.
create or replace function public.autonomous_execute_exception_recovery(p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth','extensions','pg_temp'
as $function$
declare
  v_state public.autonomous_company_state%rowtype;
  v_agent public.autonomous_agents%rowtype;
  v_job public.autonomous_jobs%rowtype;
  v_incident public.development_incidents%rowtype;
  v_recovery public.autonomous_recovery_audits%rowtype;
  v_decisions integer := 0;
  v_evidence integer := 0;
  v_worker text;
  v_msg text;
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-test-exception-recovery',0));
  if p_correlation_id is null then raise exception 'CORRELATION_ID_REQUIRED'; end if;

  select * into v_state from public.autonomous_company_state where singleton=true for update;
  if v_state.mode <> 'OFF' then raise exception 'SAFE_OFF_INITIAL_STATE_REQUIRED'; end if;
  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then raise exception 'RUNNING_JOBS_PRESENT'; end if;
  if exists(select 1 from public.autonomous_kill_switches where enabled=true) then raise exception 'ACTIVE_KILL_SWITCH_PRESENT'; end if;
  if exists(select 1 from public.autonomous_jobs where status='QUEUED' and authority_class='GREEN') then raise exception 'OTHER_GREEN_JOBS_QUEUED'; end if;

  select * into v_agent from public.autonomous_agents
  where agent_key='quality-coverage-agent' and department_id=9 and status<>'DISABLED';
  if v_agent.id is null then raise exception 'RECOVERY_VALIDATOR_AGENT_REQUIRED'; end if;

  v_msg := 'Recoverable TEST lease timeout '||p_correlation_id::text;

  insert into public.development_incidents(
    fingerprint,severity,source_role,event_type,status,route,action,service_id,
    reporter_id,checklist_code,message,stack,metadata,runtime_revision
  ) values (
    md5('exception-recovery|'||p_correlation_id::text),
    'P1','system','AUTONOMOUS_LEASE_TIMEOUT','open','/ugo-test/autonomy',
    'autonomous.worker.recover_lease',null,null,null,v_msg,null,
    jsonb_build_object(
      'environment','UGO TEST','correlation_id',p_correlation_id,
      'exception','LEASE_TIMEOUT','recovery_mechanism','autonomous_worker_cycle'
    ),
    'exception-recovery-runtime'
  )
  on conflict(fingerprint) do update set
    status='open',message=excluded.message,metadata=excluded.metadata,
    occurrences=public.development_incidents.occurrences+1,last_seen_at=now(),resolved_at=null
  returning * into v_incident;

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,authority_class,
    status,idempotency_key,correlation_id,input_evidence,data_quality_status,
    data_quality_assessment,capability,estimated_cost,lease_owner,lease_expires_at,
    attempt_count,max_attempts,started_at
  ) values (
    9,v_agent.id,'Recover normal expired worker lease without manual state edit',
    'EXCEPTION_RECOVERY_TEST','AUTONOMOUS_JOB',p_correlation_id::text,'GREEN',
    'RUNNING','exception-recovery:'||p_correlation_id::text,p_correlation_id,
    jsonb_build_array(jsonb_build_object('message',v_msg,'source','UGO_TEST_EXCEPTION_RECOVERY')),
    'TRUSTED',
    jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true,'source','UGO_TEST_EXCEPTION_RECOVERY'),
    'qa.green.echo',0,'expired-test-lease',now()-interval '5 minutes',0,3,now()-interval '5 minutes'
  )
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into v_job;

  if v_job.status='SUCCEEDED' then
    select * into v_recovery from public.autonomous_recovery_audits
    where scope_type='JOB' and scope_key=v_job.id::text order by created_at desc limit 1;
    return jsonb_build_object(
      'passed',true,'idempotent',true,'correlation_id',p_correlation_id,
      'incident_id',v_incident.id,'job_id',v_job.id,'recovery_audit_id',v_recovery.id,
      'final_status',v_job.status,'production_touched',false
    );
  end if;

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
    evidence_refs,authorization_result,correlation_id
  ) values (
    v_job.id,9,v_agent.id,'EXCEPTION_DETECTED',
    'Expired worker lease detected in controlled UGO TEST runtime',
    'GREEN',coalesce(v_job.policy_version,'AUTONOMOUS_CORP_V1'),
    jsonb_build_array('development_incidents/'||v_incident.id::text),
    'AUTHORIZED_POLICY',p_correlation_id
  );

  update public.autonomous_company_state
  set mode='ON',reason='Exception recovery runtime '||p_correlation_id::text,updated_at=now()
  where singleton=true;

  v_worker := 'ugo-exception-recovery-'||left(p_correlation_id::text,8);
  perform * from public.autonomous_worker_cycle(v_worker,1);

  select * into v_job from public.autonomous_jobs where id=v_job.id;
  if v_job.status <> 'SUCCEEDED'
     or v_job.verification_result->>'passed' <> 'true'
     or v_job.authorization_decision <> 'AUTHORIZED_POLICY'
     or v_job.attempt_count <> 1 then
    raise exception 'EXCEPTION_RECOVERY_NOT_VERIFIED';
  end if;

  insert into public.autonomous_recovery_audits(
    scope_type,scope_key,verification,re_audited_by,decision,reason,evidence_hash
  ) values (
    'JOB',v_job.id::text,
    jsonb_build_object(
      'correlation_id',p_correlation_id,'incident_id',v_incident.id,
      'initial_exception','LEASE_TIMEOUT','recovery_action','autonomous_worker_cycle',
      'job_status',v_job.status,'verification_passed',v_job.verification_result->>'passed',
      'manual_sql_state_edit',false,'manual_github_state_edit',false,
      'evidence_refs',jsonb_build_array(
        'development_incidents/'||v_incident.id::text,
        'autonomous_jobs/'||v_job.id::text,
        'autonomous_decision_ledger/job/'||v_job.id::text,
        'autonomous_evidence_ledger/job/'||v_job.id::text
      )
    ),
    v_agent.id,'RECOVER',
    'Normal expired lease recovered by authorized UGO worker mechanism',
    encode(extensions.digest((p_correlation_id::text||':'||v_job.id::text||':RECOVER')::text,'sha256'),'hex')
  ) returning * into v_recovery;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,evidence_hash,metadata,correlation_id,created_by
  ) values (
    v_job.id,'EXCEPTION_RECOVERY_VERIFICATION',
    'autonomous_recovery_audits/'||v_recovery.id::text,v_recovery.evidence_hash,
    jsonb_build_object('incident_id',v_incident.id,'recovery_audit_id',v_recovery.id,'passed',true),
    p_correlation_id,v_agent.id
  );

  update public.development_incidents
  set status='resolved',resolved_at=now(),
      metadata=metadata||jsonb_build_object('recovery_audit_id',v_recovery.id,'recovery_status','VERIFIED')
  where id=v_incident.id;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values(
    'autonomy.exception_recovery.completed',null,'autonomous_job',v_job.id,
    jsonb_build_object('correlation_id',p_correlation_id,'incident_id',v_incident.id,'recovery_audit_id',v_recovery.id)
  );

  update public.autonomous_company_state
  set mode='OFF',reason='Exception recovery complete; safe OFF restored '||p_correlation_id::text,updated_at=now()
  where singleton=true;

  select count(*) into v_decisions from public.autonomous_decision_ledger
  where job_id=v_job.id and correlation_id=p_correlation_id
    and decision in('EXCEPTION_DETECTED','WORKER_EXECUTED');
  select count(*) into v_evidence from public.autonomous_evidence_ledger
  where job_id=v_job.id and correlation_id=p_correlation_id;

  if v_decisions < 2 or v_evidence < 2 then raise exception 'RECOVERY_AUDIT_TRAIL_INCOMPLETE'; end if;
  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then raise exception 'RUNNING_JOBS_REMAIN'; end if;
  if exists(select 1 from public.autonomous_kill_switches where enabled=true) then raise exception 'ACTIVE_KILL_SWITCH_REMAINS'; end if;

  return jsonb_build_object(
    'passed',true,'correlation_id',p_correlation_id,'incident_id',v_incident.id,
    'incident_status','resolved','exception','LEASE_TIMEOUT',
    'recovery_action','autonomous_worker_cycle','job_id',v_job.id,'job_status',v_job.status,
    'recovery_audit_id',v_recovery.id,'decision_ledger_count',v_decisions,
    'evidence_ledger_count',v_evidence,'final_mode','OFF','production_touched',false
  );
exception when others then
  update public.autonomous_company_state
  set mode='OFF',reason='Exception recovery failed; safe OFF restored',updated_at=now()
  where singleton=true and mode='ON' and reason like 'Exception recovery runtime%';
  raise;
end
$function$;

revoke all on function public.autonomous_execute_exception_recovery(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_execute_exception_recovery(uuid) to service_role;
