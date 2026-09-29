-- Bind one persisted P0 TEST/demo journey to one corporate-audit correlation.
create or replace function public.service_role_judge_p0_audit_chain(
  p_service_id uuid,
  p_correlation_id uuid
) returns jsonb
language sql
security definer
set search_path = public
as $$
  with b as (
    select * from public.autonomous_service_event_bindings
    where service_id=p_service_id and correlation_id=p_correlation_id
  ),
  expected(event_type) as (
    values ('matching'::text),('arrival'),('evidence_before'),('evidence_after'),('payment'),('closure')
  ),
  missing as (
    select e.event_type from expected e
    where not exists(select 1 from b where b.event_type=e.event_type)
  ),
  mixed as (
    select count(*)::int c from public.autonomous_service_event_bindings
    where correlation_id=p_correlation_id and service_id<>p_service_id
  ),
  d as (
    select count(*)::int c from public.autonomous_decision_ledger
    where correlation_id=p_correlation_id and department_id=14 and decision='P0_AUDIT_CHAIN_BOUND'
  ),
  ev as (
    select count(*)::int c from public.autonomous_evidence_ledger
    where correlation_id=p_correlation_id and evidence_type='P0_AUDIT_EVENT_CHAIN'
      and metadata->>'service_id'=p_service_id::text
  )
  select jsonb_build_object(
    'passed', (select count(*)=6 from b)
              and not exists(select 1 from missing)
              and (select c=0 from mixed)
              and (select c>=1 from d)
              and (select c>=1 from ev),
    'service_id',p_service_id,
    'correlation_id',p_correlation_id,
    'binding_count',(select count(*) from b),
    'missing_events',coalesce((select jsonb_agg(event_type) from missing),'[]'::jsonb),
    'mixed_service_count',(select c from mixed),
    'decision_ledger_count',(select c from d),
    'evidence_ledger_count',(select c from ev)
  )
$$;

create or replace function public.service_role_bind_p0_audit_chain(
  p_service_id uuid,
  p_correlation_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_offer public.ofertas_servicio%rowtype;
  v_arrival public.servicio_estado_eventos%rowtype;
  v_before public.evidencias_servicio%rowtype;
  v_after public.evidencias_servicio%rowtype;
  v_payment public.pagos%rowtype;
  v_close public.servicio_estado_eventos%rowtype;
  v_auditor uuid;
  v_hash text;
begin
  if p_correlation_id is null then raise exception 'CORRELATION_ID_REQUIRED'; end if;
  if not exists (
    select 1 from public.servicios
    where id=p_service_id and ambiente in ('test','demo') and estado='completado'
  ) then raise exception 'P0_COMPLETED_TEST_SERVICE_REQUIRED'; end if;

  select * into v_offer from public.ofertas_servicio
  where servicio_id=p_service_id and estado::text='aceptada' and coalesce(distancia_km,999999)<=20
  order by created_at asc limit 1;
  if v_offer.id is null then raise exception 'MATCHING_EVIDENCE_MISSING'; end if;

  select * into v_arrival from public.servicio_estado_eventos
  where servicio_id=p_service_id and estado_nuevo::text='llegado'
  order by created_at asc limit 1;
  if v_arrival.id is null then raise exception 'ARRIVAL_EVIDENCE_MISSING'; end if;

  select * into v_before from public.evidencias_servicio
  where servicio_id=p_service_id and tipo::text='antes'
  order by created_at asc limit 1;
  select * into v_after from public.evidencias_servicio
  where servicio_id=p_service_id and tipo::text='despues'
  order by created_at asc limit 1;
  if v_before.id is null or v_after.id is null then raise exception 'SERVICE_EVIDENCE_MISSING'; end if;

  select * into v_payment from public.pagos
  where servicio_id=p_service_id and fecha_confirmacion is not null
  order by created_at asc limit 1;
  if v_payment.id is null then raise exception 'PAYMENT_EVIDENCE_MISSING'; end if;

  select * into v_close from public.servicio_estado_eventos
  where servicio_id=p_service_id and estado_nuevo::text='completado'
  order by created_at desc limit 1;
  if v_close.id is null then raise exception 'CLOSURE_EVIDENCE_MISSING'; end if;

  select id into v_auditor from public.autonomous_agents
  where department_id=14 and name='UGO Internal Auditor' and status<>'DISABLED'
  order by created_at asc limit 1;
  if v_auditor is null then raise exception 'AUDIT_AGENT_REQUIRED'; end if;

  insert into public.autonomous_service_event_bindings(service_id,event_type,department_id,agent_id,source_reference,correlation_id)
  values
    (p_service_id,'matching',14,v_auditor,'ofertas_servicio:'||v_offer.id,p_correlation_id),
    (p_service_id,'arrival',14,v_auditor,'servicio_estado_eventos:'||v_arrival.id,p_correlation_id),
    (p_service_id,'evidence_before',14,v_auditor,'evidencias_servicio:'||v_before.id,p_correlation_id),
    (p_service_id,'evidence_after',14,v_auditor,'evidencias_servicio:'||v_after.id,p_correlation_id),
    (p_service_id,'payment',14,v_auditor,'pagos:'||v_payment.id,p_correlation_id),
    (p_service_id,'closure',14,v_auditor,'servicio_estado_eventos:'||v_close.id,p_correlation_id)
  on conflict(service_id,event_type,source_reference) do update
    set department_id=excluded.department_id,
        agent_id=excluded.agent_id,
        correlation_id=excluded.correlation_id;

  if not exists (
    select 1 from public.autonomous_decision_ledger
    where correlation_id=p_correlation_id and department_id=14 and decision='P0_AUDIT_CHAIN_BOUND'
  ) then
    insert into public.autonomous_decision_ledger(
      department_id,agent_id,decision,reason,authority_class,policy_version,evidence_refs,authorization_result,correlation_id
    ) values (
      14,v_auditor,'P0_AUDIT_CHAIN_BOUND',
      'Persisted P0 service events bound to one corporate audit correlation',
      'GREEN','audit-event-binding-v1',
      jsonb_build_array('service:'||p_service_id),
      'PASS',p_correlation_id
    );
  end if;

  v_hash := encode(digest((p_service_id::text||':'||p_correlation_id::text||':matching:arrival:evidence_before:evidence_after:payment:closure')::bytea,'sha256'),'hex');
  if not exists (
    select 1 from public.autonomous_evidence_ledger
    where correlation_id=p_correlation_id and evidence_type='P0_AUDIT_EVENT_CHAIN'
  ) then
    insert into public.autonomous_evidence_ledger(
      evidence_type,reference,evidence_hash,metadata,correlation_id
    ) values (
      'P0_AUDIT_EVENT_CHAIN','service:'||p_service_id,v_hash,
      jsonb_build_object(
        'service_id',p_service_id,
        'events',jsonb_build_array('matching','arrival','evidence_before','evidence_after','payment','closure'),
        'binding_count',6
      ),
      p_correlation_id
    );
  end if;

  return public.service_role_judge_p0_audit_chain(p_service_id,p_correlation_id);
end
$$;

revoke all on function public.service_role_bind_p0_audit_chain(uuid,uuid) from public, anon, authenticated;
revoke all on function public.service_role_judge_p0_audit_chain(uuid,uuid) from public, anon, authenticated;
grant execute on function public.service_role_bind_p0_audit_chain(uuid,uuid) to service_role;
grant execute on function public.service_role_judge_p0_audit_chain(uuid,uuid) to service_role;
