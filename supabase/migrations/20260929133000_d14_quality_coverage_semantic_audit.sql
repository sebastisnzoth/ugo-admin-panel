-- Reconcile D14's Quality Coverage audit with the current independent-judge model.
-- Deterministic TEST coverage may be COVERED only when backed by persisted judge jobs.
-- Physical GPS, uploaded media bytes and real customer acceptance remain protected.

create or replace function public.autonomous_d14_audit_quality_coverage_agent()
returns public.autonomous_control_coverage language plpgsql security definer
set search_path=public,private,auth,pg_temp as $$
declare
  inspector public.autonomous_agents%rowtype;
  specialist public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  control public.autonomous_control_coverage%rowtype;
  physical_or_human_green integer;
  semantic_decisions integer;
  semantic_evidence integer;
begin
  select * into inspector from public.autonomous_agents
    where agent_key='internal-control-inspector' and department_id=14 and status='IDLE';
  if inspector.id is null then raise exception 'D14_INSPECTOR_REQUIRED'; end if;

  select * into specialist from public.autonomous_agents
    where agent_key='quality-coverage-agent' and department_id=9 and status='IDLE';
  if specialist.id is null then raise exception 'QUALITY_COVERAGE_AGENT_NOT_OPERATIONAL'; end if;

  select * into job from public.autonomous_jobs
    where agent_id=specialist.id and capability='qa.coverage_reconcile'
    order by created_at desc limit 1;
  if job.id is null or job.status<>'SUCCEEDED' or job.verification_result->>'passed'<>'true' then
    raise exception 'QUALITY_COVERAGE_RUNTIME_PROOF_REQUIRED';
  end if;

  select count(*) into semantic_decisions
  from public.autonomous_decision_ledger
  where job_id=job.id and decision='QUALITY_COVERAGE_RECONCILED';

  select count(*) into semantic_evidence
  from public.autonomous_evidence_ledger
  where job_id=job.id and evidence_type='QA_COVERAGE_RECONCILIATION';

  if semantic_decisions<1 or semantic_evidence<1 or job.correlation_id is null then
    raise exception 'QUALITY_COVERAGE_AUDIT_CHAIN_INCOMPLETE';
  end if;

  select count(*) into physical_or_human_green
  from public.autonomous_quality_coverage
  where coverage_key in(
    'physical-gps-device','uploaded-media-bytes','real-customer-acceptance'
  ) and status='COVERED';

  if physical_or_human_green<>0 then
    raise exception 'D14_FAKE_PHYSICAL_OR_HUMAN_COVERAGE_DETECTED';
  end if;

  update public.autonomous_control_coverage
  set auditor_agent_id=inspector.id,status='EFFECTIVE',last_verified_at=now(),
      evidence_refs=jsonb_build_array(
        'autonomous_jobs/'||job.id::text,
        'autonomous_decision_ledger/job/'||job.id::text,
        'autonomous_evidence_ledger/job/'||job.id::text,
        'autonomous_quality_coverage/current')
  where control_key='qa-release-gate'
  returning * into control;

  if control.id is null then raise exception 'QA_RELEASE_GATE_CONTROL_REQUIRED'; end if;

  update public.autonomous_agents
  set last_action_at=now(),updated_at=now()
  where id=inspector.id;

  return control;
end $$;

revoke all on function public.autonomous_d14_audit_quality_coverage_agent() from public,anon,authenticated;
grant execute on function public.autonomous_d14_audit_quality_coverage_agent() to service_role;
