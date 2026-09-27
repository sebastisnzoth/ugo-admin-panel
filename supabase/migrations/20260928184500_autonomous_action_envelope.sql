-- Master action envelope: every autonomous action remains traceable end-to-end.
alter table public.autonomous_jobs add column if not exists action_id uuid not null default gen_random_uuid();
alter table public.autonomous_jobs add column if not exists policy_version text not null default 'AUTONOMOUS_CORP_V1';
alter table public.autonomous_jobs add column if not exists model_provider text;
alter table public.autonomous_jobs add column if not exists model_id text;
alter table public.autonomous_jobs add column if not exists estimated_cost numeric(14,6) not null default 0 check(estimated_cost>=0);
alter table public.autonomous_jobs add column if not exists actual_cost numeric(14,6) not null default 0 check(actual_cost>=0);
alter table public.autonomous_jobs add column if not exists authorization_decision text;
alter table public.autonomous_jobs add column if not exists execution_result jsonb not null default '{}'::jsonb;
alter table public.autonomous_jobs add column if not exists verification_result jsonb not null default '{}'::jsonb;
create unique index if not exists autonomous_jobs_action_id_uidx on public.autonomous_jobs(action_id);

create or replace function public.autonomous_record_verification(p_job_id uuid,p_verification jsonb,p_actual_cost numeric default 0,p_model_provider text default null,p_model_id text default null)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 if p_actual_cost<0 then raise exception 'INVALID_COST';end if;
 update public.autonomous_jobs set verification_result=coalesce(p_verification,'{}'::jsonb),actual_cost=p_actual_cost,model_provider=coalesce(nullif(btrim(p_model_provider),''),model_provider),model_id=coalesce(nullif(btrim(p_model_id),''),model_id) where id=p_job_id returning * into v;
 if v.id is null then raise exception 'JOB_NOT_FOUND';end if;
 insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id,created_by)values(v.id,'ACTION_VERIFICATION','autonomous_jobs/'||v.id::text||'/verification',encode(digest(coalesce(p_verification,'{}'::jsonb)::text,'sha256'),'hex'),jsonb_build_object('action_id',v.action_id,'policy_version',v.policy_version,'model_provider',v.model_provider,'model_id',v.model_id,'actual_cost',v.actual_cost),v.correlation_id,auth.uid());
 return v;end$$;
revoke all on function public.autonomous_record_verification(uuid,jsonb,numeric,text,text) from public;grant execute on function public.autonomous_record_verification(uuid,jsonb,numeric,text,text) to authenticated;