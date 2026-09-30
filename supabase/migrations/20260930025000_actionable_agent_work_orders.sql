-- Governed actionable layer for every UGO agent.
-- Agents can create persisted work orders. GREEN may execute in SAFE_MODE/ON.
-- YELLOW/RED are prepared but remain behind existing human approval gates.

create table if not exists public.autonomous_action_artifacts(
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.autonomous_jobs(id) on delete restrict,
  department_id integer not null references public.autonomous_departments(department_id),
  agent_id uuid not null references public.autonomous_agents(id),
  action_type text not null,
  execution_channel text not null,
  effect_scope text not null default 'INTERNAL_WORK_ORDER',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'DISPATCHED' check(status in('DISPATCHED','COMPLETED','FAILED','CANCELLED')),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.autonomous_action_artifacts enable row level security;
revoke all on public.autonomous_action_artifacts from public,anon,authenticated;
grant select,insert,update on public.autonomous_action_artifacts to service_role;
create policy autonomous_action_artifacts_superadmin_read
on public.autonomous_action_artifacts for select to authenticated
using(private.is_superadmin());

-- Each real agent gets its own exact work-order capability. This prevents one
-- agent from borrowing another agent's action authority or department.
insert into public.autonomous_capability_registry(
  capability_key,department_id,authority_class,executor_kind,safe_mode_allowed,
  enabled,input_schema,verification_policy,updated_at
)
select
  'agent.work_order.'||a.agent_key,
  a.department_id,
  a.authority_class,
  'DETERMINISTIC',
  (a.authority_class='GREEN'),
  true,
  '{"required":["action_type","summary"],"maxSummaryLength":500,"payload":"json"}'::jsonb,
  jsonb_build_object(
    'kind','persisted_work_order',
    'agent_key',a.agent_key,
    'authority_class',a.authority_class,
    'requires_dual_control',a.authority_class='YELLOW',
    'requires_human_approval',a.authority_class='RED'
  ),
  now()
from public.autonomous_agents a
on conflict(capability_key) do update set
  department_id=excluded.department_id,
  authority_class=excluded.authority_class,
  executor_kind=excluded.executor_kind,
  safe_mode_allowed=excluded.safe_mode_allowed,
  enabled=true,
  input_schema=excluded.input_schema,
  verification_policy=excluded.verification_policy,
  updated_at=now();

update public.autonomous_agents
set permissions=(
  select jsonb_agg(distinct value)
  from jsonb_array_elements(coalesce(permissions,'[]'::jsonb)||'["action_work_order"]'::jsonb)
),updated_at=now();

create or replace function private.autonomous_work_order_channel(p_department_id integer)
returns text
language sql
immutable
security invoker
set search_path=public,private,pg_temp
as $$
  select case p_department_id
    when 1 then 'EXECUTIVE_COMMAND'
    when 2 then 'OPERATIONS'
    when 3 then 'CLIENT_EXPERIENCE'
    when 4 then 'PROVIDER_OPERATIONS'
    when 5 then 'GROWTH'
    when 6 then 'TRUST_RESOLUTION'
    when 7 then 'FINANCE_REVIEW'
    when 8 then 'GITHUB_ENGINEERING'
    when 9 then 'QA'
    when 10 then 'LEGAL_REVIEW'
    when 11 then 'MARKETING'
    when 12 then 'PRODUCT_DESIGN'
    when 14 then 'CORPORATE_AUDIT'
    else 'INTERNAL'
  end
$$;
revoke all on function private.autonomous_work_order_channel(integer) from public,anon,authenticated;

create or replace function public.autonomous_prepare_agent_work_order(
  p_agent_id uuid,
  p_action_type text,
  p_summary text,
  p_payload jsonb default '{}'::jsonb,
  p_idempotency_key text default null
)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  a public.autonomous_agents%rowtype;
  v public.autonomous_jobs%rowtype;
  mode_now text;
  idem text;
  killed boolean;
  cap_key text;
begin
  select * into a from public.autonomous_agents where id=p_agent_id;
  if a.id is null then raise exception 'AUTONOMOUS_AGENT_NOT_FOUND'; end if;
  if a.status='DISABLED' then raise exception 'AUTONOMOUS_AGENT_DISABLED'; end if;
  if not coalesce(a.permissions ? 'action_work_order',false) then
    raise exception 'ACTION_WORK_ORDER_PERMISSION_REQUIRED';
  end if;
  if nullif(btrim(p_action_type),'') is null then raise exception 'ACTION_TYPE_REQUIRED'; end if;
  if nullif(btrim(p_summary),'') is null or length(btrim(p_summary))>500 then
    raise exception 'ACTION_SUMMARY_INVALID';
  end if;

  select mode into mode_now from public.autonomous_company_state where singleton=true;
  if mode_now='OFF' then raise exception 'AUTONOMY_NOT_EXECUTABLE'; end if;

  select exists(
    select 1 from public.autonomous_kill_switches
    where enabled and (
      scope_type='GLOBAL'
      or (scope_type='DEPARTMENT' and scope_key=a.department_id::text)
      or (scope_type='AGENT' and scope_key=a.id::text)
      or (scope_type='CAPABILITY' and scope_key='agent.work_order.'||a.agent_key)
    )
  ) into killed;
  if killed then raise exception 'AUTONOMY_CONTAINED'; end if;

  cap_key:='agent.work_order.'||a.agent_key;
  if not exists(
    select 1 from public.autonomous_capability_registry
    where capability_key=cap_key and enabled
      and department_id=a.department_id
      and authority_class=a.authority_class
  ) then raise exception 'AGENT_ACTION_CAPABILITY_NOT_REGISTERED'; end if;

  idem:=coalesce(nullif(btrim(p_idempotency_key),''),
    'agent-work-order:'||a.agent_key||':'||encode(digest(
      btrim(p_action_type)||'|'||btrim(p_summary)||'|'||coalesce(p_payload,'{}'::jsonb)::text,
      'sha256'),'hex'));

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,input_evidence,data_quality_status,
    capability,policy_version,authorization_decision,blocked_reason
  ) values(
    a.department_id,a.id,btrim(p_summary),'AGENT_WORK_ORDER',
    'autonomous_agent',a.id::text,a.authority_class,
    case
      when a.authority_class='GREEN' then 'QUEUED'
      else 'WAITING_APPROVAL'
    end,
    idem,
    jsonb_build_array(jsonb_build_object(
      'action_type',btrim(p_action_type),
      'summary',btrim(p_summary),
      'payload',coalesce(p_payload,'{}'::jsonb)
    )),
    'TRUSTED',cap_key,'AUTONOMOUS_CORP_V1',
    case
      when a.authority_class='GREEN' then 'AUTHORIZED_POLICY'
      else 'PENDING_HUMAN'
    end,
    case
      when a.authority_class='YELLOW' then 'YELLOW_DUAL_CONTROL_REQUIRED'
      when a.authority_class='RED' then 'RED_HUMAN_APPROVAL_REQUIRED'
      else null
    end
  )
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into v;

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
    evidence_refs,authorization_result,correlation_id
  ) values(
    v.id,v.department_id,v.agent_id,'AGENT_WORK_ORDER_PREPARED',
    'Capability-specific work order prepared under agent authority',
    v.authority_class,v.policy_version,'[]'::jsonb,
    case when v.status='QUEUED' then 'AUTHORIZED' else 'PENDING_APPROVAL' end,
    v.correlation_id
  );

  return v;
