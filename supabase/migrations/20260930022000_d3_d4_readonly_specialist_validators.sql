-- Independent persisted-state validators for D3/D4 readonly specialist jobs.
-- Judge checks the exact executor contract and execution evidence.
-- Sentinel checks the agent remains advisory-only and the job cannot represent a business mutation.

create or replace function public.autonomous_judge_readonly_specialist_job(p_job_id uuid)
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
  if j.id is null then raise exception 'READONLY_SPECIALIST_JOB_NOT_FOUND'; end if;
  select * into a from public.autonomous_agents where id=j.agent_id;
  if a.id is null then raise exception 'READONLY_SPECIALIST_AGENT_NOT_FOUND'; end if;

  if a.department_id not in (3,4)
     or a.status='DISABLED'
     or not coalesce(a.permissions ? 'advisory_only',false)
     or j.status<>'SUCCEEDED'
     or j.trigger_type<>'READONLY_SPECIALIST_EXECUTOR'
     or j.authorization_decision<>'AUTHORIZED_ADVISORY_EXECUTOR'
     or j.capability not like 'advisory.readonly.%'
     or coalesce(j.verification_result->>'passed','false')<>'true'
     or coalesce(j.verification_result->>'readonly','false')<>'true'
     or coalesce(j.verification_result->>'aggregate_only','false')<>'true'
     or coalesce(j.actual_cost,0)<>0
  then
    raise exception 'READONLY_SPECIALIST_JUDGE_FAIL';
  end if;

  select count(*) into execution_count
  from public.autonomous_evidence_ledger
  where job_id=j.id and evidence_type='READONLY_SPECIALIST_EXECUTION';
  if execution_count<>1 then raise exception 'READONLY_SPECIALIST_EXECUTION_EVIDENCE_INVALID'; end if;

  ref:='ugo-test:readonly-specialist:judge:'||j.id::text;
  select id into existing_id from public.autonomous_evidence_ledger
  where job_id=j.id and reference=ref limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    j.id,'AGENT_JUDGE_PROOF',ref,
    jsonb_build_object(
      'validator','Judge','result','PASS','agent_key',a.agent_key,
      'readonly',true,'aggregate_only',true,'authority_class',a.authority_class,
      'authorization_decision',j.authorization_decision
    ),
    j.correlation_id
  ) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.autonomous_judge_readonly_specialist_job(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_judge_readonly_specialist_job(uuid) to service_role;

create or replace function public.autonomous_sentinel_readonly_specialist_job(p_job_id uuid)
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
  if j.id is null then raise exception 'READONLY_SPECIALIST_JOB_NOT_FOUND'; end if;
  select * into a from public.autonomous_agents where id=j.agent_id;
  if a.id is null then raise exception 'READONLY_SPECIALIST_AGENT_NOT_FOUND'; end if;

  select count(*) into judge_count
  from public.autonomous_evidence_ledger
  where job_id=j.id and evidence_type='AGENT_JUDGE_PROOF';
  select count(*) into execution_count
  from public.autonomous_evidence_ledger
  where job_id=j.id and evidence_type='READONLY_SPECIALIST_EXECUTION';

  if judge_count<1
     or execution_count<>1
     or a.department_id not in (3,4)
     or a.status='DISABLED'
     or not coalesce(a.permissions ? 'advisory_only',false)
     or j.status<>'SUCCEEDED'
     or j.trigger_type<>'READONLY_SPECIALIST_EXECUTOR'
     or j.authorization_decision<>'AUTHORIZED_ADVISORY_EXECUTOR'
     or coalesce(j.verification_result->>'readonly','false')<>'true'
     or coalesce(j.verification_result->>'aggregate_only','false')<>'true'
     or coalesce(j.actual_cost,0)<>0
  then
    raise exception 'READONLY_SPECIALIST_SENTINEL_FAIL';
  end if;

  ref:='ugo-test:readonly-specialist:sentinel:'||j.id::text;
  select id into existing_id from public.autonomous_evidence_ledger
  where job_id=j.id and reference=ref limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    j.id,'AGENT_SENTINEL_PROOF',ref,
    jsonb_build_object(
      'validator','Sentinel','result','PASS','agent_key',a.agent_key,
      'readonly',true,'aggregate_only',true,'production_touched',false,
      'business_mutation_executor',false
    ),
    j.correlation_id
  ) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.autonomous_sentinel_readonly_specialist_job(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_sentinel_readonly_specialist_job(uuid) to service_role;
