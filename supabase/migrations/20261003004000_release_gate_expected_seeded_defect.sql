-- CUSTOMER_1 release gate must not treat the controlled meta-QA seeded defect as a product QA failure.
-- The seeded scenario is healthy precisely when the persisted judge detects the injected defect.
-- Historical append-only failures remain untouched; only current gate interpretation is corrected.

create or replace function private.current_release_gate_snapshot(p_gate_key text)
returns jsonb
language sql
stable
security definer
set search_path to 'public','private','auth','extensions','pg_temp'
as $function$
select jsonb_build_object(
  'gate_key',p_gate_key,
  'no_open_critical_findings',not exists(
    select 1 from public.autonomous_audit_findings where status='OPEN' and severity='CRITICAL'
  ),
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
      and not (
        scenario.scenario_key='qa-meta-seeded-defect'
        and latest.status='FAILED'
        and coalesce((latest.judge_result->>'seeded_defect_detected')::boolean,false)
      )
  ),
  'no_stale_jobs',not exists(
    select 1 from public.autonomous_jobs where status='RUNNING' and lease_expires_at<now()
  ),
  'meta_qa_validated',coalesce(
    (select meta_qa_validated from public.autonomous_release_gate where gate_key=p_gate_key),false
  ),
  'model_router_ready',not exists(
    select 1 from public.autonomous_model_routes where status not in('READY','DISABLED')
  ),
  'kill_switches_clear',not exists(
    select 1 from public.autonomous_kill_switches where enabled=true
  ),
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
$function$;

revoke all on function private.current_release_gate_snapshot(text) from public,anon,authenticated;
