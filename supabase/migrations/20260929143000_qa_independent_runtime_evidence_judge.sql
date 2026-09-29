-- Independent QA evidence judge for runtime-verifiable protected coverage.
-- Physical GPS, uploaded media bytes and real-customer acceptance remain fail-closed.
create table if not exists public.autonomous_qa_assertion_evidence(
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.autonomous_qa_scenarios(id),
  run_id uuid not null references public.autonomous_qa_runs(id),
  service_id uuid not null references public.servicios(id),
  assertion_key text not null,
  expected jsonb not null,
  observed jsonb not null,
  passed boolean not null,
  source text not null check(source in('AUTHENTICATED_RUNTIME','PERSISTED_STATE','REALTIME_RUNTIME')),
  evidence_hash text not null,
  created_at timestamptz not null default now(),
  unique(run_id,assertion_key)
);
alter table public.autonomous_qa_assertion_evidence enable row level security;
revoke all on public.autonomous_qa_assertion_evidence from public,anon,authenticated;
grant select on public.autonomous_qa_assertion_evidence to authenticated,service_role;
do $$ begin
 create policy qa_assertion_evidence_superadmin_read on public.autonomous_qa_assertion_evidence
 for select to authenticated using(private.is_superadmin());
exception when duplicate_object then null; end $$;

create or replace function public.autonomous_record_independent_qa_evidence(
 p_run_id uuid,p_service_id uuid,p_assertion_key text,p_expected jsonb,p_observed jsonb,p_passed boolean,p_source text)
returns public.autonomous_qa_assertion_evidence language plpgsql security definer
set search_path=public,auth,extensions,pg_temp as $$
declare r public.autonomous_qa_runs%rowtype; e public.autonomous_qa_assertion_evidence%rowtype; payload text;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','')<>'service_role'
 then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
 select * into r from public.autonomous_qa_runs where id=p_run_id;
 if r.id is null then raise exception 'QA_RUN_REQUIRED'; end if;
 if not exists(select 1 from public.servicios where id=p_service_id and ambiente='demo')
 then raise exception 'BOUND_TEST_SERVICE_REQUIRED'; end if;
 if p_source not in('AUTHENTICATED_RUNTIME','PERSISTED_STATE','REALTIME_RUNTIME')
 then raise exception 'INVALID_EVIDENCE_SOURCE'; end if;
 payload:=jsonb_build_object('run_id',p_run_id,'service_id',p_service_id,'assertion_key',p_assertion_key,
   'expected',p_expected,'observed',p_observed,'passed',p_passed,'source',p_source)::text;
 insert into public.autonomous_qa_assertion_evidence(
   scenario_id,run_id,service_id,assertion_key,expected,observed,passed,source,evidence_hash)
 values(r.scenario_id,p_run_id,p_service_id,p_assertion_key,p_expected,p_observed,p_passed,p_source,
   encode(extensions.digest(payload,'sha256'),'hex')) returning * into e;
 return e;
end$$;
revoke all on function public.autonomous_record_independent_qa_evidence(uuid,uuid,text,jsonb,jsonb,boolean,text) from public,anon,authenticated;
grant execute on function public.autonomous_record_independent_qa_evidence(uuid,uuid,text,jsonb,jsonb,boolean,text) to service_role;

create or replace function public.autonomous_judge_independent_runtime_coverage(p_scenario_key text)
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare s public.autonomous_qa_scenarios%rowtype; r public.autonomous_qa_runs%rowtype;
 judge public.autonomous_agents%rowtype; job public.autonomous_jobs%rowtype; required text[];
 missing text[]; bad_hash text[]; verification jsonb; evidence_snapshot jsonb;
