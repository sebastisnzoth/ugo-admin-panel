-- QA Director evidence reconciler. The specialist remains DISABLED/YELLOW until dual-control execution is proven.
create or replace function public.autonomous_qa_director_reconcile()
returns jsonb language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  director public.autonomous_agents%rowtype;
  regression_job public.autonomous_jobs%rowtype;
  release_job public.autonomous_jobs%rowtype;
  judge_ok boolean:=false; p0_ok boolean:=false; meta_ok boolean:=false; coverage_ok boolean:=false;
  d14_count integer:=0; open_critical integer:=0; snapshot jsonb; digest text;
begin
  select * into director from public.autonomous_agents where agent_key='qa-director' and department_id=9;
  if director.id is null then raise exception 'QA_DIRECTOR_NOT_REGISTERED'; end if;
  if director.status<>'DISABLED' or director.authority_class<>'YELLOW' then
    raise exception 'QA_DIRECTOR_GOVERNANCE_INVALID';
  end if;

  select exists(select 1 from public.autonomous_jobs where agent_id=(select id from public.autonomous_agents where agent_key='deterministic-judge') and status='SUCCEEDED' and coalesce((verification_result->>'passed')::boolean,false)) into judge_ok;
  select exists(select 1 from public.autonomous_jobs where agent_id=(select id from public.autonomous_agents where agent_key='p0-journey-tester') and status='SUCCEEDED' and coalesce((verification_result->>'passed')::boolean,false)) into p0_ok;
  select exists(select 1 from public.autonomous_jobs where agent_id=(select id from public.autonomous_agents where agent_key='meta-qa-agent') and status='SUCCEEDED' and coalesce((verification_result->>'passed')::boolean,false)) into meta_ok;
  select exists(select 1 from public.autonomous_jobs where agent_id=(select id from public.autonomous_agents where agent_key='quality-coverage-agent') and status='SUCCEEDED' and coalesce((verification_result->>'passed')::boolean,false)) into coverage_ok;
  select * into regression_job from public.autonomous_jobs where agent_id=(select id from public.autonomous_agents where agent_key='regression-agent') and status='SUCCEEDED' order by finished_at desc nulls last limit 1;
  select * into release_job from public.autonomous_jobs where agent_id=(select id from public.autonomous_agents where agent_key='release-gate-agent') and status='SUCCEEDED' order by finished_at desc nulls last limit 1;
  select count(*) into d14_count from public.autonomous_agents where department_id=14 and status<>'DISABLED';
  select count(*) into open_critical from public.autonomous_audit_findings where status='OPEN' and severity='CRITICAL';

  snapshot=jsonb_build_object(
    'source','PERSISTED_QA_EVIDENCE',
    'director_status',director.status,'director_authority',director.authority_class,
    'deterministic_judge',judge_ok,'p0_journey',p0_ok,'meta_qa',meta_ok,'quality_coverage',coverage_ok,
    'regression_verified',coalesce((regression_job.verification_result->>'passed')::boolean,false),
    'release_gate_verified',coalesce((release_job.verification_result->>'passed')::boolean,false),
    'release_gate_status',release_job.verification_result->>'gate_status',
    'd14_enabled',d14_count,'open_critical_findings',open_critical,
    'customer_1_ready',coalesce(release_job.verification_result->>'gate_status','')='READY',
    'can_self_certify',false,
    'execution_allowed',false
  );
  digest=encode(extensions.digest(snapshot::text,'sha256'),'hex');
  return snapshot||jsonb_build_object('evidence_hash',digest,
    'consistent',judge_ok and p0_ok and meta_ok and coalesce((regression_job.verification_result->>'passed')::boolean,false)
      and coalesce((release_job.verification_result->>'passed')::boolean,false) and d14_count=6);
end$$;
revoke all on function public.autonomous_qa_director_reconcile() from public,anon,authenticated;
grant execute on function public.autonomous_qa_director_reconcile() to service_role;
