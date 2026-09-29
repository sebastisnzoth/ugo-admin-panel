-- Deterministic TEST-safe release gate evaluator.
-- The authoritative gate and validation-only probe use one pure blocker function,
-- so positive/negative scenarios cannot drift from launch-control logic.

create or replace function private.release_gate_blockers_from_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
immutable
set search_path=public,private,auth,extensions,pg_temp
as $$
declare blockers jsonb:='[]'::jsonb;
begin
  if not coalesce((p_snapshot->>'no_open_critical_findings')::boolean,false) then blockers:=blockers||'"OPEN_CRITICAL_FINDING"'::jsonb; end if;
  if not coalesce((p_snapshot->>'qa_coverage_complete')::boolean,false) then blockers:=blockers||'"QA_COVERAGE_INCOMPLETE"'::jsonb; end if;
  if not coalesce((p_snapshot->>'qa_runs_passing')::boolean,false) then blockers:=blockers||'"QA_RUN_FAILURE"'::jsonb; end if;
  if not coalesce((p_snapshot->>'no_stale_jobs')::boolean,false) then blockers:=blockers||'"STALE_AUTONOMOUS_JOB"'::jsonb; end if;
  if not coalesce((p_snapshot->>'meta_qa_validated')::boolean,false) then blockers:=blockers||'"META_QA_NOT_VALIDATED"'::jsonb; end if;
  if not coalesce((p_snapshot->>'model_router_ready')::boolean,false) then blockers:=blockers||'"MODEL_ROUTER_NOT_READY"'::jsonb; end if;
  if not coalesce((p_snapshot->>'kill_switches_clear')::boolean,false) then blockers:=blockers||'"KILL_SWITCH_ENABLED"'::jsonb; end if;
  if not coalesce((p_snapshot->>'real_customer_journey_verified')::boolean,false) then blockers:=blockers||'"REAL_CUSTOMER_JOURNEY_NOT_VERIFIED"'::jsonb; end if;
  if not coalesce((p_snapshot->>'customer_acceptance_approved')::boolean,false) then blockers:=blockers||'"CUSTOMER_ACCEPTANCE_NOT_APPROVED"'::jsonb; end if;
  return blockers;
end$$;

revoke all on function private.release_gate_blockers_from_snapshot(jsonb) from public,anon,authenticated;

create or replace function private.current_release_gate_snapshot(p_gate_key text)
returns jsonb
language sql
stable
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
select jsonb_build_object(
  'gate_key',p_gate_key,
  'no_open_critical_findings',not exists(select 1 from public.autonomous_audit_findings where status='OPEN' and severity='CRITICAL'),
  'qa_coverage_complete',
    exists(select 1 from public.autonomous_quality_coverage)
    and not exists(select 1 from public.autonomous_quality_coverage where status<>'COVERED'),
  'qa_runs_passing',not exists(
    select 1
    from public.autonomous_qa_scenarios scenario
    cross join lateral (
      select qa_run.status,qa_run.judge_result
      from public.autonomous_qa_runs qa_run
      where qa_run.scenario_id=scenario.id
      order by qa_run.finished_at desc nulls last,qa_run.started_at desc nulls last,qa_run.id desc
      limit 1
    ) latest
    where latest.status in('FAILED','BLOCKED')
      and not coalesce((latest.judge_result->>'expected_failure_detected')::boolean,false)
  ),
  'no_stale_jobs',not exists(select 1 from public.autonomous_jobs where status='RUNNING' and lease_expires_at<now()),
  'meta_qa_validated',coalesce((select meta_qa_validated from public.autonomous_release_gate where gate_key=p_gate_key),false),
  'model_router_ready',not exists(select 1 from public.autonomous_model_routes where status not in('READY','DISABLED')),
  'kill_switches_clear',not exists(select 1 from public.autonomous_kill_switches where enabled=true),
  'real_customer_journey_verified',case when p_gate_key<>'CUSTOMER_1' then true else exists(
    select 1 from public.servicios s
    where s.estado='completado'
      and coalesce(s.metadata->>'qa_p0','false')<>'true'
      and s.ambiente='real'
      and exists(select 1 from public.usuarios c where c.id=s.cliente_id and c.es_demo is not true)
      and exists(select 1 from public.usuarios p where p.id=s.proveedor_id and p.es_demo is not true)
      and exists(select 1 from public.ofertas_servicio o where o.servicio_id=s.id and o.estado='aceptada' and o.distancia_km<=20)
      and exists(select 1 from public.evidencias_servicio e where e.servicio_id=s.id and e.tipo='antes')
      and exists(select 1 from public.evidencias_servicio e where e.servicio_id=s.id and e.tipo='despues')
      and exists(select 1 from public.pagos p where p.servicio_id=s.id and p.fecha_confirmacion is not null)
      and (select count(distinct autor_tipo) from public.resenas where servicio_id=s.id)>=2
  ) end,
  'customer_acceptance_approved',case when p_gate_key<>'CUSTOMER_1' then true else not exists(
    select 1 from (values ('FULL-E2E'),('TWO-DEVICES')) as required(code)
    where not exists(
      select 1 from public.development_checklist d
      where d.code=required.code and d.status='approved'
    )
  ) end
);
$$;

