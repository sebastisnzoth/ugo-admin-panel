-- Make autonomous kill-switch containment fail closed before global mode evaluation.
-- This preserves the current enqueue contract while making a scoped containment
-- independently observable in UGO TEST, even when the company is globally OFF.

create or replace function public.autonomous_enqueue_job(
  p_department_id integer,
  p_agent_id uuid,
  p_objective text,
  p_trigger_type text,
  p_target_type text,
  p_target_id text,
  p_service_id uuid,
  p_authority_class text,
  p_idempotency_key text,
  p_input_evidence jsonb default '[]'::jsonb
)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth
as $$
declare
  v public.autonomous_jobs%rowtype;
  m text;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;

  if exists(
    select 1
    from public.autonomous_kill_switches
    where enabled
      and (
        scope_type='GLOBAL'
        or (scope_type='DEPARTMENT' and scope_key=p_department_id::text)
        or (scope_type='AGENT' and scope_key=coalesce(p_agent_id::text,''))
      )
  ) then
    raise exception 'AUTONOMY_KILL_SWITCH_ACTIVE' using errcode='P0001';
  end if;

  select mode into m
  from public.autonomous_company_state
  where singleton=true;

  if m='OFF' then
    raise exception 'AUTONOMY_NOT_EXECUTABLE' using errcode='P0001';
  end if;

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
    authority_class,status,idempotency_key,input_evidence,created_by,
    authorization_decision,blocked_reason
  )
  values(
    p_department_id,p_agent_id,btrim(p_objective),p_trigger_type,p_target_type,p_target_id,p_service_id,
    p_authority_class,
    case when p_authority_class in('YELLOW','RED') then 'WAITING_APPROVAL'
         when m='SHADOW' then 'SHADOW'
         else 'QUEUED' end,
    p_idempotency_key,coalesce(p_input_evidence,'[]'::jsonb),auth.uid(),
    case when p_authority_class='GREEN' then 'AUTHORIZED_POLICY' else 'PENDING_HUMAN' end,
    case when p_authority_class='YELLOW' then 'YELLOW_DUAL_CONTROL_REQUIRED'
         when p_authority_class='RED' then 'RED_HUMAN_APPROVAL_REQUIRED'
         else null end
  )
  on conflict(idempotency_key)
  do update set idempotency_key=excluded.idempotency_key
  returning * into v;

  return v;
end
$$;

revoke all on function public.autonomous_enqueue_job(integer,uuid,text,text,text,text,uuid,text,text,jsonb) from public,anon;
grant execute on function public.autonomous_enqueue_job(integer,uuid,text,text,text,text,uuid,text,text,jsonb) to authenticated;
