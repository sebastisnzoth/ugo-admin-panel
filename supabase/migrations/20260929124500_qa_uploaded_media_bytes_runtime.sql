-- Runtime proof for protected uploaded evidence bytes.
-- The probe must fetch signed bytes from private Storage before this RPC can record
-- a successful result. The RPC independently verifies the bound demo service,
-- evidence rows, private bucket and Storage object metadata/byte sizes.
create or replace function public.autonomous_record_uploaded_media_runtime(
  p_service_id uuid,
  p_before_path text,
  p_after_path text,
  p_before_sha256 text,
  p_after_sha256 text,
  p_before_bytes bigint,
  p_after_bytes bigint,
  p_public_denied boolean
)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,storage,private,auth,extensions,pg_temp
as $$
declare
  judge public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  before_size bigint;
  after_size bigint;
  verification jsonb;
  corr uuid:=gen_random_uuid();
begin
  if not exists(
    select 1 from public.servicios
    where id=p_service_id and ambiente='demo' and estado='completado'
  ) then raise exception 'COMPLETED_DEMO_SERVICE_REQUIRED'; end if;

  if exists(select 1 from storage.buckets where id='service-evidence' and public is true)
     or not exists(select 1 from storage.buckets where id='service-evidence')
  then raise exception 'PRIVATE_SERVICE_EVIDENCE_BUCKET_REQUIRED'; end if;

  if not exists(
    select 1 from public.evidencias_servicio
    where servicio_id=p_service_id and tipo='antes' and storage_path=p_before_path
  ) then raise exception 'BOUND_INITIAL_EVIDENCE_REQUIRED'; end if;
  if not exists(
    select 1 from public.evidencias_servicio
    where servicio_id=p_service_id and tipo='despues' and storage_path=p_after_path
  ) then raise exception 'BOUND_FINAL_EVIDENCE_REQUIRED'; end if;

  select coalesce((metadata->>'size')::bigint,0) into before_size
  from storage.objects
  where bucket_id='service-evidence' and name=p_before_path;
  select coalesce((metadata->>'size')::bigint,0) into after_size
  from storage.objects
  where bucket_id='service-evidence' and name=p_after_path;

  if before_size<=0 or after_size<=0 then raise exception 'STORAGE_BYTES_REQUIRED'; end if;
  if p_before_bytes<>before_size or p_after_bytes<>after_size
  then raise exception 'FETCHED_BYTE_SIZE_MISMATCH'; end if;
  if coalesce(length(p_before_sha256),0)<>64 or coalesce(length(p_after_sha256),0)<>64
  then raise exception 'SHA256_REQUIRED'; end if;
  if p_public_denied is not true then raise exception 'PRIVATE_ACCESS_NOT_PROVEN'; end if;

  select * into judge from public.autonomous_agents
  where agent_key='deterministic-judge' and department_id=9 and status='IDLE';
  if judge.id is null then raise exception 'DETERMINISTIC_JUDGE_NOT_READY'; end if;

  verification:=jsonb_build_object(
    'passed',true,
    'source','PROTECTED_STORAGE_RUNTIME',
    'service_id',p_service_id,
    'bucket','service-evidence',
    'private_bucket',true,
    'public_access_denied',true,
    'before',jsonb_build_object('path',p_before_path,'bytes',p_before_bytes,'sha256',p_before_sha256),
    'after',jsonb_build_object('path',p_after_path,'bytes',p_after_bytes,'sha256',p_after_sha256)
  );

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at
  ) values(
    9,judge.id,'Verify initial/final evidence bytes through protected Storage runtime',
    'QA_STORAGE_RUNTIME','SERVICE',p_service_id::text,p_service_id,
    'GREEN','SUCCEEDED',
    'qa-media-bytes:'||p_service_id::text||':'||encode(extensions.digest(p_before_path||'|'||p_after_path,'sha256'),'hex'),
    corr,
    jsonb_build_array(
      jsonb_build_object('type','antes','path',p_before_path),
      jsonb_build_object('type','despues','path',p_after_path)
    ),
    'TRUSTED',
    jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true),
    'qa.uploaded_media_bytes_runtime',verification,
    'AUTHORIZED_POLICY',verification,verification,now(),now()
  )
  on conflict(idempotency_key) do update
    set verification_result=excluded.verification_result,
        execution_result=excluded.execution_result,
        result=excluded.result,
        finished_at=now()
  returning * into job;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,evidence_hash,metadata,correlation_id
  ) values(
    job.id,'QA_PROTECTED_STORAGE_BYTES',
    'service-evidence/'||p_service_id::text,
    encode(extensions.digest(verification::text,'sha256'),'hex'),
    jsonb_build_object('before_path',p_before_path,'after_path',p_after_path),
    job.correlation_id
  ) on conflict do nothing;

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
    evidence_refs,authorization_result,correlation_id
  ) values(
    job.id,9,judge.id,'QA_UPLOADED_MEDIA_BYTES_VERIFIED',
    'Signed private Storage downloads matched persisted evidence rows and Storage object byte sizes; public access was denied',
    'GREEN',job.policy_version,
    jsonb_build_array('service-evidence/'||p_before_path,'service-evidence/'||p_after_path),
    'AUTHORIZED',job.correlation_id
  ) on conflict do nothing;

  update public.autonomous_quality_coverage
  set status='COVERED',updated_at=now()
  where coverage_key='uploaded-media-bytes';

  return job;