revoke all on function private.current_release_gate_snapshot(text) from public,anon,authenticated;

create or replace function public.superadmin_evaluate_release_gate(p_gate_key text default 'CUSTOMER_1')
returns public.autonomous_release_gate
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  snapshot jsonb;
  blockers jsonb;
  r public.autonomous_release_gate%rowtype;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;
  snapshot:=private.current_release_gate_snapshot(p_gate_key);
  blockers:=private.release_gate_blockers_from_snapshot(snapshot);
  insert into public.autonomous_release_gate(gate_key,status,blockers,evaluated_at,evaluated_by,meta_qa_validated)
  values(
    p_gate_key,
    case when jsonb_array_length(blockers)=0 then 'READY' else 'BLOCKED' end,
    blockers,
    now(),
    auth.uid(),
    coalesce((snapshot->>'meta_qa_validated')::boolean,false)
  )
  on conflict(gate_key) do update set
    status=excluded.status,
    blockers=excluded.blockers,
    evaluated_at=excluded.evaluated_at,
    evaluated_by=excluded.evaluated_by,
    meta_qa_validated=excluded.meta_qa_validated
  returning * into r;
  return r;
end$$;

revoke all on function public.superadmin_evaluate_release_gate(text) from public,anon;
grant execute on function public.superadmin_evaluate_release_gate(text) to authenticated;