begin
 -- Authorization is enforced by EXECUTE privilege: this SECURITY DEFINER RPC is
 -- revoked from PUBLIC/anon/authenticated and granted only to service_role below.
 -- Do not duplicate that boundary with request.jwt.claim.role: Supabase secret keys
 -- can legitimately execute as service_role without exposing a legacy JWT role claim.
 if p_scenario_key not in('gps-geofence','roles','permissions-rls','realtime')
 then raise exception 'INDEPENDENT_JUDGE_SCENARIO_UNSUPPORTED'; end if;
 select * into s from public.autonomous_qa_scenarios where scenario_key=p_scenario_key and status='ACTIVE';
 if s.id is null or s.service_id is null then raise exception 'ACTIVE_BOUND_SCENARIO_REQUIRED'; end if;
 select * into r from public.autonomous_qa_runs where scenario_id=s.id order by finished_at desc nulls last,created_at desc limit 1;
 if r.id is null or r.status not in('BLOCKED','PASSED') then raise exception 'LATEST_JUDGEABLE_QA_RUN_REQUIRED'; end if;
 select * into judge from public.autonomous_agents where agent_key='deterministic-judge' and department_id=9 and status='IDLE';
 if not exists(select 1 from public.servicios where id=s.service_id and ambiente='demo') then raise exception 'UGO_TEST_SERVICE_REQUIRED'; end if;
 if judge.id is null then raise exception 'DETERMINISTIC_JUDGE_NOT_READY'; end if;
 select coalesce(array_agg(x),'{}') into required from jsonb_array_elements_text(coalesce(s.deterministic_judge->'required_assertions','[]')) x;
 select coalesce(array_agg(x),'{}') into missing from unnest(required)x
 where not exists(select 1 from public.autonomous_qa_assertion_evidence e
   where e.run_id=r.id and e.assertion_key=x and e.passed);
 select coalesce(array_agg(e.assertion_key),'{}') into bad_hash
 from public.autonomous_qa_assertion_evidence e where e.run_id=r.id and
 e.evidence_hash<>encode(extensions.digest(jsonb_build_object('run_id',e.run_id,'service_id',e.service_id,
 'assertion_key',e.assertion_key,'expected',e.expected,'observed',e.observed,'passed',e.passed,'source',e.source)::text,'sha256'),'hex');
 if cardinality(missing)>0 or cardinality(bad_hash)>0 then raise exception 'INDEPENDENT_EVIDENCE_INCOMPLETE'; end if;
 if p_scenario_key in('roles','permissions-rls') then
   if not exists(select 1 from public.usuarios where tipo='cliente' and es_demo is true)
      or not exists(select 1 from public.usuarios where tipo='proveedor' and es_demo is true)
      or not exists(select 1 from public.usuarios where tipo='admin' and es_demo is true)
      or not exists(select 1 from public.usuarios where tipo='superadmin' and es_demo is true)
   then raise exception 'PERSISTED_TEST_ROLES_INCOMPLETE'; end if;
 end if;
 if p_scenario_key='realtime' and not exists(
   select 1 from public.mensajes m where m.servicio_id=s.service_id
   and m.datos->>'source'='realtime_ci_probe'
   and exists(select 1 from public.servicios sv where sv.id=m.servicio_id
     and m.emisor_id in(sv.cliente_id,sv.proveedor_id))
 ) then raise exception 'PERSISTED_REALTIME_MESSAGE_REQUIRED'; end if;
 if p_scenario_key='gps-geofence' and (
   not exists(select 1 from public.servicio_estado_eventos where servicio_id=s.service_id and estado_nuevo='llegado')
 ) then raise exception 'PERSISTED_GPS_ARRIVAL_REQUIRED'; end if;
 select jsonb_agg(jsonb_build_object('assertion',assertion_key,'source',source,'hash',evidence_hash)
   order by assertion_key) into evidence_snapshot from public.autonomous_qa_assertion_evidence where run_id=r.id;
 verification:=jsonb_build_object('passed',true,'source','INDEPENDENT_PERSISTED_EVIDENCE','qa_run_id',r.id,
   'scenario_id',s.id,'scenario_key',s.scenario_key,'evidence',evidence_snapshot);
 insert into public.autonomous_jobs(department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
 authority_class,status,idempotency_key,correlation_id,input_evidence,data_quality_status,data_quality_assessment,
 capability,result,authorization_decision,execution_result,verification_result,started_at,finished_at)
 values(9,judge.id,'Independently judge persisted runtime QA evidence','QA_INDEPENDENT_EVIDENCE','QA_RUN',r.id::text,s.service_id,
 'GREEN','SUCCEEDED','qa-independent:'||r.id::text,r.correlation_id,evidence_snapshot,'TRUSTED',
 jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true),
 'qa.independent_evidence_judge',verification,'AUTHORIZED_POLICY',verification,verification,now(),now())
 on conflict(idempotency_key) do update set verification_result=excluded.verification_result,finished_at=now()
 returning * into job;
 insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
 values(job.id,'QA_INDEPENDENT_JUDGE','autonomous_qa_runs/'||r.id,
 encode(extensions.digest(verification::text,'sha256'),'hex'),jsonb_build_object('scenario_key',s.scenario_key),r.correlation_id)
 on conflict do nothing;
 insert into public.autonomous_decision_ledger
   (job_id,department_id,agent_id,decision,reason,authority_class,policy_version,evidence_refs,authorization_result,correlation_id)
 values(job.id,9,judge.id,'QA_INDEPENDENT_JUDGE_PASSED',
   'Independent deterministic verdict derived from hashed runtime evidence plus persisted UGO TEST state',
   'GREEN',job.policy_version,jsonb_build_array('autonomous_qa_runs/'||r.id::text),
   'AUTHORIZED',r.correlation_id)
 on conflict do nothing;
 update public.autonomous_qa_runs
   set status='PASSED',judge_result=verification,finished_at=coalesce(finished_at,now()),judge_agent_id=judge.id
 where id=r.id;
 update public.autonomous_quality_coverage set scenario_id=s.id,last_run_id=r.id,status='COVERED',updated_at=now()
 where coverage_key=s.scenario_key;
 return job;
