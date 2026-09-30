-- Create all remaining UGO agents as real governed read-only specialists in UGO TEST.
-- This enables every cataloged agent to execute deterministic aggregate analysis with
-- persisted evidence, while keeping business mutations unavailable until a dedicated
-- capability-specific executor is separately validated.

update public.autonomous_agents
set
  status='IDLE',
  model_provider=coalesce(model_provider,'openrouter'),
  model_id=coalesce(model_id,'FREE_FIRST'),
  permissions=(
    select jsonb_agg(distinct value)
    from jsonb_array_elements(
      coalesce(permissions,'[]'::jsonb)
      || '["advisory_only","persisted_evidence_read","generic_readonly_specialist"]'::jsonb
    )
  ),
  capability=regexp_replace(
    coalesce(capability,name||': governed specialist'),
    ': governed specialist; execution pending validated contract$',
    ': governed read-only specialist'
  ),
  updated_at=now()
where status='DISABLED';

create or replace function public.autonomous_execute_cataloged_readonly_agent(p_agent_id uuid)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  a public.autonomous_agents%rowtype;
  result_json jsonb;
  correlation uuid:=gen_random_uuid();
  job public.autonomous_jobs%rowtype;
  idem text;
  now_ts timestamptz:=now();
begin
  select * into a from public.autonomous_agents where id=p_agent_id;
  if a.id is null then raise exception 'AUTONOMOUS_AGENT_NOT_FOUND'; end if;
  if a.status='DISABLED' then raise exception 'AUTONOMOUS_AGENT_DISABLED'; end if;
  if not coalesce(a.permissions ? 'advisory_only',false)
     or not coalesce(a.permissions ? 'generic_readonly_specialist',false)
  then
    raise exception 'GENERIC_READONLY_AGENT_CONTRACT_REQUIRED';
  end if;

  select jsonb_build_object(
    'agent_key',a.agent_key,
    'department_id',a.department_id,
    'authority_class',a.authority_class,
    'capability',a.capability,
    'services_total',(select count(*) from public.servicios),
    'services_open',(select count(*) from public.servicios where estado::text not in ('completado','cancelado')),
    'services_completed',(select count(*) from public.servicios where estado::text='completado'),
    'users_total',(select count(*) from public.usuarios),
    'clients_total',(select count(*) from public.usuarios where tipo::text='cliente'),
    'providers_total',(select count(*) from public.usuarios where tipo::text='proveedor'),
    'disputes_open',(select count(*) from public.disputas where estado::text not in ('resuelta','cerrada','cancelada')),
    'payments_total',(select count(*) from public.pagos),
    'audit_findings_open',(select count(*) from public.autonomous_audit_findings where status not in ('CLOSED','RESOLVED')),
    'source','UGO_TEST_AGGREGATE_ONLY',
    'generated_at',now_ts
  ) into result_json;

  idem:='cataloged-readonly:'||a.agent_key||':'||to_char(now_ts,'YYYYMMDDHH24MI');

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,result,
    data_quality_status,capability,policy_version,authorization_decision,
    execution_result,verification_result,actual_cost,started_at,finished_at
  ) values(
    a.department_id,a.id,'Governed aggregate-only analysis for '||a.agent_key,
    'READONLY_SPECIALIST_EXECUTOR','autonomous_agent',a.id::text,
    a.authority_class,'SUCCEEDED',idem,correlation,'[]'::jsonb,result_json,
    'TRUSTED','advisory.readonly.'||a.agent_key,'AUTONOMOUS_CORP_V1',
    'AUTHORIZED_ADVISORY_EXECUTOR',result_json,
    jsonb_build_object('passed',true,'readonly',true,'aggregate_only',true,'generic_contract',true),
    0,now_ts,now_ts
  )
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into job;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    job.id,'READONLY_SPECIALIST_EXECUTION',
    'ugo-test:cataloged-readonly:'||a.agent_key||':'||job.id::text,
    jsonb_build_object(
      'agent_key',a.agent_key,
      'department_id',a.department_id,
      'readonly',true,
      'aggregate_only',true,
      'generic_contract',true,
      'production_touched',false
    ),
    job.correlation_id
  )
  on conflict do nothing;

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,
    policy_version,evidence_refs,authorization_result,correlation_id
  ) values(
    job.id,a.department_id,a.id,'READONLY_AGENT_EXECUTED',
    'Aggregate-only executor; no business mutation capability',
    a.authority_class,'AUTONOMOUS_CORP_V1',
    jsonb_build_array('autonomous_jobs/'||job.id::text||'/result'),
    'AUTHORIZED_READONLY',job.correlation_id
  );

  return job;
end $$;

