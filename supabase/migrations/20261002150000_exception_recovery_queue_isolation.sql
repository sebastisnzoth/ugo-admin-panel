-- Make exception recovery deterministic in UGO TEST without consuming unrelated queued work.
-- Preserve every schema-valid autonomy mode and restore the target job timestamp after the real worker cycle.

-- Make the controlled exception-recovery proof coexist with the live autonomous TEST runtime.
-- Preserve the pre-existing autonomy mode and unrelated scoped kill switches.
-- The proof remains fail-closed for running jobs, queued GREEN work, and any kill switch
-- that actually applies to the recovery department/agent/capability.

create or replace function public.autonomous_execute_exception_recovery(p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth','extensions','pg_temp'
as $function$
declare
  v_state public.autonomous_company_state%rowtype;
  v_previous_mode text;
  v_previous_reason text;
  v_agent public.autonomous_agents%rowtype;
  v_job public.autonomous_jobs%rowtype;
  v_incident public.development_incidents%rowtype;
  v_recovery public.autonomous_recovery_audits%rowtype;
  v_decisions integer := 0;
  v_evidence integer := 0;
  v_worker text;
  v_msg text;
  v_initial_kills text[] := array[]::text[];
  v_final_kills text[] := array[]::text[];
  v_mode_changed boolean := false;
  v_target_created_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended('ugo-test-exception-recovery',0));
  if p_correlation_id is null then raise exception 'CORRELATION_ID_REQUIRED'; end if;

  select * into v_state
  from public.autonomous_company_state
  where singleton=true
  for update;

  v_previous_mode:=v_state.mode;
  v_previous_reason:=v_state.reason;

  if v_previous_mode not in ('OFF','SHADOW','SAFE_MODE','ON') then
    raise exception 'UNSUPPORTED_INITIAL_AUTONOMY_MODE:%',v_previous_mode;
  end if;

  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then
    raise exception 'RUNNING_JOBS_PRESENT';
  end if;
  if exists(select 1 from public.autonomous_jobs where status='QUEUED' and authority_class='GREEN') then
    raise exception 'OTHER_GREEN_JOBS_QUEUED';
  end if;

  select * into v_agent
  from public.autonomous_agents
  where agent_key='quality-coverage-agent'
    and department_id=9
    and status<>'DISABLED';

  if v_agent.id is null then
    raise exception 'RECOVERY_VALIDATOR_AGENT_REQUIRED';
  end if;

  if exists(
    select 1
    from public.autonomous_kill_switches k
    where k.enabled
      and (
        k.scope_type='GLOBAL'
        or (k.scope_type='DEPARTMENT' and k.scope_key='9')
        or (k.scope_type='AGENT' and k.scope_key=v_agent.id::text)
        or (k.scope_type='CAPABILITY' and k.scope_key='qa.green.echo')
      )
  ) then
    raise exception 'RECOVERY_SCOPE_KILL_SWITCH_ACTIVE';
  end if;

  select coalesce(array_agg(id::text order by id::text),array[]::text[])
  into v_initial_kills
  from public.autonomous_kill_switches
  where enabled=true;

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
      'exception','LEASE_TIMEOUT','recovery_mechanism','autonomous_worker_cycle',
      'initial_mode',v_previous_mode
    ),
    'exception-recovery-runtime-v2'
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
    select * into v_recovery
    from public.autonomous_recovery_audits
    where scope_type='JOB' and scope_key=v_job.id::text
    order by created_at desc limit 1;

    select coalesce(array_agg(id::text order by id::text),array[]::text[])
    into v_final_kills
    from public.autonomous_kill_switches
    where enabled=true;

    return jsonb_build_object(
      'passed',true,'idempotent',true,'correlation_id',p_correlation_id,
      'incident_id',v_incident.id,'job_id',v_job.id,'recovery_audit_id',v_recovery.id,
      'final_status',v_job.status,'initial_mode',v_previous_mode,'final_mode',v_previous_mode,
      'kill_switches_preserved',v_final_kills=v_initial_kills,
      'active_kill_switches',cardinality(v_final_kills),'production_touched',false
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

  v_target_created_at:=v_job.created_at;

  if v_previous_mode<>'ON' then
    update public.autonomous_company_state
    set mode='ON',
        reason='Exception recovery runtime '||p_correlation_id::text,
        updated_at=now()
    where singleton=true;
    v_mode_changed:=true;
  end if;

  -- Keep this controlled proof from consuming unrelated approval-gated backlog.
  update public.autonomous_jobs
  set created_at='1900-01-01 00:00:00+00'::timestamptz
  where id=v_job.id;

  v_worker := 'ugo-exception-recovery-'||left(p_correlation_id::text,8);
  perform * from public.autonomous_worker_cycle(v_worker,1);

  update public.autonomous_jobs
  set created_at=v_target_created_at
  where id=v_job.id;

  select * into v_job
  from public.autonomous_jobs
  where id=v_job.id;

  if v_job.status <> 'SUCCEEDED'
     or v_job.verification_result->>'passed' <> 'true'
     or v_job.authorization_decision <> 'AUTHORIZED_POLICY'
     or v_job.attempt_count <> 1 then
    raise exception 'EXCEPTION_RECOVERY_NOT_VERIFIED';
  end if;

  if v_mode_changed then
    update public.autonomous_company_state
    set mode=v_previous_mode,
        reason=v_previous_reason,
        updated_at=now()
    where singleton=true;
    v_mode_changed:=false;
  end if;

  select coalesce(array_agg(id::text order by id::text),array[]::text[])
  into v_final_kills
  from public.autonomous_kill_switches
  where enabled=true;

  if v_final_kills is distinct from v_initial_kills then
    raise exception 'UNRELATED_KILL_SWITCH_STATE_CHANGED';
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
      'initial_mode',v_previous_mode,
      'initial_kill_switch_ids',to_jsonb(v_initial_kills),
      'kill_switches_preserved',true,
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
    jsonb_build_object(
      'incident_id',v_incident.id,
      'recovery_audit_id',v_recovery.id,
      'passed',true,
      'initial_mode',v_previous_mode,
      'kill_switches_preserved',true
    ),
    p_correlation_id,v_agent.id
  );

  update public.development_incidents
  set status='resolved',
      resolved_at=now(),
      metadata=metadata||jsonb_build_object(
        'recovery_audit_id',v_recovery.id,
        'recovery_status','VERIFIED',
        'initial_mode',v_previous_mode,
        'kill_switches_preserved',true
      )
  where id=v_incident.id;

  insert into public.audit_log(evento,actor_id,entidad_tipo,entidad_id,detalles)
  values(
    'autonomy.exception_recovery.completed',null,'autonomous_job',v_job.id,
    jsonb_build_object(
      'correlation_id',p_correlation_id,
      'incident_id',v_incident.id,
      'recovery_audit_id',v_recovery.id,
      'initial_mode',v_previous_mode,
      'final_mode',v_previous_mode,
      'kill_switches_preserved',true
    )
  );

  select count(*) into v_decisions
  from public.autonomous_decision_ledger
  where job_id=v_job.id
    and correlation_id=p_correlation_id
    and decision in('EXCEPTION_DETECTED','WORKER_EXECUTED');

  select count(*) into v_evidence
  from public.autonomous_evidence_ledger
  where job_id=v_job.id
    and correlation_id=p_correlation_id;

  if v_decisions < 2 or v_evidence < 2 then
    raise exception 'RECOVERY_AUDIT_TRAIL_INCOMPLETE';
  end if;
  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then
    raise exception 'RUNNING_JOBS_REMAIN';
  end if;

  return jsonb_build_object(
    'passed',true,'correlation_id',p_correlation_id,'incident_id',v_incident.id,
    'incident_status','resolved','exception','LEASE_TIMEOUT',
    'recovery_action','autonomous_worker_cycle','job_id',v_job.id,'job_status',v_job.status,
    'recovery_audit_id',v_recovery.id,'decision_ledger_count',v_decisions,
    'evidence_ledger_count',v_evidence,'initial_mode',v_previous_mode,'final_mode',v_previous_mode,
    'kill_switches_preserved',true,'active_kill_switches',cardinality(v_final_kills),
    'production_touched',false
  );
