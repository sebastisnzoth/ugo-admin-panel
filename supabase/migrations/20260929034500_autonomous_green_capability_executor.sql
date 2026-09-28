-- Governed allowlisted GREEN executor. TEST-first; no arbitrary SQL/shell/URL execution.
create table if not exists public.autonomous_capability_registry(
 capability_key text primary key,
 department_id integer not null references public.autonomous_departments(department_id),
 authority_class text not null check(authority_class in('GREEN','YELLOW','RED')),
 executor_kind text not null check(executor_kind='DETERMINISTIC'),
 safe_mode_allowed boolean not null default false,
 enabled boolean not null default true,
 input_schema jsonb not null default '{}'::jsonb,
 verification_policy jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.autonomous_capability_registry enable row level security;
revoke all on public.autonomous_capability_registry from public,anon;
grant select on public.autonomous_capability_registry to authenticated,service_role;
insert into public.autonomous_capability_registry(capability_key,department_id,authority_class,executor_kind,safe_mode_allowed,input_schema,verification_policy)
values('qa.green.echo',9,'GREEN','DETERMINISTIC',true,'{"required":["message"],"maxMessageLength":500}'::jsonb,'{"kind":"exact_echo"}'::jsonb)
on conflict(capability_key) do update set department_id=excluded.department_id,authority_class=excluded.authority_class,executor_kind=excluded.executor_kind,safe_mode_allowed=excluded.safe_mode_allowed,input_schema=excluded.input_schema,verification_policy=excluded.verification_policy,enabled=true,updated_at=now();

create or replace function public.autonomous_worker_cycle(p_worker text,p_limit integer default 10)
returns table(job_id uuid,status text,reason text) language plpgsql security definer set search_path=public,private,auth as $$
declare j public.autonomous_jobs%rowtype;n integer:=0;mode_now text;cap public.autonomous_capability_registry%rowtype;msg text;exec jsonb;ver jsonb;
begin
 if nullif(btrim(p_worker),'') is null then raise exception 'WORKER_REQUIRED';end if;
 if p_limit<1 or p_limit>50 then raise exception 'INVALID_LIMIT';end if;
 select mode into mode_now from public.autonomous_company_state where singleton=true;
 if mode_now not in('ON','SAFE_MODE')then return;end if;
 perform public.autonomous_recover_stale_jobs();
 while n<p_limit loop
   begin select * into j from public.autonomous_claim_job(p_worker) limit 1;exception when no_data_found then exit;end;
   if j.id is null then exit;end if;n:=n+1;
   if j.authority_class<>'GREEN' then
     update public.autonomous_jobs set status='WAITING_APPROVAL',blocked_reason=case when j.authority_class='RED'then'RED_HUMAN_APPROVAL_REQUIRED'else'YELLOW_DUAL_CONTROL_REQUIRED'end,lease_owner=null,lease_expires_at=null where id=j.id;
     insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)values(j.id,j.department_id,j.agent_id,'WORKER_AUTHORITY_BLOCKED','Human approval required',j.authority_class,coalesce(j.policy_version,'AUTONOMOUS_CORP_V1'),'DENIED',j.correlation_id);
     job_id:=j.id;status:='WAITING_APPROVAL';reason:='HUMAN_APPROVAL_REQUIRED';return next;continue;
   end if;
   if j.data_quality_status<>'TRUSTED' then
     update public.autonomous_jobs set status='BLOCKED',blocked_reason='DATA_QUALITY_REQUIRED',finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
     insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)values(j.id,j.department_id,j.agent_id,'WORKER_BLOCKED','DATA_QUALITY_REQUIRED',j.authority_class,coalesce(j.policy_version,'AUTONOMOUS_CORP_V1'),'DENIED',j.correlation_id);
     job_id:=j.id;status:='BLOCKED';reason:='DATA_QUALITY_REQUIRED';return next;continue;
   end if;
   select * into cap from public.autonomous_capability_registry where capability_key=j.capability and enabled;
   if cap.capability_key is null or cap.authority_class<>'GREEN' or cap.department_id<>j.department_id or(mode_now='SAFE_MODE' and not cap.safe_mode_allowed)then
     update public.autonomous_jobs set status='BLOCKED',blocked_reason='EXECUTOR_CAPABILITY_REQUIRED',finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
     insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)values(j.id,j.department_id,j.agent_id,'WORKER_DISPATCH_DENIED','Capability not allowlisted for this job/mode',j.authority_class,coalesce(j.policy_version,'AUTONOMOUS_CORP_V1'),'DENIED',j.correlation_id);
     job_id:=j.id;status:='BLOCKED';reason:='EXECUTOR_CAPABILITY_REQUIRED';return next;continue;
   end if;
   if j.capability='qa.green.echo' then
     msg=coalesce(j.input_evidence->0->>'message',j.input_evidence->>'message');
     if msg is null or length(msg)>500 then
       update public.autonomous_jobs set status='BLOCKED',blocked_reason='INVALID_CAPABILITY_INPUT',finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
       job_id:=j.id;status:='BLOCKED';reason:='INVALID_CAPABILITY_INPUT';return next;continue;
     end if;
     exec=jsonb_build_object('message',msg,'executor','qa.green.echo','executed',true);
     ver=jsonb_build_object('passed',true,'kind','exact_echo','message',msg);
     update public.autonomous_jobs set status='SUCCEEDED',result=exec,execution_result=exec,verification_result=ver,authorization_decision='AUTHORIZED_POLICY',blocked_reason=null,failure_reason=null,finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
     insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)values(j.id,'CAPABILITY_VERIFICATION','autonomous_jobs/'||j.id::text||'/verification',encode(digest(ver::text,'sha256'),'hex'),jsonb_build_object('capability',j.capability,'verified',true,'policy_version',j.policy_version),j.correlation_id);
     insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,evidence_refs,authorization_result,correlation_id)values(j.id,j.department_id,j.agent_id,'WORKER_EXECUTED','Allowlisted deterministic GREEN capability verified',j.authority_class,coalesce(j.policy_version,'AUTONOMOUS_CORP_V1'),jsonb_build_array('autonomous_jobs/'||j.id::text||'/verification'),'AUTHORIZED',j.correlation_id);
     job_id:=j.id;status:='SUCCEEDED';reason:='VERIFIED';return next;
   end if;
 end loop;
end$$;
revoke all on function public.autonomous_worker_cycle(text,integer) from public;
grant execute on function public.autonomous_worker_cycle(text,integer) to service_role;
grant select on public.autonomous_jobs,public.autonomous_decision_ledger,public.autonomous_evidence_ledger,public.autonomous_kill_switches,public.autonomous_capability_registry to service_role;
