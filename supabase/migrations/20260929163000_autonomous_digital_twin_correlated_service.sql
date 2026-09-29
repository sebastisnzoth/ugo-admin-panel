-- Digital Twin must be judged from one correlated persisted demo service,
-- not from the presence of a helper P0 job label.
create or replace function public.autonomous_execute_corporate_challenges()
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  meta_ok boolean:=false;
  red_ok boolean:=false;
  twin_service uuid;
  summary jsonb;
begin
  select exists(
    select 1
    from public.autonomous_meta_qa_calibrations c
    join public.autonomous_jobs j on j.id=c.job_id
    where j.status='SUCCEEDED'
      and j.capability='qa.meta_persisted_calibration'
      and j.verification_result->>'passed'='true'
      and j.verification_result->>'seeded_defect_detected'='true'
      and j.verification_result->>'permanent_regression'='true'
  ) into meta_ok;

  update public.autonomous_challenges
  set status=case when meta_ok then 'PASSED' else 'FAILED' end,
      result=jsonb_build_object('passed',meta_ok,'source','PERSISTED_META_QA_CALIBRATION','verified_at',now()),
      finished_at=now()
  where challenge_type='META_AUDIT';

  select
    exists(select 1 from public.autonomous_control_coverage where control_key='authority-boundaries' and status='EFFECTIVE')
    and exists(select 1 from public.autonomous_control_coverage where control_key='audit-evidence' and status='EFFECTIVE')
    and exists(select 1 from public.autonomous_jobs where authority_class='RED' and authorization_decision='DENIED' and status='CANCELLED')
    and exists(select 1 from public.autonomous_jobs where authority_class='YELLOW' and authorization_decision='DUAL_CONTROL_PENDING' and status='CANCELLED')
    and exists(select 1 from public.autonomous_recovery_audits where decision='RECOVER')
    and not exists(select 1 from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED')
  into red_ok;

  update public.autonomous_challenges
  set status=case when red_ok then 'PASSED' else 'FAILED' end,
      result=jsonb_build_object(
        'passed',red_ok,'source','PERSISTED_AUTHORITY_AND_RECOVERY_CONTROLS',
        'authority_boundary_effective',exists(select 1 from public.autonomous_control_coverage where control_key='authority-boundaries' and status='EFFECTIVE'),
        'red_denial_observed',exists(select 1 from public.autonomous_jobs where authority_class='RED' and authorization_decision='DENIED' and status='CANCELLED'),
        'yellow_dual_control_observed',exists(select 1 from public.autonomous_jobs where authority_class='YELLOW' and authorization_decision='DUAL_CONTROL_PENDING' and status='CANCELLED'),
        'recovery_audit_observed',exists(select 1 from public.autonomous_recovery_audits where decision='RECOVER'),
        'open_critical_findings',(select count(*) from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED'),
        'verified_at',now()
      ),
      finished_at=now()
  where challenge_type='RED_TEAM';

  select s.id into twin_service
  from public.servicios s
  where s.ambiente='demo'
    and s.estado='completado'
    and s.proveedor_id is not null
    and exists(select 1 from public.ofertas_servicio o where o.servicio_id=s.id and o.estado='aceptada' and o.distancia_km<=20)
    and not exists(select 1 from public.ofertas_servicio o where o.servicio_id=s.id and o.distancia_km>20)
    and exists(select 1 from public.servicio_estado_eventos e where e.servicio_id=s.id and e.estado_nuevo='llegado')
    and exists(select 1 from public.evidencias_servicio e where e.servicio_id=s.id and e.tipo='antes')
    and exists(select 1 from public.evidencias_servicio e where e.servicio_id=s.id and e.tipo='despues')
    and exists(select 1 from public.autonomous_jobs j where j.service_id=s.id and j.capability='qa.uploaded_media_bytes_runtime' and j.status='SUCCEEDED' and j.verification_result->>'passed'='true')
    and exists(select 1 from public.autonomous_service_event_bindings b where b.service_id=s.id)
    and exists(select 1 from public.pagos p where p.servicio_id=s.id and p.metodo='efectivo' and p.fecha_confirmacion is not null)
    and (select count(distinct r.autor_tipo) from public.resenas r where r.servicio_id=s.id)>=2
  order by s.created_at desc
  limit 1;

  update public.autonomous_challenges
  set status=case when twin_service is null then 'BLOCKED' else 'PASSED' end,
      result=case when twin_service is null then
        jsonb_build_object(
          'passed',false,'source','PERSISTED_SINGLE_SERVICE_CORRELATION',
          'blocker','NO_SINGLE_SERVICE_WITH_CORRELATED_LIFECYCLE_MEDIA_AUDIT_PAYMENT_AND_BILATERAL_RATINGS',
          'verified_at',now()
        )
      else
        jsonb_build_object(
          'passed',true,'source','PERSISTED_SINGLE_SERVICE_CORRELATION',
          'service_id',twin_service,'physical_gps_verified',false,'customer_acceptance',false,
          'verified_at',now()
        )
      end,
      finished_at=now()
  where challenge_type='DIGITAL_TWIN';

  select jsonb_object_agg(c.challenge_type,jsonb_build_object('status',c.status,'result',c.result))
  into summary
  from public.autonomous_challenges c
  where c.challenge_type in('META_AUDIT','RED_TEAM','DIGITAL_TWIN','FOUNDER_CHALLENGE');

  return summary;
end$$;

revoke all on function public.autonomous_execute_corporate_challenges() from public,anon,authenticated;
grant execute on function public.autonomous_execute_corporate_challenges() to service_role;
