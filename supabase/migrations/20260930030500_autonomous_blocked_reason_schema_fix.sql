-- Repair legacy autonomous resilience functions after the jobs schema standardized on blocked_reason.
-- Intentionally does not replace autonomous_set_data_quality: that function has a newer
-- assessment-backed implementation in later migrations.
-- Runtime verification for this readiness batch is executed exclusively against UGO TEST.

create or replace function public.autonomous_fail_job(p_job_id uuid,p_worker text,p_reason text,p_retry_delay_seconds integer default 30)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select * into v from public.autonomous_jobs where id=p_job_id for update;
 if v.id is null then raise exception 'JOB_NOT_FOUND';end if;
 if v.status<>'RUNNING' or v.lease_owner is distinct from btrim(p_worker) then raise exception 'INVALID_JOB_LEASE';end if;
 update public.autonomous_jobs set
   status=case when attempt_count>=max_attempts then 'BLOCKED' else 'QUEUED' end,
   failure_reason=btrim(p_reason),
   blocked_reason=case when attempt_count>=max_attempts then 'DEAD_LETTER: '||btrim(p_reason) else blocked_reason end,
   next_attempt_at=case when attempt_count>=max_attempts then null else now()+make_interval(secs=>greatest(0,least(p_retry_delay_seconds,86400))) end,
   lease_owner=null,lease_expires_at=null,
   finished_at=case when attempt_count>=max_attempts then now() else null end
 where id=p_job_id returning * into v;
 return v;
end $$;

create or replace function public.autonomous_recover_stale_jobs()
returns integer language plpgsql security definer set search_path=public,private,auth as $$
declare n integer;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 update public.autonomous_jobs set
   status=case when attempt_count>=max_attempts then 'BLOCKED' else 'QUEUED' end,
   failure_reason='LEASE_TIMEOUT',
   blocked_reason=case when attempt_count>=max_attempts then 'DEAD_LETTER: LEASE_TIMEOUT' else blocked_reason end,
   next_attempt_at=case when attempt_count>=max_attempts then null else now() end,
   lease_owner=null,lease_expires_at=null,
   finished_at=case when attempt_count>=max_attempts then now() else null end
 where status='RUNNING' and lease_expires_at<now();
 get diagnostics n=row_count;
 return n;
end $$;

revoke all on function public.autonomous_fail_job(uuid,text,text,integer) from public,anon;
revoke all on function public.autonomous_recover_stale_jobs() from public,anon;
grant execute on function public.autonomous_fail_job(uuid,text,text,integer) to authenticated;
grant execute on function public.autonomous_recover_stale_jobs() to authenticated;
