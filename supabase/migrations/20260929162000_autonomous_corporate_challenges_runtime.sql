-- Deterministic execution of pre-production corporate challenges.
-- Founder Challenge remains human-only by design.
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
  -- META_AUDIT: requires a persisted calibration whose governed job verified
  -- seeded defect detection and permanent regression.
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
      result=jsonb_build_object(
        'passed',meta_ok,
        'source','PERSISTED_META_QA_CALIBRATION',
        'verified_at',now()
      ),
      finished_at=now()
  where challenge_type='META_AUDIT';

  -- RED_TEAM: require deterministic authority controls plus persisted negative
  -- authority outcomes and verified recovery evidence.
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
        'passed',red_ok,
        'source','PERSISTED_AUTHORITY_AND_RECOVERY_CONTROLS',
        'authority_boundary_effective',
          exists(select 1 from public.autonomous_control_coverage where control_key='authority-boundaries' and status='EFFECTIVE'),
        'red_denial_observed',
          exists(select 1 from public.autonomous_jobs where authority_class='RED' and authorization_decision='DENIED' and status='CANCELLED'),
        'yellow_dual_control_observed',
          exists(select 1 from public.autonomous_jobs where authority_class='YELLOW' and authorization_decision='DUAL_CONTROL_PENDING' and status='CANCELLED'),
        'recovery_audit_observed',
          exists(select 1 from public.autonomous_recovery_audits where decision='RECOVER'),
        'open_critical_findings',
          (select count(*) from public.autonomous_audit_findings where severity='CRITICAL' and status<>'CLOSED'),
        'verified_at',now()
      ),
      finished_at=now()
  where challenge_type='RED_TEAM';

  -- DIGITAL_TWIN must use one serviceId across all required evidence domains.
  select s.id into twin_service
  from public.servicios s
  where s.ambiente='demo'
    and s.estado='completado'
    and exists(select 1 from public.autonomous_jobs j where j.service_id=s.id and j.capability='qa.p0.persisted_journey' and j.status='SUCCEEDED')
    and exists(select 1 from public.autonomous_jobs j where j.service_id=s.id and j.capability='qa.uploaded_media_bytes_runtime' and j.status='SUCCEEDED')
    and exists(select 1 from public.autonomous_service_event_bindings b where b.service_id=s.id)
    and exists(select 1 from public.pagos p where p.servicio_id=s.id)
    and (select count(*) from public.resenas r where r.servicio_id=s.id)>=2
  order by s.created_at desc
  limit 1;

  update public.autonomous_challenges
  set status=case when twin_service is null then 'BLOCKED' else 'PASSED' end,
      result=case when twin_service is null then
        jsonb_build_object(
          'passed',false,
          'source','PERSISTED_SINGLE_SERVICE_CORRELATION',
          'blocker','NO_SINGLE_SERVICE_WITH_P0_MEDIA_AUDIT_PAYMENT_AND_BILATERAL_RATINGS',
          'verified_at',now()
        )
      else
        jsonb_build_object(
          'passed',true,
          'source','PERSISTED_SINGLE_SERVICE_CORRELATION',
          'service_id',twin_service,
          'verified_at',now()
        )
      end,
      finished_at=now()
  where challenge_type='DIGITAL_TWIN';

  select jsonb_object_agg(c.challenge_type,jsonb_build_object('status',c.status,'result',c.result))
  into summary
  from public.autonomous_challenges c
  where challenge_type in('META_AUDIT','RED_TEAM','DIGITAL_TWIN','FOUNDER_CHALLENGE');

  return summary;
end$$;

revoke all on function public.autonomous_execute_corporate_challenges() from public,anon,authenticated;
grant execute on function public.autonomous_execute_corporate_challenges() to service_role;
