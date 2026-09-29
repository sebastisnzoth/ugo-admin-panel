-- Deterministic D14 control verifier. It derives status from persisted runtime facts;
-- callers cannot supply a desired status or evidence.
create or replace function public.autonomous_verify_integrity_controls()
returns setof public.autonomous_control_coverage
language plpgsql security definer set search_path=public,private,auth,extensions as $$
declare
  evidence_ok boolean;
  authority_ok boolean;
  quality_ok boolean;
  resilience_ok boolean;
begin
  select
    exists(select 1 from public.autonomous_evidence_ledger) and
    not exists(select 1 from public.autonomous_evidence_ledger e left join public.autonomous_jobs j on j.id=e.job_id where e.job_id is not null and j.id is null) and
    not exists(select 1 from public.autonomous_evidence_ledger where evidence_hash is null or btrim(evidence_hash)='' or correlation_id is null) and
    not exists(select 1 from public.autonomous_decision_ledger d left join public.autonomous_jobs j on j.id=d.job_id where d.job_id is not null and j.id is null)
  into evidence_ok;

  select
    not exists(select 1 from public.autonomous_jobs where status in('QUEUED','RUNNING','WAITING_APPROVAL') and agent_id is null) and
    coalesce((select status='COVERED' from public.autonomous_quality_coverage where coverage_key='roles'),false) and
    coalesce((select status='COVERED' from public.autonomous_quality_coverage where coverage_key='permissions-rls'),false)
  into authority_ok;

  select
    not exists(select 1 from public.autonomous_jobs where status in('QUEUED','RUNNING','WAITING_APPROVAL') and data_quality_status<>'TRUSTED') and
    to_regprocedure('public.autonomous_assess_data_quality(uuid,boolean,boolean,boolean,boolean,text,boolean,jsonb)') is not null
  into quality_ok;

  select
    not exists(select 1 from public.autonomous_jobs where status='RUNNING' and (lease_expires_at is null or lease_expires_at<now())) and
    not exists(select 1 from public.autonomous_jobs where status in('QUEUED','RUNNING','WAITING_APPROVAL') and agent_id is null) and
    not exists(select 1 from public.autonomous_jobs where attempt_count>max_attempts) and
    to_regprocedure('public.autonomous_claim_job(text,integer)') is not null and
    to_regprocedure('public.autonomous_recover_stale_jobs()') is not null
  into resilience_ok;

  update public.autonomous_control_coverage set
    status=case control_key
      when 'audit-evidence' then case when evidence_ok then 'EFFECTIVE' else 'INEFFECTIVE' end
      when 'authority-boundaries' then case when authority_ok then 'EFFECTIVE' else 'INEFFECTIVE' end
      when 'data-quality-gate' then case when quality_ok then 'EFFECTIVE' else 'INEFFECTIVE' end
      when 'job-resilience' then case when resilience_ok then 'EFFECTIVE' else 'INEFFECTIVE' end
      else status end,
    last_verified_at=case when control_key in('audit-evidence','authority-boundaries','data-quality-gate','job-resilience') then now() else last_verified_at end,
    evidence_refs=case control_key
      when 'audit-evidence' then jsonb_build_array('deterministic:no-orphan-ledgers','deterministic:evidence-hash-and-correlation-present')
      when 'authority-boundaries' then jsonb_build_array('quality-coverage:roles','quality-coverage:permissions-rls','deterministic:no-ownerless-executable-jobs')
      when 'data-quality-gate' then jsonb_build_array('deterministic:no-active-untrusted-jobs','rpc:autonomous_assess_data_quality')
      when 'job-resilience' then jsonb_build_array('deterministic:no-expired-running-leases','rpc:autonomous_claim_job','rpc:autonomous_recover_stale_jobs')
      else evidence_refs end
  where control_key in('audit-evidence','authority-boundaries','data-quality-gate','job-resilience');

  return query select * from public.autonomous_control_coverage
    where control_key in('audit-evidence','authority-boundaries','data-quality-gate','job-resilience')
    order by control_key;
end $$;

revoke all on function public.autonomous_verify_integrity_controls() from public,anon,authenticated;
grant execute on function public.autonomous_verify_integrity_controls() to service_role;
