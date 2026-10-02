-- Make SAFE_MODE executable end-to-end.
-- autonomous_worker_cycle already supports SAFE_MODE and rejects capabilities that are not safe_mode_allowed.
-- autonomous_claim_job must therefore allow SAFE_MODE while only claiming explicitly safe capabilities.

create or replace function public.autonomous_claim_job(
  p_worker text,
  p_lease_seconds integer default 120
) returns public.autonomous_jobs
language plpgsql
security definer
set search_path to 'public','private','auth'
as $function$
declare
  v public.autonomous_jobs%rowtype;
  m text;
  is_service boolean;
begin
  is_service:=coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role'='service_role';
  if not is_service and (auth.uid() is null or not private.is_superadmin()) then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;
  if nullif(btrim(p_worker),'') is null then raise exception 'WORKER_REQUIRED'; end if;

  select mode into m from public.autonomous_company_state where singleton=true;
  if m not in ('ON','SAFE_MODE') then raise exception 'AUTONOMY_NOT_EXECUTABLE'; end if;

  select * into v
  from public.autonomous_jobs j
  where j.status='QUEUED'
    and coalesce(j.next_attempt_at,'epoch'::timestamptz)<=now()
    and j.attempt_count<j.max_attempts
    and (
      m='ON'
      or exists(
        select 1
        from public.autonomous_capability_registry c
        where c.capability_key=j.capability
          and c.enabled
          and c.safe_mode_allowed
          and c.department_id=j.department_id
          and c.authority_class=j.authority_class
      )
    )
    and not exists(
      select 1 from public.autonomous_kill_switches k
      where k.enabled
        and (
          k.scope_type='GLOBAL'
          or (k.scope_type='DEPARTMENT' and k.scope_key=j.department_id::text)
          or (k.scope_type='AGENT' and k.scope_key=j.agent_id::text)
          or (k.scope_type='CAPABILITY' and k.scope_key=coalesce(j.capability,''))
        )
    )
  order by j.created_at
  for update skip locked
  limit 1;

  if v.id is null then return null; end if;

  update public.autonomous_jobs
  set status='RUNNING',
      started_at=coalesce(started_at,now()),
      lease_owner=btrim(p_worker),
      lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))),
      attempt_count=attempt_count+1,
      failure_reason=null
  where id=v.id
  returning * into v;

  return v;
end
$function$;

revoke all on function public.autonomous_claim_job(text,integer) from public,anon,authenticated;
grant execute on function public.autonomous_claim_job(text,integer) to service_role;
