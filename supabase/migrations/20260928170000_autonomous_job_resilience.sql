-- Complete governed job resilience: capability containment, heartbeat, retry, stale recovery and cancellation.
alter table public.autonomous_jobs add column if not exists max_attempts integer not null default 3 check(max_attempts between 1 and 20);
alter table public.autonomous_jobs add column if not exists failure_reason text;
alter table public.autonomous_jobs add column if not exists next_attempt_at timestamptz;
alter table public.autonomous_jobs add column if not exists capability text;

create or replace function public.autonomous_claim_job(p_worker text,p_lease_seconds integer default 120)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;m text;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 if nullif(btrim(p_worker),'') is null then raise exception 'WORKER_REQUIRED';end if;
 select mode into m from public.autonomous_company_state where singleton=true;if m<>'ON' then raise exception 'AUTONOMY_NOT_EXECUTABLE';end if;
 select * into v from public.autonomous_jobs j where j.status='QUEUED' and coalesce(j.next_attempt_at,'epoch'::timestamptz)<=now() and j.attempt_count<j.max_attempts
 and not exists(select 1 from public.autonomous_kill_switches k where k.enabled and(k.scope_type='GLOBAL'or(k.scope_type='DEPARTMENT'and k.scope_key=j.department_id::text)or(k.scope_type='AGENT'and k.scope_key=j.agent_id::text)or(k.scope_type='CAPABILITY'and k.scope_key=coalesce(j.capability,''))))
 order by j.created_at for update skip locked limit 1;
 if v.id is null then return null;end if;
 update public.autonomous_jobs set status='RUNNING',started_at=coalesce(started_at,now()),lease_owner=btrim(p_worker),lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))),attempt_count=attempt_count+1,failure_reason=null where id=v.id returning * into v;return v;
end$$;

create or replace function public.autonomous_renew_lease(p_job_id uuid,p_worker text,p_lease_seconds integer default 120)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 update public.autonomous_jobs set lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))) where id=p_job_id and status='RUNNING' and lease_owner=btrim(p_worker) and lease_expires_at>=now() returning * into v;
 if v.id is null then raise exception 'INVALID_JOB_LEASE';end if;return v;end$$;

create or replace function public.autonomous_fail_job(p_job_id uuid,p_worker text,p_reason text,p_retry_delay_seconds integer default 30)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select * into v from public.autonomous_jobs where id=p_job_id for update;
 if v.id is null then raise exception 'JOB_NOT_FOUND';end if;if v.status<>'RUNNING'or v.lease_owner is distinct from btrim(p_worker) then raise exception 'INVALID_JOB_LEASE';end if;
 update public.autonomous_jobs set status=case when attempt_count>=max_attempts then'BLOCKED'else'QUEUED'end,failure_reason=btrim(p_reason),block_reason=case when attempt_count>=max_attempts then'DEAD_LETTER: '||btrim(p_reason)else block_reason end,next_attempt_at=case when attempt_count>=max_attempts then null else now()+make_interval(secs=>greatest(0,least(p_retry_delay_seconds,86400)))end,lease_owner=null,lease_expires_at=null,finished_at=case when attempt_count>=max_attempts then now()else null end where id=p_job_id returning * into v;return v;end$$;

create or replace function public.autonomous_recover_stale_jobs()
returns integer language plpgsql security definer set search_path=public,private,auth as $$
declare n integer;begin if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 update public.autonomous_jobs set status=case when attempt_count>=max_attempts then'BLOCKED'else'QUEUED'end,failure_reason='LEASE_TIMEOUT',block_reason=case when attempt_count>=max_attempts then'DEAD_LETTER: LEASE_TIMEOUT'else block_reason end,next_attempt_at=case when attempt_count>=max_attempts then null else now()end,lease_owner=null,lease_expires_at=null,finished_at=case when attempt_count>=max_attempts then now()else null end where status='RUNNING'and lease_expires_at<now();get diagnostics n=row_count;return n;end$$;

create or replace function public.superadmin_cancel_autonomous_job(p_job_id uuid,p_reason text)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;begin if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;if nullif(btrim(p_reason),'')is null then raise exception 'REASON_REQUIRED';end if;
 update public.autonomous_jobs set status='CANCELLED',failure_reason='CANCELLED: '||btrim(p_reason),finished_at=now(),lease_owner=null,lease_expires_at=null where id=p_job_id and status in('QUEUED','RUNNING','WAITING_APPROVAL','BLOCKED') returning * into v;if v.id is null then raise exception 'JOB_NOT_CANCELLABLE';end if;return v;end$$;

revoke all on function public.autonomous_renew_lease(uuid,text,integer) from public;revoke all on function public.autonomous_fail_job(uuid,text,text,integer) from public;revoke all on function public.autonomous_recover_stale_jobs() from public;revoke all on function public.superadmin_cancel_autonomous_job(uuid,text) from public;
grant execute on function public.autonomous_renew_lease(uuid,text,integer) to authenticated;grant execute on function public.autonomous_fail_job(uuid,text,text,integer) to authenticated;grant execute on function public.autonomous_recover_stale_jobs() to authenticated;grant execute on function public.superadmin_cancel_autonomous_job(uuid,text) to authenticated;