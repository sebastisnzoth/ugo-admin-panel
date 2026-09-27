-- Safe autonomous job lifecycle and data-quality gate for UGO TEST/production parity.
alter table public.autonomous_jobs add column if not exists data_quality_status text not null default 'PENDING' check(data_quality_status in('PENDING','TRUSTED','DATA_UNTRUSTED'));
alter table public.autonomous_jobs add column if not exists lease_owner text;
alter table public.autonomous_jobs add column if not exists lease_expires_at timestamptz;
alter table public.autonomous_jobs add column if not exists attempt_count integer not null default 0 check(attempt_count>=0);

create or replace function public.autonomous_claim_job(p_worker text,p_lease_seconds integer default 120)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype; m text;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 select mode into m from public.autonomous_company_state where singleton=true;
 if m<>'ON' then raise exception 'AUTONOMY_NOT_EXECUTABLE' using errcode='P0001'; end if;
 select * into v from public.autonomous_jobs j where j.status='QUEUED'
 and not exists(select 1 from public.autonomous_kill_switches k where k.enabled and (k.scope_type='GLOBAL' or (k.scope_type='DEPARTMENT' and k.scope_key=j.department_id::text) or (k.scope_type='AGENT' and k.scope_key=j.agent_id::text)))
 order by j.created_at for update skip locked limit 1;
 if v.id is null then return null; end if;
 update public.autonomous_jobs set status='RUNNING',started_at=coalesce(started_at,now()),lease_owner=btrim(p_worker),lease_expires_at=now()+make_interval(secs=>greatest(30,least(p_lease_seconds,900))),attempt_count=attempt_count+1 where id=v.id returning * into v;
 return v;
end $$;

create or replace function public.autonomous_set_data_quality(p_job_id uuid,p_trusted boolean,p_reason text)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 update public.autonomous_jobs set data_quality_status=case when p_trusted then 'TRUSTED' else 'DATA_UNTRUSTED' end,
 block_reason=case when p_trusted then block_reason else 'DATA_UNTRUSTED: '||btrim(p_reason) end,
 status=case when p_trusted then status else 'BLOCKED' end,finished_at=case when p_trusted then finished_at else now() end
 where id=p_job_id returning * into v;
 if v.id is null then raise exception 'JOB_NOT_FOUND'; end if; return v;
end $$;

create or replace function public.autonomous_complete_job(p_job_id uuid,p_worker text,p_result jsonb,p_evidence_refs jsonb default '[]'::jsonb)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501'; end if;
 select * into v from public.autonomous_jobs where id=p_job_id for update;
 if v.id is null then raise exception 'JOB_NOT_FOUND'; end if;
 if v.status<>'RUNNING' or v.lease_owner is distinct from btrim(p_worker) or v.lease_expires_at<now() then raise exception 'INVALID_JOB_LEASE'; end if;
 if v.data_quality_status<>'TRUSTED' then raise exception 'DATA_UNTRUSTED'; end if;
 update public.autonomous_jobs set status='SUCCEEDED',result=coalesce(p_result,'{}'),evidence_refs=coalesce(p_evidence_refs,'[]'),finished_at=now(),lease_owner=null,lease_expires_at=null where id=p_job_id returning * into v;
 return v;
end $$;

revoke all on function public.autonomous_claim_job(text,integer) from public;
revoke all on function public.autonomous_set_data_quality(uuid,boolean,text) from public;
revoke all on function public.autonomous_complete_job(uuid,text,jsonb,jsonb) from public;
grant execute on function public.autonomous_claim_job(text,integer) to authenticated;
grant execute on function public.autonomous_set_data_quality(uuid,boolean,text) to authenticated;
grant execute on function public.autonomous_complete_job(uuid,text,jsonb,jsonb) to authenticated;
