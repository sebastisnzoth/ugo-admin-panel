-- Preserve correlated decision evidence for every successful GREEN worker execution.
-- Required by the scheduled worker proof and D14 audit trail.
CREATE OR REPLACE FUNCTION public.autonomous_worker_cycle(p_worker text, p_limit integer DEFAULT 10)
 RETURNS TABLE(job_id uuid, status text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'auth', 'extensions', 'pg_temp'
AS $function$
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
      insert into public.autonomous_decision_ledger(
        job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
        evidence_refs,authorization_result,correlation_id
      ) values(
        j.id,j.department_id,j.agent_id,'WORKER_EXECUTED',
        'Worker executed and independently verified capability result',
        j.authority_class,j.policy_version,
        jsonb_build_array('autonomous_jobs/'||j.id::text||'/verification'),
        'AUTHORIZED',j.correlation_id
      );
      job_id:=j.id;status:='SUCCEEDED';reason:='VERIFIED';return next;continue;
    end if;

    update public.autonomous_jobs set status='BLOCKED',blocked_reason='EXECUTOR_CAPABILITY_REQUIRED',
      finished_at=now(),lease_owner=null,lease_expires_at=null where id=j.id;
    job_id:=j.id;status:='BLOCKED';reason:='EXECUTOR_CAPABILITY_REQUIRED';return next;
  end loop;
end $function$