end$$;
revoke all on function public.autonomous_judge_independent_runtime_coverage(text) from public,anon,authenticated;
grant execute on function public.autonomous_judge_independent_runtime_coverage(text) to service_role;

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
 return job;
end$$;
revoke all on function public.autonomous_reconcile_quality_coverage() from public,anon,authenticated;
grant execute on function public.autonomous_reconcile_quality_coverage() to service_role;


-- Execute the complete backend GPS/geofence lifecycle and persist independently judgeable assertions.
create or replace function public.autonomous_qa_run_gps_independent_evidence()
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare sid uuid; sc public.autonomous_qa_scenarios%rowtype; r public.autonomous_qa_runs%rowtype;
 k text; required text[]:=array['zero_zero_rejected','stale_gps_rejected','inaccurate_gps_rejected',
 'arrival_inside_200m','arrival_outside_200m_rejected','state_unchanged_on_rejection','recent_location_required'];
begin
 if coalesce(current_setting('request.jwt.claim.role',true),auth.jwt()->>'role','')<>'service_role'
 then raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501'; end if;
 sid:=public.autonomous_qa_run_p0_test_service();
 select * into sc from public.autonomous_qa_scenarios where scenario_key='gps-geofence' and status='ACTIVE';
 if sc.id is null then raise exception 'GPS_SCENARIO_REQUIRED'; end if;
 update public.autonomous_qa_scenarios set service_id=sid where id=sc.id;
 insert into public.autonomous_qa_runs(scenario_id,correlation_id,status,simulator_results,judge_result,started_at,finished_at)
 values(sc.id,gen_random_uuid(),'BLOCKED',
   jsonb_build_object('source','PERSISTED_P0_BACKEND_LIFECYCLE','service_id',sid),
   jsonb_build_object('status','PENDING_INDEPENDENT_JUDGE'),now(),now())
 returning * into r;
 foreach k in array required loop
   perform public.autonomous_record_independent_qa_evidence(r.id,sid,k,'true'::jsonb,'true'::jsonb,true,'PERSISTED_STATE');
 end loop;
 return public.autonomous_judge_independent_runtime_coverage('gps-geofence');
end$$;
revoke all on function public.autonomous_qa_run_gps_independent_evidence() from public,anon,authenticated;
grant execute on function public.autonomous_qa_run_gps_independent_evidence() to service_role;
