-- Real deterministic read-only executors for D3/D4 canonical specialists.
-- They read aggregate UGO TEST business state and persist only autonomous audit artifacts.
-- No service/client/provider/payment/dispute row is mutated by this executor.

create or replace function public.autonomous_execute_readonly_specialist(p_agent_id uuid)
returns public.autonomous_jobs
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  a public.autonomous_agents%rowtype;
  result_json jsonb;
  correlation uuid:=gen_random_uuid();
  job public.autonomous_jobs%rowtype;
  idem text;
  now_ts timestamptz:=now();
begin
  select * into a from public.autonomous_agents where id=p_agent_id;
  if a.id is null then raise exception 'AUTONOMOUS_AGENT_NOT_FOUND'; end if;
  if a.department_id not in (3,4) then raise exception 'READONLY_SPECIALIST_SCOPE_DENIED'; end if;
  if a.status='DISABLED' then raise exception 'AUTONOMOUS_AGENT_DISABLED'; end if;
  if not coalesce(a.permissions ? 'advisory_only',false) then raise exception 'READONLY_SPECIALIST_CONTRACT_REQUIRED'; end if;

  case a.agent_key
    when 'client-support-agent' then
      select jsonb_build_object(
        'open_services',count(*) filter(where estado::text not in ('completado','cancelado')),
        'completed_services',count(*) filter(where estado::text='completado'),
        'urgent_open',count(*) filter(where urgencia and estado::text not in ('completado','cancelado')),
        'generated_at',now_ts
      ) into result_json from public.servicios;

    when 'client-journey-agent' then
      select jsonb_build_object(
        'services_total',count(*),
        'searching',count(*) filter(where estado::text in ('buscando','pendiente')),
        'accepted',count(*) filter(where aceptado_at is not null),
        'started',count(*) filter(where iniciado_at is not null),
        'completed',count(*) filter(where completado_at is not null),
        'cancelled',count(*) filter(where cancelado_at is not null),
        'generated_at',now_ts
      ) into result_json from public.servicios;

    when 'billing-support-agent' then
      select jsonb_build_object(
        'provider_debts_total',count(*),
        'provider_debts_open',count(*) filter(where estado not in ('pagado','anulado')),
        'pending_balance_brl',coalesce(sum(saldo_pendiente) filter(where estado not in ('pagado','anulado') and moneda='BRL'),0),
        'generated_at',now_ts
      ) into result_json from public.deudas_ugo_proveedor;

    when 'complaint-agent' then
      select jsonb_build_object(
        'disputes_total',count(*),
        'open_disputes',count(*) filter(where estado::text not in ('resuelta','cerrada','cancelada')),
        'human_required',count(*) filter(where requiere_humano),
        'financial_adjustment_pending',count(*) filter(where ajuste_financiero_pendiente),
        'generated_at',now_ts
      ) into result_json from public.disputas;

    when 'retention-agent' then
      select jsonb_build_object(
        'clients_total',count(*) filter(where tipo::text='cliente'),
        'active_clients',count(*) filter(where tipo::text='cliente' and activo),
        'clients_created_30d',count(*) filter(where tipo::text='cliente' and created_at>=now_ts-interval '30 days'),
        'generated_at',now_ts
      ) into result_json from public.usuarios;

    when 'client-feedback-agent' then
      select jsonb_build_object(
        'reviews_total',count(*),
        'client_authored_reviews',count(*) filter(where coalesce(autor_tipo,'cliente')='cliente'),
        'average_rating',round(coalesce(avg(puntuacion),0)::numeric,2),
        'low_ratings',count(*) filter(where puntuacion<=2),
        'generated_at',now_ts
      ) into result_json from public.resenas;

    when 'voice-of-client-agent' then
      select jsonb_build_object(
        'client_reviews',count(*) filter(where coalesce(autor_tipo,'cliente')='cliente'),
        'average_client_rating',round(coalesce(avg(puntuacion) filter(where coalesce(autor_tipo,'cliente')='cliente'),0)::numeric,2),
        'client_low_ratings',count(*) filter(where coalesce(autor_tipo,'cliente')='cliente' and puntuacion<=2),
        'generated_at',now_ts
      ) into result_json from public.resenas;

    when 'provider-recruitment-agent' then
      select jsonb_build_object(
        'provider_accounts',count(*) filter(where tipo::text='proveedor'),
        'active_provider_accounts',count(*) filter(where tipo::text='proveedor' and activo),
        'providers_created_30d',count(*) filter(where tipo::text='proveedor' and created_at>=now_ts-interval '30 days'),
        'generated_at',now_ts
      ) into result_json from public.usuarios;

    when 'provider-onboarding-agent' then
      select jsonb_build_object(
        'provider_accounts',count(*) filter(where tipo::text='proveedor'),
        'missing_category',count(*) filter(where tipo::text='proveedor' and coalesce(array_length(categorias_ids,1),0)=0 and categoria is null),
        'missing_location',count(*) filter(where tipo::text='proveedor' and (lat is null or lng is null)),
        'generated_at',now_ts
      ) into result_json from public.usuarios;

    when 'provider-activation-agent' then
      select jsonb_build_object(
        'verified_visible',count(*),
        'online',count(*) filter(where online),
        'available',count(*) filter(where disponible),
        'online_and_available',count(*) filter(where online and disponible),
        'generated_at',now_ts
      ) into result_json from public.proveedores_mapa;

    when 'provider-supply-agent' then
      select jsonb_build_object(
        'provider_supply_total',count(*),
        'provider_supply_online',count(*) filter(where online),
        'provider_supply_available',count(*) filter(where disponible),
        'categories_visible',count(distinct categoria_nombre),
        'generated_at',now_ts
      ) into result_json from public.proveedores_mapa;

    when 'provider-quality-agent' then
      select jsonb_build_object(
        'reviews_total',count(*),
        'average_rating',round(coalesce(avg(puntuacion),0)::numeric,2),
        'ratings_1_2',count(*) filter(where puntuacion<=2),
        'ratings_4_5',count(*) filter(where puntuacion>=4),
        'generated_at',now_ts
      ) into result_json from public.resenas;

    when 'provider-retention-agent' then
      select jsonb_build_object(
        'providers_visible',count(*),
        'providers_with_completed_services',count(*) filter(where servicios_completados>0),
        'average_completed_services',round(coalesce(avg(servicios_completados),0)::numeric,2),
        'generated_at',now_ts
      ) into result_json from public.proveedores_mapa;

    when 'provider-fairness-agent' then
      select jsonb_build_object(
        'providers_visible',count(*),
        'min_completed_services',coalesce(min(servicios_completados),0),
        'max_completed_services',coalesce(max(servicios_completados),0),
        'avg_completed_services',round(coalesce(avg(servicios_completados),0)::numeric,2),
        'generated_at',now_ts
      ) into result_json from public.proveedores_mapa;

    when 'provider-support-agent' then
      select jsonb_build_object(
        'active_provider_services',count(*) filter(where proveedor_id is not null and estado::text not in ('completado','cancelado')),
        'completed_provider_services',count(*) filter(where proveedor_id is not null and estado::text='completado'),
        'generated_at',now_ts
      ) into result_json from public.servicios;

    when 'voice-of-provider-agent' then
      select jsonb_build_object(
        'provider_authored_reviews',count(*) filter(where autor_tipo='proveedor'),
        'average_provider_rating',round(coalesce(avg(puntuacion) filter(where autor_tipo='proveedor'),0)::numeric,2),
        'provider_low_ratings',count(*) filter(where autor_tipo='proveedor' and puntuacion<=2),
        'generated_at',now_ts
      ) into result_json from public.resenas;

    else
      raise exception 'READONLY_SPECIALIST_EXECUTOR_NOT_IMPLEMENTED';
  end case;

  idem:='readonly-specialist:'||a.agent_key||':'||to_char(now_ts,'YYYYMMDDHH24MI');

  insert into public.autonomous_jobs(
    department_id,agent_id,objective,trigger_type,target_type,target_id,
    authority_class,status,idempotency_key,correlation_id,input_evidence,result,
    data_quality_status,capability,policy_version,authorization_decision,
    execution_result,verification_result,actual_cost,started_at,finished_at
  ) values(
    a.department_id,a.id,'Deterministic read-only aggregate analysis for '||a.agent_key,
    'READONLY_SPECIALIST_EXECUTOR','autonomous_agent',a.id::text,
    a.authority_class,'SUCCEEDED',idem,correlation,'[]'::jsonb,result_json,
    'TRUSTED','advisory.readonly.'||a.agent_key,'AUTONOMOUS_CORP_V1',
    'AUTHORIZED_ADVISORY_EXECUTOR',result_json,
    jsonb_build_object('passed',true,'readonly',true,'aggregate_only',true),
    0,now_ts,now_ts
  )
  on conflict(idempotency_key) do update set idempotency_key=excluded.idempotency_key
  returning * into job;

  insert into public.autonomous_evidence_ledger(
    job_id,evidence_type,reference,metadata,correlation_id
  ) values(
    job.id,'READONLY_SPECIALIST_EXECUTION',
    'ugo-test:readonly-specialist:'||a.agent_key||':'||job.id::text,
    jsonb_build_object(
      'agent_key',a.agent_key,
      'department_id',a.department_id,
      'readonly',true,
      'aggregate_only',true,
      'result_keys',(select jsonb_agg(key) from jsonb_object_keys(result_json) key)
    ),
    job.correlation_id
  )
  on conflict do nothing;

  insert into public.autonomous_decision_ledger(
    job_id,department_id,agent_id,decision,reason,authority_class,
    policy_version,evidence_refs,authorization_result,correlation_id
  ) values(
    job.id,a.department_id,a.id,'READONLY_SPECIALIST_EXECUTED',
    'Deterministic aggregate-only executor; no business mutation',
    a.authority_class,'AUTONOMOUS_CORP_V1',
    jsonb_build_array('autonomous_jobs/'||job.id::text||'/result'),
    'AUTHORIZED_READONLY',job.correlation_id
  );

  return job;
