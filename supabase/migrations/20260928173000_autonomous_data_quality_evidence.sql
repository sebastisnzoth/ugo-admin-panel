-- Governed Data Quality evidence: freshness, provenance, completeness, consistency and reconciliation.
alter table public.autonomous_jobs add column if not exists data_quality_assessment jsonb not null default '{}'::jsonb;

create or replace function public.autonomous_assess_data_quality(p_job_id uuid,p_freshness boolean,p_provenance boolean,p_completeness boolean,p_consistency boolean,p_reason text,p_independent_reconciliation boolean default false,p_evidence_refs jsonb default '[]'::jsonb)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$
declare v public.autonomous_jobs%rowtype;ok boolean;high_risk boolean;assessment jsonb;begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select * into v from public.autonomous_jobs where id=p_job_id for update;if v.id is null then raise exception 'JOB_NOT_FOUND';end if;
 high_risk:=v.authority_class in('YELLOW','RED');ok:=p_freshness and p_provenance and p_completeness and p_consistency and(not high_risk or p_independent_reconciliation);
 assessment:=jsonb_build_object('freshness',p_freshness,'provenance',p_provenance,'completeness',p_completeness,'consistency',p_consistency,'independent_reconciliation',p_independent_reconciliation,'reason',btrim(p_reason),'assessed_at',now());
 update public.autonomous_jobs set data_quality_status=case when ok then'TRUSTED'else'DATA_UNTRUSTED'end,data_quality_assessment=assessment,status=case when ok then status else'BLOCKED'end,block_reason=case when ok then block_reason else'DATA_UNTRUSTED: '||coalesce(nullif(btrim(p_reason),''),'quality gate failed')end,finished_at=case when ok then finished_at else now()end where id=p_job_id returning * into v;
 insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id,created_by)values(v.id,'DATA_QUALITY_ASSESSMENT','autonomous_jobs/'||v.id::text||'/data-quality',encode(digest(assessment::text,'sha256'),'hex'),jsonb_build_object('assessment',assessment,'evidence_refs',coalesce(p_evidence_refs,'[]'::jsonb)),v.correlation_id,auth.uid());
 return v;end$$;
revoke all on function public.autonomous_assess_data_quality(uuid,boolean,boolean,boolean,boolean,text,boolean,jsonb) from public;grant execute on function public.autonomous_assess_data_quality(uuid,boolean,boolean,boolean,boolean,text,boolean,jsonb) to authenticated;

-- Keep legacy setter conservative: it cannot bypass the four-factor gate.
create or replace function public.autonomous_set_data_quality(p_job_id uuid,p_trusted boolean,p_reason text)
returns public.autonomous_jobs language plpgsql security definer set search_path=public,private,auth as $$begin
 if p_trusted then raise exception 'USE_AUTONOMOUS_ASSESS_DATA_QUALITY';end if;
 return public.autonomous_assess_data_quality(p_job_id,false,false,false,false,p_reason,false,'[]'::jsonb);end$$;