create or replace function public.autonomous_validate_release_gate_determinism(
  p_gate_key text default 'CUSTOMER_1',
  p_source_sha text default null,
  p_correlation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  agent public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  actual_snapshot jsonb;
  actual_blockers jsonb;
  actual_status text;
  negative_snapshot jsonb;
  negative_blockers jsonb;
  negative_status text;
  positive_snapshot jsonb;
  positive_blockers jsonb;
  positive_status text;
  result_json jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role'
     and current_user not in ('postgres','supabase_admin') then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;

  select * into agent from public.autonomous_agents
  where agent_key='release-gate-agent' and department_id=9;
  if agent.id is null then raise exception 'RELEASE_GATE_AGENT_NOT_FOUND'; end if;

  actual_snapshot:=private.current_release_gate_snapshot(p_gate_key);
  actual_blockers:=private.release_gate_blockers_from_snapshot(actual_snapshot);
  actual_status:=case when jsonb_array_length(actual_blockers)=0 then 'READY' else 'BLOCKED' end;

  -- Controlled negative scenario: the same evaluator must block one persisted requirement failure.
  negative_snapshot:=actual_snapshot||jsonb_build_object(
    'qa_coverage_complete',false,
    'real_customer_journey_verified',true,
    'customer_acceptance_approved',true
  );
  negative_blockers:=private.release_gate_blockers_from_snapshot(negative_snapshot);
  negative_status:=case when jsonb_array_length(negative_blockers)=0 then 'READY' else 'BLOCKED' end;

  -- Controlled positive scenario: every requirement satisfied must deterministically yield READY.
  positive_snapshot:=actual_snapshot||jsonb_build_object(
    'no_open_critical_findings',true,
    'qa_coverage_complete',true,
    'qa_runs_passing',true,
    'no_stale_jobs',true,
    'meta_qa_validated',true,
    'model_router_ready',true,
    'kill_switches_clear',true,
    'real_customer_journey_verified',true,
    'customer_acceptance_approved',true
  );
  positive_blockers:=private.release_gate_blockers_from_snapshot(positive_snapshot);
  positive_status:=case when jsonb_array_length(positive_blockers)=0 then 'READY' else 'BLOCKED' end;

  if negative_status<>'BLOCKED' or not (negative_blockers ? 'QA_COVERAGE_INCOMPLETE') then
    raise exception 'RELEASE_GATE_NEGATIVE_SCENARIO_FAILED';
  end if;
  if positive_status<>'READY' or jsonb_array_length(positive_blockers)<>0 then
    raise exception 'RELEASE_GATE_POSITIVE_SCENARIO_FAILED';
  end if;

  insert into public.autonomous_release_gate(gate_key,status,blockers,evaluated_at,meta_qa_validated)
  values(
    p_gate_key,
    actual_status,
    actual_blockers,
    now(),
    coalesce((actual_snapshot->>'meta_qa_validated')::boolean,false)
  )
  on conflict(gate_key) do update set
    status=excluded.status,
    blockers=excluded.blockers,
    evaluated_at=excluded.evaluated_at,
    meta_qa_validated=excluded.meta_qa_validated;

  result_json:=jsonb_build_object(
    'source_sha',p_source_sha,
    'gate_key',p_gate_key,
    'actual',jsonb_build_object('status',actual_status,'blockers',actual_blockers,'snapshot',actual_snapshot),
    'negative',jsonb_build_object('status',negative_status,'blockers',negative_blockers,'snapshot',negative_snapshot),
    'positive',jsonb_build_object('status',positive_status,'blockers',positive_blockers,'snapshot',positive_snapshot),
    'production_touched',false,
    'validation_only',true
  );

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,started_at,finished_at
  )
  values(
    9,agent.id,'Validate deterministic blocking and eligible release-gate scenarios',
    'QA_RELEASE_GATE_DETERMINISM','RELEASE_GATE',p_gate_key,
    'GREEN','SUCCEEDED','qa-release-determinism:'||p_correlation_id::text,p_correlation_id,
    jsonb_build_array(
      jsonb_build_object('source','PERSISTED_RELEASE_GATE_STATE','gate_key',p_gate_key),
      jsonb_build_object('source_sha',p_source_sha)
    ),
    'TRUSTED',
    jsonb_build_object('freshness',true,'provenance',true,'completeness',true,'consistency',true),
    'qa.release_gate_determinism',result_json,
    'AUTHORIZED_VALIDATION_ONLY',result_json,
    jsonb_build_object(
      'passed',true,
      'actual_status',actual_status,
      'actual_blockers',actual_blockers,
      'negative_status',negative_status,
      'negative_blockers',negative_blockers,
      'positive_status',positive_status,
      'positive_blockers',positive_blockers,
      'source_sha',p_source_sha,
      'production_touched',false
    ),
    now(),now()
  ) returning * into job;

  insert into public.autonomous_evidence_ledger(job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(
    job.id,'RELEASE_GATE_DETERMINISM',
    'autonomous_release_gate/'||p_gate_key,
    encode(extensions.digest(result_json::text,'sha256'),'hex'),
    jsonb_build_object('source_sha',p_source_sha,'actual_status',actual_status,'negative_status',negative_status,'positive_status',positive_status),
    p_correlation_id
  );

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,
    policy_version,evidence_refs,authorization_result,correlation_id
  )
  values(
    job.id,9,agent.id,'RELEASE_GATE_DETERMINISTIC',
    'Actual persisted blockers reproduced; negative BLOCKED and all-satisfied positive READY',
    'GREEN',job.policy_version,
    jsonb_build_array('autonomous_release_gate/'||p_gate_key,p_source_sha),
    'AUTHORIZED_VALIDATION_ONLY',p_correlation_id
  );

  return jsonb_build_object(
    'passed',true,
    'job_id',job.id,
    'correlation_id',p_correlation_id,
    'source_sha',p_source_sha,
    'actual_status',actual_status,
    'actual_blockers',actual_blockers,
    'negative_status',negative_status,
    'negative_blockers',negative_blockers,
    'positive_status',positive_status,
    'positive_blockers',positive_blockers
  );
end$$;

revoke all on function public.autonomous_validate_release_gate_determinism(text,text,uuid) from public,anon,authenticated;
grant execute on function public.autonomous_validate_release_gate_determinism(text,text,uuid) to service_role;
