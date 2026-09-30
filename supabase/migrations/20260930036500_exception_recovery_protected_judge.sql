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
  if v_initial_mode not in ('OFF','ON') then
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
