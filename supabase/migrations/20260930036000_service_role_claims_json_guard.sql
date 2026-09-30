-- PostgREST 14 exposes JWT role in request.jwt.claims JSON.
-- Keep autonomous worker primitives callable by trusted service_role workers only,
-- while authenticated user calls still require private.is_superadmin().

create or replace function public.autonomous_claim_job(
  p_worker text,
  p_lease_seconds integer default 120
)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth
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
  if m<>'ON' then raise exception 'AUTONOMY_NOT_EXECUTABLE'; end if;

  select * into v
  from public.autonomous_jobs j
  where j.status='QUEUED'
    and coalesce(j.next_attempt_at,'epoch'::timestamptz)<=now()
    and j.attempt_count<j.max_attempts
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

create or replace function public.autonomous_recover_stale_jobs()
returns integer
language plpgsql
security definer
set search_path=public,private,auth
as $function$
declare
  n integer;
  is_service boolean;
begin
  is_service:=coalesce(current_setting('request.jwt.claims',true),'{}')::jsonb->>'role'='service_role';
  if not is_service and (auth.uid() is null or not private.is_superadmin()) then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;

  update public.autonomous_jobs
  set status=case when attempt_count>=max_attempts then 'BLOCKED' else 'QUEUED' end,
      failure_reason='LEASE_TIMEOUT',
      blocked_reason=case when attempt_count>=max_attempts then 'DEAD_LETTER: LEASE_TIMEOUT' else blocked_reason end,
      next_attempt_at=case when attempt_count>=max_attempts then null else now() end,
      lease_owner=null,
      lease_expires_at=null,
      finished_at=case when attempt_count>=max_attempts then now() else null end
  where status='RUNNING'
    and lease_expires_at<now();

  get diagnostics n=row_count;
  return n;
end
$function$;

revoke all on function public.autonomous_claim_job(text,integer) from public,anon;
revoke all on function public.autonomous_recover_stale_jobs() from public,anon;
grant execute on function public.autonomous_claim_job(text,integer) to authenticated,service_role;
grant execute on function public.autonomous_recover_stale_jobs() to authenticated,service_role;
notify pgrst, 'reload schema';
