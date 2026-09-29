-- Align the independent Quality Coverage Agent with runtime-proven persisted-state judges.
-- Deterministic TEST-only checks may be promoted only from the independent judge chain.
-- Physical-device, uploaded-media and real-customer acceptance remain protected/human gates.

create or replace function public.autonomous_reconcile_quality_coverage()
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  agent public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  snapshot jsonb;
  promotable text[]:=array[
    'provider-radius','payments','service-lifecycle',
    'gps-geofence','roles','permissions-rls','realtime'
  ];
  protected text[]:=array[
    'physical-gps-device','uploaded-media-bytes','real-customer-acceptance'
  ];
  invalid_green text[];
  verified_count integer;
  uncovered_count integer;
begin
  select * into agent from public.autonomous_agents
    where agent_key='quality-coverage-agent' and department_id=9 and status='IDLE';
  if agent.id is null then raise exception 'QUALITY_COVERAGE_AGENT_NOT_ENABLED'; end if;

  update public.autonomous_quality_coverage c
  set status='COVERED',updated_at=now()
  where c.coverage_key=any(promotable) and exists(
    select 1 from public.autonomous_qa_runs r
    join public.autonomous_agents j on j.id=r.judge_agent_id
    join public.autonomous_jobs aj on aj.idempotency_key='qa-judge:'||r.id::text
    where r.id=c.last_run_id and r.status='PASSED'
      and r.judge_result->>'source'='PERSISTED_TEST_STATE'
      and j.agent_key='deterministic-judge' and j.status='IDLE'
      and aj.agent_id=j.id and aj.status='SUCCEEDED'
      and aj.verification_result->>'passed'='true'
      and aj.verification_result->>'source'='PERSISTED_TEST_STATE');

  update public.autonomous_quality_coverage
  set status='UNCOVERED',updated_at=now()
  where coverage_key=any(protected) and status<>'UNCOVERED';

  select coalesce(array_agg(c.coverage_key order by c.coverage_key),'{}') into invalid_green
  from public.autonomous_quality_coverage c
  where c.coverage_key=any(promotable) and c.status='COVERED' and not exists(
    select 1 from public.autonomous_qa_runs r
    join public.autonomous_agents j on j.id=r.judge_agent_id
    join public.autonomous_jobs aj on aj.idempotency_key='qa-judge:'||r.id::text
    where r.id=c.last_run_id and r.status='PASSED'
      and r.judge_result->>'source'='PERSISTED_TEST_STATE'
      and j.agent_key='deterministic-judge' and j.status='IDLE'
      and aj.agent_id=j.id and aj.status='SUCCEEDED'
      and aj.verification_result->>'passed'='true'
      and aj.verification_result->>'source'='PERSISTED_TEST_STATE');

  if cardinality(invalid_green)>0 then
    update public.autonomous_quality_coverage
    set status='UNCOVERED',updated_at=now()
    where coverage_key=any(invalid_green);
  end if;

  select count(*) filter(where status='COVERED'),count(*) filter(where status<>'COVERED')
    into verified_count,uncovered_count from public.autonomous_quality_coverage;

  select coalesce(jsonb_agg(jsonb_build_object('coverage_key',coverage_key,'status',status)
    order by coverage_key),'[]'::jsonb)
    into snapshot from public.autonomous_quality_coverage;

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at)
  values(
    9,agent.id,'Reconcile QA coverage from independent persisted judges','QA_COVERAGE_RECONCILE',
    'QUALITY_COVERAGE','current','GREEN','SUCCEEDED','qa-coverage:'||gen_random_uuid()::text,
    gen_random_uuid(),jsonb_build_array(jsonb_build_object('source','autonomous_quality_coverage')),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,'completeness',true,
      'consistency',true,'basis','independent persisted judge jobs'),
    'qa.coverage_reconcile',snapshot,'AUTHORIZED_POLICY',snapshot,
    jsonb_build_object('passed',true,'covered',verified_count,'uncovered',uncovered_count,
      'protected_uncovered',protected,'customer_acceptance',false),now(),now())
  returning * into job;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(
    job.id,'QA_COVERAGE_RECONCILIATION','autonomous_quality_coverage/current',
    encode(extensions.digest(snapshot::text,'sha256'),'hex'),
    jsonb_build_object('covered',verified_count,'uncovered',uncovered_count),job.correlation_id);

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,
    authority_class,policy_version,evidence_refs,authorization_result,correlation_id)
  values(
    job.id,9,agent.id,'QUALITY_COVERAGE_RECONCILED',
    'Only independent persisted-state judge evidence can promote deterministic coverage',
    'GREEN',job.policy_version,jsonb_build_array('autonomous_quality_coverage/current'),
    'AUTHORIZED',job.correlation_id);

  update public.autonomous_agents
  set last_action_at=now(),updated_at=now()
  where id=agent.id;

  return job;
end $$;

revoke all on function public.autonomous_reconcile_quality_coverage() from public,anon,authenticated;
grant execute on function public.autonomous_reconcile_quality_coverage() to service_role;
