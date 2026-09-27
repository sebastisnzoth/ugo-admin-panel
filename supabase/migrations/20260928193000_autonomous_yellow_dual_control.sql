-- YELLOW authority requires independent dual control before execution.
alter table public.autonomous_jobs add column if not exists approval_count integer not null default 0 check(approval_count>=0);
alter table public.autonomous_jobs add column if not exists first_approved_by uuid;
alter table public.autonomous_jobs add column if not exists first_approved_at timestamptz;

create or replace function public.superadmin_decide_autonomous_job(p_job_id uuid,p_approve boolean,p_reason text)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;m text;actor uuid:=auth.uid();begin
 if actor is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'AUDIT_REASON_REQUIRED';end if;
 select * into v from public.autonomous_jobs where id=p_job_id for update;if v.id is null then raise exception 'JOB_NOT_FOUND';end if;
 if v.status<>'WAITING_APPROVAL' then raise exception 'JOB_NOT_WAITING_APPROVAL';end if;
 select mode into m from public.autonomous_company_state where singleton=true;if p_approve and m<>'ON' then raise exception 'AUTONOMY_NOT_EXECUTABLE';end if;
 if not p_approve then
  update public.autonomous_jobs set status='CANCELLED',block_reason='REJECTED: '||btrim(p_reason),authorization_decision='DENIED',finished_at=now() where id=v.id returning * into v;
 elsif v.authority_class='YELLOW' and v.approval_count=0 then
  update public.autonomous_jobs set approval_count=1,first_approved_by=actor,first_approved_at=now(),authorization_decision='DUAL_CONTROL_PENDING',block_reason='YELLOW_SECOND_APPROVAL_REQUIRED' where id=v.id returning * into v;
 elsif v.authority_class='YELLOW' and v.approval_count=1 then
  if v.first_approved_by=actor then raise exception 'INDEPENDENT_SECOND_APPROVER_REQUIRED';end if;
  update public.autonomous_jobs set approval_count=2,status='QUEUED',block_reason=null,authorization_decision='AUTHORIZED_DUAL_CONTROL',finished_at=null where id=v.id returning * into v;
 else
  update public.autonomous_jobs set approval_count=greatest(v.approval_count,1),status='QUEUED',block_reason=null,authorization_decision='AUTHORIZED_HUMAN',finished_at=null where id=v.id returning * into v;
 end if;
 insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)
 values(v.id,v.department_id,v.agent_id,case when not p_approve then'HUMAN_REJECTED' when v.authority_class='YELLOW' and v.approval_count=1 then'YELLOW_FIRST_APPROVAL' when v.authority_class='YELLOW' then'YELLOW_SECOND_APPROVAL' else'HUMAN_APPROVED'end,btrim(p_reason),v.authority_class,coalesce(v.policy_version,'AUTONOMOUS_CORP_V1'),case when not p_approve then'DENIED' when v.authority_class='YELLOW' and v.approval_count=1 then'PENDING_DUAL_CONTROL' else'AUTHORIZED'end,v.correlation_id);
 return v;end$$;
revoke all on function public.superadmin_decide_autonomous_job(uuid,boolean,text) from public;grant execute on function public.superadmin_decide_autonomous_job(uuid,boolean,text) to authenticated;