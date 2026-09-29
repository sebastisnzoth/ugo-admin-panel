-- Final D14 corporate audit gate. It never turns physical/human evidence green.
create or replace function public.autonomous_run_final_corporate_audit()
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  auditor public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  blockers jsonb:='[]'::jsonb;
  verification jsonb;
  corr uuid:=gen_random_uuid();
begin
  select * into auditor
  from public.autonomous_agents
  where agent_key='internal-auditor' and department_id=14 and status='IDLE';
  if auditor.id is null then raise exception 'D14_INTERNAL_AUDITOR_NOT_READY'; end if;

  if exists(select 1 from public.autonomous_control_coverage where status<>'EFFECTIVE') then
    blockers:=blockers||jsonb_build_array('CONTROL_COVERAGE_NOT_EFFECTIVE');
  end if;
  if exists(select 1 from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED') then
    blockers:=blockers||jsonb_build_array('OPEN_CRITICAL_FINDINGS');
  end if;
  if exists(select 1 from public.autonomous_challenges where challenge_type in('META_AUDIT','RED_TEAM','DIGITAL_TWIN') and status<>'PASSED') then
    blockers:=blockers||jsonb_build_array('CORPORATE_CHALLENGES_INCOMPLETE');
  end if;
  if not exists(select 1 from public.autonomous_challenges where challenge_type='FOUNDER_CHALLENGE' and status='PASSED') then
    blockers:=blockers||jsonb_build_array('FOUNDER_CHALLENGE_PENDING');
  end if;
  if exists(select 1 from public.autonomous_quality_coverage where coverage_key='physical-gps-device' and status<>'COVERED') then
    blockers:=blockers||jsonb_build_array('PHYSICAL_GPS_DEVICE_UNVERIFIED');
  end if;
  if exists(select 1 from public.autonomous_quality_coverage where coverage_key='real-customer-acceptance' and status<>'COVERED') then
    blockers:=blockers||jsonb_build_array('REAL_CUSTOMER_ACCEPTANCE_UNVERIFIED');
  end if;
  if exists(select 1 from public.autonomous_jobs where status='RUNNING') then
    blockers:=blockers||jsonb_build_array('RUNNING_JOBS_PRESENT');
  end if;
  if exists(select 1 from public.autonomous_kill_switches where enabled=true) then
    blockers:=blockers||jsonb_build_array('ACTIVE_KILL_SWITCH');
  end if;

  verification:=jsonb_build_object(
    'passed',jsonb_array_length(blockers)=0,
    'source','D14_PERSISTED_CORPORATE_AUDIT',
    'blockers',blockers,
    'effective_controls',(select count(*) from public.autonomous_control_coverage where status='EFFECTIVE'),
    'open_critical_findings',(select count(*) from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED'),
    'corporate_challenges',(
      select jsonb_object_agg(challenge_type,status)
      from public.autonomous_challenges
    ),
    'quality_coverage',(
      select jsonb_object_agg(coverage_key,status)
      from public.autonomous_quality_coverage
    ),
    'verified_at',now()
  );

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,
    blocked_reason,started_at,finished_at
  ) values(
    14,auditor.id,'Final D14 corporate audit before Customer #1 readiness',
    'CORPORATE_FINAL_AUDIT','AUTONOMOUS_CORPORATION','current',
    'GREEN',case when jsonb_array_length(blockers)=0 then 'SUCCEEDED' else 'BLOCKED' end,
    'd14-final-audit:'||gen_random_uuid(),corr,
    jsonb_build_array('autonomous_control_coverage','autonomous_challenges','autonomous_quality_coverage','autonomous_audit_findings'),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true),
    'audit.corporate_final_gate',verification,'AUTHORIZED_POLICY',verification,verification,
    case when jsonb_array_length(blockers)=0 then null else blockers::text end,
    now(),now()
  ) returning * into job;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,evidence_hash,metadata,correlation_id
  ) values(
    job.id,'D14_FINAL_CORPORATE_AUDIT','autonomous-corporation/final-audit',
    encode(extensions.digest(verification::text,'sha256'),'hex'),
    jsonb_build_object('blockers',blockers),corr
  );

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,
    policy_version,evidence_refs,authorization_result,correlation_id
  ) values(
    job.id,14,auditor.id,
    case when jsonb_array_length(blockers)=0 then 'CORPORATE_AUDIT_PASSED' else 'CORPORATE_AUDIT_BLOCKED' end,
    case when jsonb_array_length(blockers)=0 then 'All persisted corporate audit gates passed' else 'Final audit remains fail-closed on explicit persisted blockers' end,
    'GREEN',job.policy_version,
    jsonb_build_array('autonomous-corporation/final-audit'),
    case when jsonb_array_length(blockers)=0 then 'AUTHORIZED' else 'DENIED' end,
    corr
  );

  update public.autonomous_agents set last_action_at=now(),updated_at=now() where id=auditor.id;
  return job;
end$$;

revoke all on function public.autonomous_run_final_corporate_audit() from public,anon,authenticated;
grant execute on function public.autonomous_run_final_corporate_audit() to service_role;
