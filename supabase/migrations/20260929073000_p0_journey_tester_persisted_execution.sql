-- The P0 Journey Tester observes the UGO TEST business path after the harness
-- has exercised the real service RPCs. It never represents demo evidence as a
-- physical GPS fix, uploaded photograph or real customer acceptance.
update public.autonomous_agents
set status='IDLE', capability='Verify persisted demo P0 lifecycle',
    permissions='["qa.p0_persisted_journey"]'::jsonb,
    authority_class='GREEN',model_provider=null,model_id=null,updated_at=now()
where agent_key='p0-journey-tester' and department_id=9 and status='DISABLED';

create or replace function public.autonomous_record_p0_journey_test(p_service_id uuid)
returns public.autonomous_jobs language plpgsql security definer
set search_path=public,private,auth,extensions,pg_temp as $$
declare
  tester public.autonomous_agents%rowtype;
  job public.autonomous_jobs%rowtype;
  observations jsonb;
  passed boolean;
  correlation uuid;
begin
  if not exists(select 1 from public.servicios
      where id=p_service_id and ambiente='demo'
        and coalesce(metadata->>'qa_p0','false')='true') then
    raise exception 'DEMO_P0_SERVICE_REQUIRED';
  end if;
  select * into tester from public.autonomous_agents
    where agent_key='p0-journey-tester' and department_id=9 and status='IDLE';
  if tester.id is null then raise exception 'P0_JOURNEY_TESTER_NOT_ENABLED';end if;
  observations:=jsonb_build_object(
    'service_completed',exists(select 1 from public.servicios
      where id=p_service_id and estado='completado' and proveedor_id is not null),
    'accepted_offer_within_20km',exists(select 1 from public.ofertas_servicio
      where servicio_id=p_service_id and estado='aceptada' and distancia_km<=20),
    'no_offer_outside_20km',not exists(select 1 from public.ofertas_servicio
      where servicio_id=p_service_id and distancia_km>20),
    'arrival_event',exists(select 1 from public.servicio_estado_eventos
      where servicio_id=p_service_id and estado_nuevo='llegado'),
    'initial_evidence_row',exists(select 1 from public.evidencias_servicio
      where servicio_id=p_service_id and tipo='antes'),
    'final_evidence_row',exists(select 1 from public.evidencias_servicio
      where servicio_id=p_service_id and tipo='despues'),
    'cash_acknowledged',exists(select 1 from public.pagos
      where servicio_id=p_service_id and metodo='efectivo'
        and fecha_confirmacion is not null),
    'bilateral_rating',(select count(distinct autor_tipo)>=2
      from public.resenas where servicio_id=p_service_id));
  select bool_and(value='true'::jsonb) into passed
    from jsonb_each(observations);
  correlation:=gen_random_uuid();
  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,service_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,
    data_quality_status,data_quality_assessment,capability,result,
    authorization_decision,execution_result,verification_result,
    blocked_reason,started_at,finished_at)
  values (9,tester.id,'Verify persisted demo P0 business path','QA_HARNESS',
    'SERVICE',p_service_id::text,p_service_id,'GREEN',
    case when passed then 'SUCCEEDED' else 'BLOCKED' end,
    'qa-p0-journey:'||p_service_id::text,correlation,
    jsonb_build_array(jsonb_build_object('service_id',p_service_id,'basis','persisted UGO TEST rows')),
    'TRUSTED',jsonb_build_object('freshness',true,'provenance',true,
      'completeness',true,'consistency',true,'basis','database snapshot',
      'simulated_service',true),
    'qa.p0.persisted_journey',observations,
    'AUTHORIZED_POLICY',observations,
    jsonb_build_object('passed',passed,'observations',observations,
      'simulated_service',true,'physical_gps_verified',false,
      'uploaded_media_verified',false,'customer_acceptance',false),
    case when passed then null else 'P0_PERSISTED_ASSERTION_FAILED' end,
    now(),now())
  on conflict(idempotency_key) do nothing returning * into job;
  if job.id is null then
    select * into job from public.autonomous_jobs
      where idempotency_key='qa-p0-journey:'||p_service_id::text;
    return job;
  end if;
  insert into public.autonomous_evidence_ledger
    (job_id,evidence_type,reference,evidence_hash,metadata,correlation_id)
  values(job.id,'QA_P0_PERSISTED_JOURNEY','servicios/'||p_service_id::text,
    encode(extensions.digest(job.verification_result::text,'sha256'),'hex'),
    jsonb_build_object('simulated_service',true,'physical_gps_verified',false,
      'uploaded_media_verified',false),job.correlation_id);
  insert into public.autonomous_decision_ledger
    (job_id,department_id,agent_id,decision,reason,authority_class,policy_version,
     evidence_refs,authorization_result,correlation_id)
  values(job.id,9,tester.id,case when passed then 'P0_DEMO_VERIFIED' else 'P0_DEMO_FAILED' end,
    'Deterministic persisted-state check; physical and customer acceptance remain unverified',
    'GREEN',job.policy_version,
    jsonb_build_array('servicios/'||p_service_id::text),
    case when passed then 'AUTHORIZED' else 'DENIED' end,job.correlation_id);
  update public.autonomous_agents set last_action_at=now(),updated_at=now()
    where id=tester.id;
  return job;
end $$;
revoke all on function public.autonomous_record_p0_journey_test(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_record_p0_journey_test(uuid) to service_role;
