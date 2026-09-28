-- D9 Release Gate Agent is a read-only deterministic verifier of the authoritative gate.
update public.autonomous_agents
set status='IDLE',capability='Verify authoritative release gate without mutating readiness',
    permissions='["qa.release_gate_verify"]'::jsonb,authority_class='GREEN',
    model_provider=null,model_id=null,updated_at=now()
where agent_key='release-gate-agent' and department_id=9 and status='DISABLED';

create or replace function public.autonomous_verify_release_gate(p_gate_key text default 'CUSTOMER_1')
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
 agent public.autonomous_agents%rowtype; gate public.autonomous_release_gate%rowtype;
 job public.autonomous_jobs%rowtype; snapshot jsonb; invalid_ready boolean:=false;
 open_critical integer; uncovered integer; failed_qa integer; running_jobs integer; enabled_kills integer;
begin
 select * into agent from public.autonomous_agents where agent_key='release-gate-agent' and department_id=9 and status='IDLE';
 if agent.id is null then raise exception 'RELEASE_GATE_AGENT_NOT_ENABLED';end if;
 select * into gate from public.autonomous_release_gate where gate_key=p_gate_key;
 if gate.id is null then raise exception 'RELEASE_GATE_NOT_FOUND';end if;
 select count(*) into open_critical from public.autonomous_audit_findings where status='OPEN' and severity='CRITICAL';
 select count(*) into uncovered from public.autonomous_quality_coverage where status<>'COVERED';
 select count(*) into failed_qa from public.autonomous_qa_runs where status in('FAILED','BLOCKED') and not coalesce((judge_result->>'expected_failure_detected')::boolean,false);
 select count(*) into running_jobs from public.autonomous_jobs where status='RUNNING';
 select count(*) into enabled_kills from public.autonomous_kill_switches where enabled=true;
 invalid_ready:=gate.status='READY' and(open_critical>0 or uncovered>0 or failed_qa>0 or running_jobs>0 or enabled_kills>0 or gate.blockers<> '[]'::jsonb);
 snapshot=jsonb_build_object('gate_key',gate.gate_key,'status',gate.status,'blockers',gate.blockers,
   'evaluated_at',gate.evaluated_at,'open_critical_findings',open_critical,'uncovered_qa',uncovered,
   'failed_or_blocked_qa',failed_qa,'running_jobs',running_jobs,'enabled_kill_switches',enabled_kills,
   'customer_acceptance_approved',not(gate.blockers ? 'CUSTOMER_ACCEPTANCE_NOT_APPROVED'));
 insert into public.autonomous_jobs(department_id,agent_id,objective,trigger_type,target_type,target_id,
   authority_class,status,idempotency_key,correlation_id,input_evidence,data_quality_status,data_quality_assessment,
   capability,result,authorization_decision,execution_result,verification_result,started_at,finished_at)
 values(9,agent.id,'Verify authoritative release gate','QA_RELEASE_GATE_VERIFY','RELEASE_GATE',gate.gate_key,
   'GREEN','SUCCEEDED','qa-release-verify:'||gen_random_uuid()::text,gen_random_uuid(),
   jsonb_build_array(jsonb_build_object('source','autonomous_release_gate','gate_key',gate.gate_key)),
   'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',not invalid_ready),
   'qa.release_gate_verify',snapshot,'AUTHORIZED_POLICY',snapshot,
   jsonb_build_object('passed',not invalid_ready,'gate_status',gate.status,'blockers',gate.blockers,
     'source','PERSISTED_RELEASE_GATE','ready_asserted',gate.status='READY'),now(),now()) returning * into job;
 insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
 values(job.id,'RELEASE_GATE_VERIFICATION','autonomous_release_gate/'||gate.gate_key,
   encode(extensions.digest(snapshot::text,'sha256'),'hex'),jsonb_build_object('invalid_ready',invalid_ready),job.correlation_id);
 insert into public.autonomous_decision_ledger(job_id,department_id,agent_id,decision,reason,authority_class,
   policy_version,evidence_refs,authorization_result,correlation_id)
 values(job.id,9,agent.id,case when invalid_ready then 'RELEASE_GATE_INCONSISTENT' else 'RELEASE_GATE_VERIFIED' end,
   case when invalid_ready then 'READY conflicts with persisted blocking evidence' else 'Authoritative gate state agrees with persisted blocking evidence' end,
   'GREEN',job.policy_version,jsonb_build_array('autonomous_release_gate/'||gate.gate_key),'AUTHORIZED',job.correlation_id);
 update public.autonomous_agents set last_action_at=now(),updated_at=now() where id=agent.id;
 return job;
end$$;
revoke all on function public.autonomous_verify_release_gate(text) from public,anon,authenticated;
grant execute on function public.autonomous_verify_release_gate(text) to service_role;
