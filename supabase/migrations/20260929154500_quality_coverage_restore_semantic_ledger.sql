-- Restore auditable semantic ledgers dropped by the independent evidence reconciler.
-- Preserve fail-closed physical/human gates while allowing only independently judged runtime coverage.
create or replace function public.autonomous_reconcile_quality_coverage()
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare agent public.autonomous_agents%rowtype; job public.autonomous_jobs%rowtype; snapshot jsonb;
 promotable text[]:=array['provider-radius','payments','service-lifecycle'];
 independent text[]:=array['gps-geofence','roles','permissions-rls','realtime'];
 protected text[]:=array['physical-gps-device','uploaded-media-bytes','real-customer-acceptance'];
 verified_count integer; uncovered_count integer;
begin
 select * into agent from public.autonomous_agents where agent_key='quality-coverage-agent' and department_id=9 and status='IDLE';
 if agent.id is null then raise exception 'QUALITY_COVERAGE_AGENT_NOT_ENABLED';end if;
 update public.autonomous_quality_coverage c set status='COVERED',updated_at=now()
 where c.coverage_key=any(promotable) and exists(select 1 from public.autonomous_qa_runs r
 join public.autonomous_jobs aj on aj.idempotency_key='qa-judge:'||r.id::text
 where r.id=c.last_run_id and r.status='PASSED' and aj.status='SUCCEEDED'
 and aj.verification_result->>'source'='PERSISTED_TEST_STATE' and aj.verification_result->>'passed'='true');
 update public.autonomous_quality_coverage c set status='COVERED',updated_at=now()
 where c.coverage_key=any(independent) and exists(select 1 from public.autonomous_jobs aj
 where aj.idempotency_key='qa-independent:'||c.last_run_id::text and aj.status='SUCCEEDED'
 and aj.verification_result->>'source'='INDEPENDENT_PERSISTED_EVIDENCE'
 and aj.verification_result->>'passed'='true');
 update public.autonomous_quality_coverage set status='UNCOVERED',updated_at=now()
 where coverage_key=any(independent) and not exists(select 1 from public.autonomous_jobs aj
 where aj.idempotency_key='qa-independent:'||last_run_id::text and aj.status='SUCCEEDED'
 and aj.verification_result->>'passed'='true');
 update public.autonomous_quality_coverage set status='UNCOVERED',updated_at=now()
 where coverage_key=any(protected) and status<>'UNCOVERED';
 select count(*) filter(where status='COVERED'),count(*) filter(where status<>'COVERED')
 into verified_count,uncovered_count from public.autonomous_quality_coverage;
 select coalesce(jsonb_agg(jsonb_build_object('coverage_key',coverage_key,'status',status) order by coverage_key),'[]')
 into snapshot from public.autonomous_quality_coverage;
 insert into public.autonomous_jobs(department_id,agent_id,objective,trigger_type,target_type,target_id,authority_class,status,
 idempotency_key,correlation_id,input_evidence,data_quality_status,data_quality_assessment,capability,result,
 authorization_decision,execution_result,verification_result,started_at,finished_at)
 values(9,agent.id,'Reconcile QA coverage from independently verified evidence','QA_COVERAGE_RECONCILE','QUALITY_COVERAGE',
 'current','GREEN','SUCCEEDED','qa-coverage:'||gen_random_uuid(),gen_random_uuid(),snapshot,'TRUSTED',
 jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true),
 'qa.coverage_reconcile',snapshot,'AUTHORIZED_POLICY',snapshot,
 jsonb_build_object('passed',true,'covered',verified_count,'uncovered',uncovered_count,'protected_uncovered',protected),
 now(),now()) returning * into job;
 insert into public.autonomous_evidence_ledger(
   job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
 values(job.id,'QA_COVERAGE_RECONCILIATION','autonomous_quality_coverage/current',
   encode(extensions.digest(snapshot::text,'sha256'),'hex'),
   jsonb_build_object('covered',verified_count,'uncovered',uncovered_count),job.correlation_id);
 insert into public.autonomous_decision_ledger(
   job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
   evidence_refs,authorization_result,correlation_id)
 values(job.id,9,agent.id,'QUALITY_COVERAGE_RECONCILED',
   'Independent persisted evidence reconciled; physical and human gates remain uncovered',
   'GREEN',job.policy_version,jsonb_build_array('autonomous_quality_coverage/current'),
   'AUTHORIZED',job.correlation_id);
 update public.autonomous_agents set last_action_at=now(),updated_at=now() where id=agent.id;
 return job;
end$$;
revoke all on function public.autonomous_reconcile_quality_coverage() from public,anon,authenticated;
grant execute on function public.autonomous_reconcile_quality_coverage() to service_role;