end $$;
revoke all on function public.autonomous_prepare_agent_work_order(uuid,text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.autonomous_prepare_agent_work_order(uuid,text,text,jsonb,text) to service_role;

create or replace function public.autonomous_execute_work_order_job(p_job_id uuid)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  j public.autonomous_jobs%rowtype;
  a public.autonomous_agents%rowtype;
  cap public.autonomous_capability_registry%rowtype;
  mode_now text;
  payload jsonb;
  action_type text;
  summary_text text;
  artifact public.autonomous_action_artifacts%rowtype;
  channel text;
begin
  select * into j from public.autonomous_jobs where id=p_job_id for update;
  if j.id is null then raise exception 'JOB_NOT_FOUND'; end if;
  select * into a from public.autonomous_agents where id=j.agent_id;
  if a.id is null then raise exception 'AUTONOMOUS_AGENT_NOT_FOUND'; end if;
  if j.status not in('QUEUED','RUNNING') then raise exception 'JOB_NOT_EXECUTABLE'; end if;

  select mode into mode_now from public.autonomous_company_state where singleton=true;
  if mode_now not in('ON','SAFE_MODE') then raise exception 'AUTONOMY_NOT_EXECUTABLE'; end if;

  select * into cap from public.autonomous_capability_registry
  where capability_key=j.capability and enabled;
  if cap.capability_key is null
     or cap.department_id<>j.department_id
     or cap.authority_class<>j.authority_class
     or j.capability<>'agent.work_order.'||a.agent_key
  then raise exception 'EXECUTOR_CAPABILITY_REQUIRED'; end if;
  if mode_now='SAFE_MODE' and not cap.safe_mode_allowed then
    raise exception 'SAFE_MODE_CAPABILITY_DENIED';
  end if;

  if j.authority_class='YELLOW'
     and not (j.approval_count>=2 and j.authorization_decision='AUTHORIZED_DUAL_CONTROL')
  then raise exception 'YELLOW_DUAL_CONTROL_REQUIRED'; end if;
  if j.authority_class='RED'
     and not (j.approval_count>=1 and j.authorization_decision='AUTHORIZED_HUMAN')
  then raise exception 'RED_HUMAN_APPROVAL_REQUIRED'; end if;

  payload:=coalesce(j.input_evidence->0->'payload','{}'::jsonb);
  action_type:=nullif(btrim(j.input_evidence->0->>'action_type'),'');
  summary_text:=nullif(btrim(j.input_evidence->0->>'summary'),'');
  if action_type is null or summary_text is null then raise exception 'INVALID_WORK_ORDER_INPUT'; end if;

  channel:=private.autonomous_work_order_channel(j.department_id);

  insert into public.autonomous_action_artifacts(
    job_id,department_id,agent_id,action_type,execution_channel,effect_scope,
    payload,status,correlation_id
  ) values(
    j.id,j.department_id,j.agent_id,action_type,channel,'INTERNAL_WORK_ORDER',
    jsonb_build_object('summary',summary_text,'payload',payload),
    'DISPATCHED',j.correlation_id
  )
  on conflict(job_id) do update set job_id=excluded.job_id
  returning * into artifact;

  update public.autonomous_jobs set
    status='SUCCEEDED',
    result=jsonb_build_object(
      'work_order_id',artifact.id,
      'action_type',artifact.action_type,
      'execution_channel',artifact.execution_channel,
      'effect_scope',artifact.effect_scope
    ),
    execution_result=jsonb_build_object(
      'work_order_created',true,
      'work_order_id',artifact.id,
      'channel',artifact.execution_channel
    ),
    verification_result=jsonb_build_object(
      'passed',true,
      'persisted_work_order',true,
      'business_mutation',false,
      'authority_class',j.authority_class
    ),
    authorization_decision=case
      when j.authority_class='GREEN' then 'AUTHORIZED_POLICY'
      else j.authorization_decision
    end,
    blocked_reason=null,
    failure_reason=null,
    finished_at=now(),
    lease_owner=null,
    lease_expires_at=null
  where id=j.id
  returning * into j;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    j.id,'AGENT_ACTION_WORK_ORDER',
    'ugo-test:agent-work-order:'||artifact.id::text,
    jsonb_build_object(
      'agent_key',a.agent_key,
      'action_type',artifact.action_type,
      'execution_channel',artifact.execution_channel,
      'authority_class',j.authority_class,
      'persisted',true,
      'business_mutation',false,
      'production_touched',false
    ),
    j.correlation_id
  )
  on conflict do nothing;

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
    evidence_refs,authorization_result,correlation_id
  ) values(
    j.id,j.department_id,j.agent_id,'AGENT_WORK_ORDER_DISPATCHED',
    'Persisted governed work order dispatched to department execution channel',
    j.authority_class,j.policy_version,
    jsonb_build_array('autonomous_action_artifacts/'||artifact.id::text),
    'AUTHORIZED',j.correlation_id
  );

  return j;
