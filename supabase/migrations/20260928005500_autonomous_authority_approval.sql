-- Deterministic authority approval/rejection. RED work never self-approves.
create or replace function public.superadmin_decide_autonomous_job(p_job_id uuid,p_approve boolean,p_reason text)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype; m text;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 if nullif(btrim(p_reason),'') is null then raise exception 'AUDIT_REASON_REQUIRED'; end if;
 select * into v from public.autonomous_jobs where id=p_job_id for update;
 if v.id is null then raise exception 'JOB_NOT_FOUND'; end if;
 if v.status<>'WAITING_APPROVAL' then raise exception 'JOB_NOT_WAITING_APPROVAL'; end if;
 select mode into m from public.autonomous_company_state where singleton=true;
 if p_approve and m<>'ON' then raise exception 'AUTONOMY_NOT_EXECUTABLE'; end if;
 update public.autonomous_jobs set
   status=case when p_approve then 'QUEUED' else 'CANCELLED' end,
   block_reason=case when p_approve then null else 'REJECTED: '||btrim(p_reason) end,
   finished_at=case when p_approve then null else now() end
 where id=p_job_id returning * into v;
 insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)
 values(v.id,v.department_id,v.agent_id,case when p_approve then 'HUMAN_APPROVED' else 'HUMAN_REJECTED' end,btrim(p_reason),v.authority_class,
   coalesce((select policy_version from public.autonomous_company_state where singleton=true),'AUTONOMOUS_CORP_V1'),
   case when p_approve then 'AUTHORIZED' else 'DENIED' end,v.correlation_id);
 return v;
end $$;
revoke all on function public.superadmin_decide_autonomous_job(uuid,boolean,text) from public;
grant execute on function public.superadmin_decide_autonomous_job(uuid,boolean,text) to authenticated;