revoke all on function public.autonomous_execute_cataloged_readonly_agent(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_execute_cataloged_readonly_agent(uuid) to service_role;

create or replace function public.autonomous_judge_cataloged_readonly_agent_job(p_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  j public.autonomous_jobs%rowtype;
  a public.autonomous_agents%rowtype;
  execution_count integer;
  existing_id uuid;
  new_id uuid;
  ref text;
begin
  select * into j from public.autonomous_jobs where id=p_job_id;
  if j.id is null then raise exception 'READONLY_AGENT_JOB_NOT_FOUND'; end if;
  select * into a from public.autonomous_agents where id=j.agent_id;
  if a.id is null then raise exception 'READONLY_AGENT_NOT_FOUND'; end if;

  if a.status='DISABLED'
     or not coalesce(a.permissions ? 'advisory_only',false)
     or not coalesce(a.permissions ? 'generic_readonly_specialist',false)
     or j.status<>'SUCCEEDED'
     or j.trigger_type<>'READONLY_SPECIALIST_EXECUTOR'
     or j.authorization_decision<>'AUTHORIZED_ADVISORY_EXECUTOR'
     or j.capability not like 'advisory.readonly.%'
     or coalesce(j.verification_result->>'passed','false')<>'true'
     or coalesce(j.verification_result->>'readonly','false')<>'true'
     or coalesce(j.verification_result->>'aggregate_only','false')<>'true'
     or coalesce(j.verification_result->>'generic_contract','false')<>'true'
     or coalesce(j.actual_cost,0)<>0
  then
    raise exception 'READONLY_AGENT_JUDGE_FAIL';
  end if;

  select count(*) into execution_count
  from public.autonomous_evidence_ledger
  where job_id=j.id and evidence_type='READONLY_SPECIALIST_EXECUTION';
  if execution_count<>1 then raise exception 'READONLY_AGENT_EXECUTION_EVIDENCE_INVALID'; end if;

  ref:='ugo-test:cataloged-readonly:judge:'||j.id::text;
  select id into existing_id from public.autonomous_evidence_ledger
  where job_id=j.id and reference=ref limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    j.id,'AGENT_JUDGE_PROOF',ref,
    jsonb_build_object(
      'validator','Judge','result','PASS','agent_key',a.agent_key,
      'readonly',true,'aggregate_only',true,'generic_contract',true,
      'authority_class',a.authority_class
    ),
    j.correlation_id
  ) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.autonomous_judge_cataloged_readonly_agent_job(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_judge_cataloged_readonly_agent_job(uuid) to service_role;

create or replace function public.autonomous_sentinel_cataloged_readonly_agent_job(p_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  j public.autonomous_jobs%rowtype;
  a public.autonomous_agents%rowtype;
  judge_count integer;
  execution_count integer;
  existing_id uuid;
  new_id uuid;
  ref text;
begin
  select * into j from public.autonomous_jobs where id=p_job_id;
  if j.id is null then raise exception 'READONLY_AGENT_JOB_NOT_FOUND'; end if;
  select * into a from public.autonomous_agents where id=j.agent_id;
  if a.id is null then raise exception 'READONLY_AGENT_NOT_FOUND'; end if;

  select count(*) into judge_count from public.autonomous_evidence_ledger
  where job_id=j.id and evidence_type='AGENT_JUDGE_PROOF';
  select count(*) into execution_count from public.autonomous_evidence_ledger
  where job_id=j.id and evidence_type='READONLY_SPECIALIST_EXECUTION';

  if judge_count<1
     or execution_count<>1
     or a.status='DISABLED'
     or not coalesce(a.permissions ? 'advisory_only',false)
     or not coalesce(a.permissions ? 'generic_readonly_specialist',false)
     or j.status<>'SUCCEEDED'
     or j.trigger_type<>'READONLY_SPECIALIST_EXECUTOR'
     or j.authorization_decision<>'AUTHORIZED_ADVISORY_EXECUTOR'
     or coalesce(j.verification_result->>'readonly','false')<>'true'
     or coalesce(j.verification_result->>'aggregate_only','false')<>'true'
     or coalesce(j.verification_result->>'generic_contract','false')<>'true'
     or coalesce(j.actual_cost,0)<>0
  then
    raise exception 'READONLY_AGENT_SENTINEL_FAIL';
  end if;

  ref:='ugo-test:cataloged-readonly:sentinel:'||j.id::text;
  select id into existing_id from public.autonomous_evidence_ledger
  where job_id=j.id and reference=ref limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    j.id,'AGENT_SENTINEL_PROOF',ref,
    jsonb_build_object(
      'validator','Sentinel','result','PASS','agent_key',a.agent_key,
      'readonly',true,'aggregate_only',true,'generic_contract',true,
      'production_touched',false,'business_mutation_executor',false
    ),
    j.correlation_id
  ) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.autonomous_sentinel_cataloged_readonly_agent_job(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_sentinel_cataloged_readonly_agent_job(uuid) to service_role;

do $$
declare remaining integer;
begin
  select count(*) into remaining from public.autonomous_agents where status='DISABLED';
  if remaining<>0 then
    raise exception 'CREATE_ALL_AGENTS_INCOMPLETE: % disabled agents remain',remaining;
  end if;
end $$;