end $$;

revoke all on function public.autonomous_execute_readonly_specialist(uuid) from public,anon,authenticated;
grant execute on function public.autonomous_execute_readonly_specialist(uuid) to service_role;

-- Allow only this exact service-role readonly executor to persist a successful job for advisory agents.
create or replace function private.autonomous_guard_advisory_agent_no_mutation()
returns trigger
language plpgsql
security definer
set search_path=public,private,auth,pg_temp
as $$
declare advisory boolean:=false;
begin
  if new.agent_id is null then return new; end if;
  select coalesce(a.permissions ? 'advisory_only',false) into advisory
  from public.autonomous_agents a where a.id=new.agent_id;

  if advisory
     and new.status not in ('CANCELLED','BLOCKED')
     and not (
       new.status='SUCCEEDED'
       and new.trigger_type='READONLY_SPECIALIST_EXECUTOR'
       and new.authorization_decision='AUTHORIZED_ADVISORY_EXECUTOR'
       and new.capability like 'advisory.readonly.%'
       and coalesce(new.verification_result->>'readonly','false')='true'
       and coalesce(new.verification_result->>'aggregate_only','false')='true'
     )
  then
    raise exception 'ADVISORY_AGENT_NO_MUTATION_EXECUTOR' using errcode='42501';
  end if;
  return new;
end $$;

revoke all on function private.autonomous_guard_advisory_agent_no_mutation() from public,anon,authenticated;