end$$;

revoke all on function public.autonomous_record_uploaded_media_runtime(uuid,text,text,text,text,bigint,bigint,boolean)
from public,anon,authenticated;
grant execute on function public.autonomous_record_uploaded_media_runtime(uuid,text,text,text,text,bigint,bigint,boolean)
to service_role;

-- Reconcile media coverage only from a successful protected Storage runtime job.
create or replace function public.autonomous_reconcile_quality_coverage()
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare agent public.autonomous_agents%rowtype; job public.autonomous_jobs%rowtype; snapshot jsonb;
 promotable text[]:=array['provider-radius','payments','service-lifecycle'];
 independent text[]:=array['gps-geofence','roles','permissions-rls','realtime'];
 protected text[]:=array['physical-gps-device','real-customer-acceptance'];
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

 update public.autonomous_quality_coverage set status='COVERED',updated_at=now()
 where coverage_key='uploaded-media-bytes' and exists(
   select 1 from public.autonomous_jobs aj
   where aj.capability='qa.uploaded_media_bytes_runtime'
     and aj.status='SUCCEEDED'
     and aj.verification_result->>'source'='PROTECTED_STORAGE_RUNTIME'
     and aj.verification_result->>'passed'='true'
     and aj.verification_result->>'public_access_denied'='true'
 );
 update public.autonomous_quality_coverage set status='UNCOVERED',updated_at=now()
 where coverage_key='uploaded-media-bytes' and not exists(
   select 1 from public.autonomous_jobs aj
   where aj.capability='qa.uploaded_media_bytes_runtime'
     and aj.status='SUCCEEDED'
     and aj.verification_result->>'source'='PROTECTED_STORAGE_RUNTIME'
     and aj.verification_result->>'passed'='true'
     and aj.verification_result->>'public_access_denied'='true'
 );

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
 jsonb_build_object(
   'passed',true,'covered',verified_count,'uncovered',uncovered_count,
   'protected_uncovered',(
     select coalesce(jsonb_agg(coverage_key order by coverage_key),'[]'::jsonb)
     from public.autonomous_quality_coverage where status<>'COVERED'
   )
 ),now(),now()) returning * into job;
 return job;
end$$;
revoke all on function public.autonomous_reconcile_quality_coverage() from public,anon,authenticated;
grant execute on function public.autonomous_reconcile_quality_coverage() to service_role;