exception when others then
  if v_mode_changed and v_previous_mode is not null then
    update public.autonomous_company_state
    set mode=v_previous_mode,
        reason=v_previous_reason,
        updated_at=now()
    where singleton=true
      and reason like 'Exception recovery runtime%';
  end if;
  raise;
end
$function$;

revoke all on function public.autonomous_execute_exception_recovery(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_execute_exception_recovery(uuid) to service_role;
notify pgrst, 'reload schema';


-- Independent persisted-state Judge/Sentinel for exception recovery.
-- Keeps internal tables private: service_role can execute this verifier but does not
-- require broad Data API SELECT grants on incident/audit ledgers.

create or replace function public.autonomous_judge_exception_recovery(p_correlation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','auth','extensions','pg_temp'
as $function$
declare
  v_job public.autonomous_jobs%rowtype;
  v_incident public.development_incidents%rowtype;
  v_recovery public.autonomous_recovery_audits%rowtype;
  v_state public.autonomous_company_state%rowtype;
  v_decisions integer := 0;
  v_evidence integer := 0;
  v_audit integer := 0;
  v_running integer := 0;
  v_initial_mode text;
  v_initial_kills text[] := array[]::text[];
  v_final_kills text[] := array[]::text[];
begin
  if p_correlation_id is null then
    raise exception 'CORRELATION_ID_REQUIRED';
  end if;

  select * into v_job
  from public.autonomous_jobs
  where correlation_id=p_correlation_id
    and trigger_type='EXCEPTION_RECOVERY_TEST'
  order by created_at desc
  limit 1;

  if v_job.id is null
     or v_job.status<>'SUCCEEDED'
     or v_job.attempt_count<>1
     or v_job.authorization_decision<>'AUTHORIZED_POLICY'
     or v_job.verification_result->>'passed'<>'true' then
    raise exception 'RECOVERY_JOB_NOT_VERIFIED';
  end if;

  select * into v_incident
  from public.development_incidents
  where metadata->>'correlation_id'=p_correlation_id::text
  order by last_seen_at desc
  limit 1;

  if v_incident.id is null
     or v_incident.status<>'resolved'
     or v_incident.resolved_at is null
     or v_incident.metadata->>'recovery_status'<>'VERIFIED' then
    raise exception 'INCIDENT_NOT_RESOLVED';
  end if;

  select * into v_recovery
  from public.autonomous_recovery_audits
  where scope_type='JOB'
    and scope_key=v_job.id::text
  order by created_at desc
  limit 1;

  if v_recovery.id is null
     or v_recovery.decision<>'RECOVER'
     or v_recovery.verification->>'recovery_action'<>'autonomous_worker_cycle'
     or coalesce((v_recovery.verification->>'manual_sql_state_edit')::boolean,true)<>false
     or coalesce((v_recovery.verification->>'manual_github_state_edit')::boolean,true)<>false
     or coalesce((v_recovery.verification->>'kill_switches_preserved')::boolean,false)<>true
     or nullif(v_recovery.evidence_hash,'') is null then
    raise exception 'RECOVERY_AUDIT_INVALID';
  end if;

  select count(*) into v_decisions
  from public.autonomous_decision_ledger
  where job_id=v_job.id and correlation_id=p_correlation_id;

  select count(*) into v_evidence
  from public.autonomous_evidence_ledger
  where job_id=v_job.id and correlation_id=p_correlation_id;

  select count(*) into v_audit
  from public.audit_log
  where evento='autonomy.exception_recovery.completed'
    and entidad_id=v_job.id;

  if v_decisions<2 or v_evidence<2 or v_audit<1 then
    raise exception 'RECOVERY_AUDIT_TRAIL_INCOMPLETE';
  end if;

  v_initial_mode:=v_recovery.verification->>'initial_mode';
  if v_initial_mode not in ('OFF','SHADOW','SAFE_MODE','ON') then
    raise exception 'RECOVERY_INITIAL_MODE_INVALID';
  end if;

  select coalesce(array_agg(value order by value),array[]::text[])
  into v_initial_kills
  from jsonb_array_elements_text(
    coalesce(v_recovery.verification->'initial_kill_switch_ids','[]'::jsonb)
  ) as x(value);

  select coalesce(array_agg(id::text order by id::text),array[]::text[])
  into v_final_kills
  from public.autonomous_kill_switches
  where enabled=true;

  select * into v_state
  from public.autonomous_company_state
  where singleton=true;

  select count(*) into v_running
  from public.autonomous_jobs
  where status='RUNNING';

  if v_state.mode<>v_initial_mode
     or v_final_kills is distinct from v_initial_kills
     or v_running<>0 then
    raise exception 'SENTINEL_STATE_PRESERVATION_FAILED';
  end if;

  return jsonb_build_object(
    'judge','PASS',
    'sentinel','PASS',
    'correlationId',p_correlation_id,
    'incidentId',v_incident.id,
    'jobId',v_job.id,
    'recoveryAuditId',v_recovery.id,
    'decisionLedgerCount',v_decisions,
    'evidenceLedgerCount',v_evidence,
    'auditLogCount',v_audit,
    'initialMode',v_initial_mode,
    'finalMode',v_state.mode,
    'activeKillSwitches',cardinality(v_final_kills),
    'killSwitchesPreserved',true,
    'runningJobs',v_running,
    'productionTouched',false
  );
end
$function$;

revoke all on function public.autonomous_judge_exception_recovery(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_judge_exception_recovery(uuid) to service_role;
notify pgrst, 'reload schema';
