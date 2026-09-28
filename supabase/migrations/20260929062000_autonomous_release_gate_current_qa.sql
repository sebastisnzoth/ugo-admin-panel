-- Consider only the latest deterministic QA verdict per scenario. Historical seeded defects
-- and failures that were subsequently remediated remain in the append-only ledger.
create or replace function public.superadmin_evaluate_release_gate(p_gate_key text default 'CUSTOMER_1')
returns public.autonomous_release_gate language plpgsql security definer set search_path=public,private,auth as $$
declare blockers jsonb:='[]'::jsonb;r public.autonomous_release_gate%rowtype;meta_ok boolean:=false;
begin
 if auth.uid() is null or not private.is_superadmin() then raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';end if;
 select coalesce(meta_qa_validated,false) into meta_ok from public.autonomous_release_gate where gate_key=p_gate_key;
 if exists(select 1 from public.autonomous_audit_findings where status='OPEN' and severity='CRITICAL')then blockers:=blockers||'"OPEN_CRITICAL_FINDING"'::jsonb;end if;
 if not exists(select 1 from public.autonomous_quality_coverage) or exists(select 1 from public.autonomous_quality_coverage where status<>'COVERED')then blockers:=blockers||'"QA_COVERAGE_INCOMPLETE"'::jsonb;end if;
 if exists(select 1 from public.autonomous_qa_scenarios scenario cross join lateral (select r.status,r.judge_result from public.autonomous_qa_runs r where r.scenario_id=scenario.id order by r.finished_at desc nulls last,r.started_at desc nulls last,r.id desc limit 1) latest where latest.status in('FAILED','BLOCKED') and not coalesce((latest.judge_result->>'expected_failure_detected')::boolean,false))then blockers:=blockers||'"QA_RUN_FAILURE"'::jsonb;end if;
 if exists(select 1 from public.autonomous_jobs where status='RUNNING' and lease_expires_at<now())then blockers:=blockers||'"STALE_AUTONOMOUS_JOB"'::jsonb;end if;
 if not meta_ok then blockers:=blockers||'"META_QA_NOT_VALIDATED"'::jsonb;end if;
 if exists(select 1 from public.autonomous_model_routes where status not in('READY','DISABLED'))then blockers:=blockers||'"MODEL_ROUTER_NOT_READY"'::jsonb;end if;
 if p_gate_key='CUSTOMER_1' and not exists(
   select 1 from public.servicios s
   where s.estado='completado' and coalesce(s.metadata->>'qa_p0','false')<>'true'
     and s.ambiente='real'
     and exists(select 1 from public.usuarios c where c.id=s.cliente_id and c.es_demo is not true)
     and exists(select 1 from public.usuarios p where p.id=s.proveedor_id and p.es_demo is not true)
     and exists(select 1 from public.ofertas_servicio o where o.servicio_id=s.id and o.estado='aceptada' and o.distancia_km<=20)
     and exists(select 1 from public.evidencias_servicio e where e.servicio_id=s.id and e.tipo='antes')
     and exists(select 1 from public.evidencias_servicio e where e.servicio_id=s.id and e.tipo='despues')
     and exists(select 1 from public.pagos p where p.servicio_id=s.id and p.fecha_confirmacion is not null)
     and (select count(distinct autor_tipo) from public.resenas where servicio_id=s.id)>=2
 ) then blockers:=blockers||'"REAL_CUSTOMER_JOURNEY_NOT_VERIFIED"'::jsonb;end if;
 if p_gate_key='CUSTOMER_1' and exists(
   select 1 from (values ('FULL-E2E'),('TWO-DEVICES')) as required(code)
   where not exists(select 1 from public.development_checklist d where d.code=required.code and d.status='approved')
 ) then blockers:=blockers||'"CUSTOMER_ACCEPTANCE_NOT_APPROVED"'::jsonb;end if;
 insert into public.autonomous_release_gate(gate_key,status,blockers,evaluated_at,evaluated_by,meta_qa_validated)
 values(p_gate_key,case when jsonb_array_length(blockers)=0 then'READY'else'BLOCKED'end,blockers,now(),auth.uid(),meta_ok)
 on conflict(gate_key)do update set status=excluded.status,blockers=excluded.blockers,evaluated_at=now(),evaluated_by=auth.uid(),meta_qa_validated=meta_ok returning * into r;
 return r;
end$$;
