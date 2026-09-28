-- Attribute only genuine persisted-state QA decisions to the deterministic judge.
-- This observer does not authorize a customer journey or execute a product mutation.
alter table public.autonomous_qa_runs
  add column if not exists judge_agent_id uuid references public.autonomous_agents(id);

update public.autonomous_agents
set status='IDLE', capability='Judge persisted UGO TEST service state deterministically',
    permissions='["qa.persisted_state_judge"]'::jsonb,
    authority_class='GREEN', model_provider=null, model_id=null, updated_at=now()
where agent_key='deterministic-judge' and department_id=9 and status='DISABLED';

create or replace function private.autonomous_attribute_persisted_qa_judge()
returns trigger language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  scenario public.autonomous_qa_scenarios%rowtype;
  judge public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  passed boolean;
  observed jsonb;
  missing text[];
  verification jsonb;
begin
  if new.judge_result->>'source' is distinct from 'PERSISTED_TEST_STATE' then
    return new;
  end if;
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode='42501';
  end if;
  select * into scenario from public.autonomous_qa_scenarios where id=new.scenario_id;
  select * into judge from public.autonomous_agents
  where agent_key='deterministic-judge' and department_id=9 and status='IDLE';
  if judge.id is null or scenario.service_id is null or not exists (
    select 1 from public.servicios where id=scenario.service_id and ambiente='demo'
  ) then
    raise exception 'PERSISTED_TEST_JUDGE_INPUT_REQUIRED';
  end if;
  if jsonb_typeof(new.judge_result->'passed') <> 'boolean'
     or new.status not in ('PASSED','FAILED')
     or new.finished_at is null then
    raise exception 'PERSISTED_TEST_JUDGE_RESULT_REQUIRED';
  end if;
  if scenario.scenario_key='provider-radius' then
    observed:=jsonb_build_object(
      'provider_within_20km',exists(select 1 from public.ofertas_servicio where servicio_id=scenario.service_id and distancia_km<=20),
      'outside_provider_rejected',not exists(select 1 from public.ofertas_servicio where servicio_id=scenario.service_id and distancia_km>20));
  elsif scenario.scenario_key='payments' then
    observed:=jsonb_build_object(
      'payment_recorded',exists(select 1 from public.pagos where servicio_id=scenario.service_id),
      'cash_acknowledged',exists(select 1 from public.pagos where servicio_id=scenario.service_id and metodo='efectivo' and fecha_confirmacion is not null),
      'ledger_isolated',not exists(select 1 from public.pagos where servicio_id=scenario.service_id and (cliente_id is null or proveedor_id is null)));
  elsif scenario.scenario_key='service-lifecycle' then
    observed:=jsonb_build_object(
      'service_id_isolated',true,'request_created',true,
      'provider_accepted',exists(select 1 from public.ofertas_servicio where servicio_id=scenario.service_id and estado='aceptada'),
      'arrival_verified',exists(select 1 from public.servicio_estado_eventos where servicio_id=scenario.service_id and estado_nuevo='llegado'),
      'start_evidence',exists(select 1 from public.evidencias_servicio where servicio_id=scenario.service_id and tipo='antes'),
      'finish_evidence',exists(select 1 from public.evidencias_servicio where servicio_id=scenario.service_id and tipo='despues'),
      'client_approved',exists(select 1 from public.servicio_estado_eventos where servicio_id=scenario.service_id and estado_nuevo='completado'),
      'payment_recorded',exists(select 1 from public.pagos where servicio_id=scenario.service_id),
      'completed',exists(select 1 from public.servicios where id=scenario.service_id and estado='completado'),
      'bilateral_rating',(select count(distinct autor_tipo)>=2 from public.resenas where servicio_id=scenario.service_id));
  else
    raise exception 'PERSISTED_TEST_JUDGE_SCENARIO_UNSUPPORTED';
  end if;
  select coalesce(array_agg(assertion),'{}') into missing
    from jsonb_array_elements_text(coalesce(scenario.deterministic_judge->'required_assertions','[]'::jsonb)) assertion
    where coalesce((observed->>assertion)::boolean,false)=false;
  passed:=cardinality(missing)=0 and
    not coalesce((new.chaos_result->>'unexpected_failure')::boolean,false);
  if observed <> new.simulator_results then
    raise exception 'PERSISTED_TEST_JUDGE_OBSERVATIONS_MISMATCH';
  end if;
  if passed is distinct from (new.judge_result->>'passed')::boolean then
    raise exception 'PERSISTED_TEST_JUDGE_VERDICT_MISMATCH';
  end if;
  if passed <> (new.status='PASSED') then
    raise exception 'PERSISTED_TEST_JUDGE_RESULT_MISMATCH';
  end if;
  verification:=jsonb_build_object(
    'passed',passed,'judge_result',new.judge_result,
    'qa_run_id',new.id,'scenario_id',scenario.id,
    'source','PERSISTED_TEST_STATE','simulated_service',true
  );
  insert into public.autonomous_jobs (
    department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,
    blocked_reason,started_at,finished_at
  ) values (
    9,judge.id,'Evaluate persisted UGO TEST scenario','QA_PERSISTED_STATE',
    'QA_RUN',new.id::text,scenario.service_id,'GREEN',
    case when passed then 'SUCCEEDED' else 'BLOCKED' end,
    'qa-judge:'||new.id::text,new.correlation_id,
    jsonb_build_array(jsonb_build_object('scenario_id',scenario.id,'service_id',scenario.service_id)),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,
      'completeness',true,'consistency',true,'basis','persisted UGO TEST rows',
      'simulated_service',true),
    'qa.persisted_state_judge',verification,
    'AUTHORIZED_POLICY',verification,verification,
    case when passed then null else 'DETERMINISTIC_JUDGE_FAILED' end,
    new.started_at,new.finished_at
  ) on conflict(idempotency_key) do nothing returning * into job;
  if job.id is null then
    raise exception 'DUPLICATE_QA_JUDGE_RUN';
  end if;
  insert into public.autonomous_evidence_ledger
    (job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values (job.id,'QA_PERSISTED_JUDGE','autonomous_qa_runs/'||new.id::text,
    encode(extensions.digest(verification::text,'sha256'),'hex'),
    jsonb_build_object('simulated_service',true,'scenario_key',scenario.scenario_key),
    new.correlation_id);
  insert into public.autonomous_decision_ledger
    (job_id,department_id,agent_id,decision,reason,authority_class,
     policy_version,evidence_refs,authorization_result,correlation_id)
  values (job.id,9,judge.id,case when passed then 'QA_JUDGE_PASSED' else 'QA_JUDGE_FAILED' end,
    'Deterministic verdict derived from persisted UGO TEST state','GREEN',
    job.policy_version,jsonb_build_array('autonomous_qa_runs/'||new.id::text),
    case when passed then 'AUTHORIZED' else 'DENIED' end,new.correlation_id);
  update public.autonomous_qa_runs set judge_agent_id=judge.id where id=new.id;
  update public.autonomous_agents set last_action_at=new.finished_at,updated_at=now()
    where id=judge.id;
  return new;
end $$;

drop trigger if exists autonomous_persisted_qa_judge_execution on public.autonomous_qa_runs;
create trigger autonomous_persisted_qa_judge_execution
after insert on public.autonomous_qa_runs for each row
execute function private.autonomous_attribute_persisted_qa_judge();
revoke all on function private.autonomous_attribute_persisted_qa_judge() from public,anon,authenticated;
