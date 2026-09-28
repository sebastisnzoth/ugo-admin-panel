-- Browser-independent worker cycle primitive. Scheduler/external worker may invoke this; authority remains deterministic.
create or replace function public.autonomous_worker_cycle(p_worker text,p_limit integer default 10)
returns table(job_id uuid,status text,reason text) language plpgsql security definer set search_path=public,private,auth as $$
declare j public.autonomous_jobs%rowtype;n integer:=0;mode_now text;begin
 if nullif(btrim(p_worker),'') is null then raise exception 'WORKER_REQUIRED';end if;
 if p_limit<1 or p_limit>50 then raise exception 'INVALID_LIMIT';end if;
 select mode into mode_now from public.autonomous_company_state where singleton=true;
 if mode_now not in('ON','SAFE_MODE')then return;end if;
 perform public.autonomous_recover_stale_jobs();
 while n<p_limit loop
   begin select * into j from public.autonomous_claim_job(p_worker) limit 1;exception when no_data_found then exit;end;
   if j.id is null then exit;end if;n:=n+1;
   if j.data_quality_status<>'TRUSTED' then
     update public.autonomous_jobs set status='BLOCKED',blocked_reason='DATA_QUALITY_REQUIRED',finished_at=now() where id=j.id;
     insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)values(j.id,j.department_id,j.agent_id,'WORKER_BLOCKED','DATA_QUALITY_REQUIRED',j.authority_class,coalesce(j.policy_version,'AUTONOMOUS_CORP_V1'),'DENIED',j.correlation_id);
     job_id:=j.id;status:='BLOCKED';reason:='DATA_QUALITY_REQUIRED';return next;continue;
   end if;
   update public.autonomous_jobs set status='BLOCKED',blocked_reason='EXECUTOR_CAPABILITY_REQUIRED',finished_at=now() where id=j.id;
   insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,policy_version,authorization_result,correlation_id)values(j.id,j.department_id,j.agent_id,'WORKER_DISPATCH_REQUIRED','No registered deterministic capability executor',j.authority_class,coalesce(j.policy_version,'AUTONOMOUS_CORP_V1'),'NOT_EXECUTED',j.correlation_id);
   job_id:=j.id;status:='BLOCKED';reason:='EXECUTOR_CAPABILITY_REQUIRED';return next;
 end loop;end$$;
revoke all on function public.autonomous_worker_cycle(text,integer) from public;
grant execute on function public.autonomous_worker_cycle(text,integer) to service_role;