end $$;
revoke all on function public.autonomous_execute_work_order_job(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_execute_work_order_job(uuid) to service_role;

-- Worker now honors completed YELLOW/RED approvals instead of bouncing them
-- back to WAITING_APPROVAL forever, and dispatches agent work orders.
create or replace function public.autonomous_worker_cycle(p_worker text,p_limit integer default 10)
returns table(job_id uuid,status text,reason text)
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  j public.autonomous_jobs%rowtype;
  n integer:=0;
  mode_now text;
  cap public.autonomous_capability_registry%rowtype;
  out_job public.autonomous_jobs%rowtype;
  msg text;
  exec jsonb;
  ver jsonb;
begin
  if nullif(btrim(p_worker),'') is null then raise exception 'WORKER_REQUIRED'; end if;
  if p_limit<1 or p_limit>50 then raise exception 'INVALID_LIMIT'; end if;
  select mode into mode_now from public.autonomous_company_state where singleton=true;
  if mode_now not in('ON','SAFE_MODE') then return; end if;
  perform public.autonomous_recover_stale_jobs();

  while n<p_limit loop
    begin
      select * into j from public.autonomous_claim_job(p_worker) limit 1;
    exception when no_data_found then exit;
    end;
    if j.id is null then exit; end if;
    n:=n+1;

    if j.authority_class='YELLOW'
       and not (j.approval_count>=2 and j.authorization_decision='AUTHORIZED_DUAL_CONTROL')
    then
      update public.autonomous_jobs set status='WAITING_APPROVAL',
        blocked_reason='YELLOW_DUAL_CONTROL_REQUIRED',lease_owner=null,lease_expires_at=null
      where id=j.id;
      job_id:=j.id;status:='WAITING_APPROVAL';reason:='YELLOW_DUAL_CONTROL_REQUIRED';return next;continue;
    end if;
    if j.authority_class='RED'
       and not (j.approval_count>=1 and j.authorization_decision='AUTHORIZED_HUMAN')
    then
      update public.autonomous_jobs set status='WAITING_APPROVAL',
        blocked_reason='RED_HUMAN_APPROVAL_REQUIRED',lease_owner=null,lease_expires_at=null
      where id=j.id;
      job_id:=j.id;status:='WAITING_APPROVAL';reason:='RED_HUMAN_APPROVAL_REQUIRED';return next;continue;
    end if;

    if j.data_quality_status<>'TRUSTED' then
      update public.autonomous_jobs set status='BLOCKED',blocked_reason='DATA_QUALITY_REQUIRED',
        finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
      job_id:=j.id;status:='BLOCKED';reason:='DATA_QUALITY_REQUIRED';return next;continue;
    end if;

    select * into cap from public.autonomous_capability_registry
    where capability_key=j.capability and enabled;
    if cap.capability_key is null
       or cap.department_id<>j.department_id
       or cap.authority_class<>j.authority_class
       or (mode_now='SAFE_MODE' and not cap.safe_mode_allowed)
    then
      update public.autonomous_jobs set status='BLOCKED',blocked_reason='EXECUTOR_CAPABILITY_REQUIRED',
        finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
      job_id:=j.id;status:='BLOCKED';reason:='EXECUTOR_CAPABILITY_REQUIRED';return next;continue;
    end if;

    if j.capability like 'agent.work_order.%' then
      select * into out_job from public.autonomous_execute_work_order_job(j.id);
      job_id:=out_job.id;status:=out_job.status;reason:='WORK_ORDER_DISPATCHED';return next;continue;
    end if;

    if j.capability='qa.green.echo' and j.authority_class='GREEN' then
      msg=coalesce(j.input_evidence->0->>'message',j.input_evidence->>'message');
      if msg is null or length(msg)>500 then
        update public.autonomous_jobs set status='BLOCKED',blocked_reason='INVALID_CAPABILITY_INPUT',
          finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
        job_id:=j.id;status:='BLOCKED';reason:='INVALID_CAPABILITY_INPUT';return next;continue;
      end if;
      exec=jsonb_build_object('message',msg,'executor','qa.green.echo','executed',true);
      ver=jsonb_build_object('passed',true,'kind','exact_echo','message',msg);
      update public.autonomous_jobs set status='SUCCEEDED',result=exec,execution_result=exec,
        verification_result=ver,authorization_decision='AUTHORIZED_POLICY',blocked_reason=null,
        failure_reason=null,finished_at=now(),lease_owner=null,lease_expires_at=null
      where id=j.id;
      insert into public.autonomous_evidence_ledger(
        job_id,evidence_type,reference,evidence_hash,metadata,correlation_id
      ) values(
        j.id,'CAPABILITY_VERIFICATION','autonomous_jobs/'||j.id::text||'/verification',
        encode(digest(ver::text,'sha256'),'hex'),
        jsonb_build_object('capability',j.capability,'verified',true,'policy_version',j.policy_version),
        j.correlation_id
      );
      job_id:=j.id;status:='SUCCEEDED';reason:='VERIFIED';return next;continue;
    end if;

    update public.autonomous_jobs set status='BLOCKED',blocked_reason='EXECUTOR_CAPABILITY_REQUIRED',
      finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
    job_id:=j.id;status:='BLOCKED';reason:='EXECUTOR_CAPABILITY_REQUIRED';return next;
  end loop;
end $$;
revoke all on function public.autonomous_worker_cycle(text,integer) from public,anon,authenticated;
grant execute on function public.autonomous_worker_cycle(text,integer) to service_role;

do $$
declare missing_count integer;
begin
  select count(*) into missing_count
  from public.autonomous_agents a
  where not exists(
    select 1 from public.autonomous_capability_registry c
    where c.capability_key='agent.work_order.'||a.agent_key
      and c.department_id=a.department_id
      and c.authority_class=a.authority_class
      and c.enabled
  );
  if missing_count<>0 then
    raise exception 'AGENT_ACTION_CAPABILITY_INCOMPLETE: % agents missing',missing_count;
  end if;
end $$;
