-- Keep zero-cost model routes aligned with fresh runtime-validated candidates.
-- READY is forbidden when the selected primary candidate is unavailable/stale.
create or replace function public.autonomous_reconcile_model_routes()
returns jsonb
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  primary_id uuid;
  fallback_id uuid;
  primary_provider text;
  primary_model text;
  fallback_provider text;
  fallback_model text;
  affected integer;
  freshness interval:=interval '20 minutes';
begin
  -- Service-role-only execution boundary is enforced by EXECUTE grants below.
  select id,provider,model_id
    into primary_id,primary_provider,primary_model
  from public.autonomous_model_candidates
  where free_tier is true
    and eligible is true
    and availability='AVAILABLE'
    and benchmark_score>=benchmark_threshold
    and last_benchmarked_at>=now()-freshness
  order by
    case provider when 'gemini' then 0 when 'openrouter' then 1 else 2 end,
    benchmark_score desc nulls last,
    last_benchmarked_at desc
  limit 1;

  if primary_id is null then
    update public.autonomous_model_routes
      set primary_candidate_id=null,
          fallback_candidate_id=null,
          status='DEGRADED',
          updated_at=now()
    where task_class in('AGENT_CONSULTATION','CORPORATE_ANALYSIS','QA_DIAGNOSIS');
    get diagnostics affected=row_count;
    return jsonb_build_object(
      'passed',false,
      'status','DEGRADED',
      'reason','NO_FRESH_RUNTIME_VALIDATED_FREE_MODEL',
      'routes_updated',affected
    );
  end if;

  select id,provider,model_id
    into fallback_id,fallback_provider,fallback_model
  from public.autonomous_model_candidates
  where id<>primary_id
    and free_tier is true
    and eligible is true
    and availability='AVAILABLE'
    and benchmark_score>=benchmark_threshold
    and last_benchmarked_at>=now()-interval '24 hours'
  order by
    case when provider<>primary_provider then 0 else 1 end,
    benchmark_score desc nulls last,
    last_benchmarked_at desc
  limit 1;

  update public.autonomous_model_routes
    set primary_candidate_id=primary_id,
        fallback_candidate_id=fallback_id,
        max_cost=0,
        status='READY',
        updated_at=now()
  where task_class in('AGENT_CONSULTATION','CORPORATE_ANALYSIS','QA_DIAGNOSIS');
  get diagnostics affected=row_count;

  return jsonb_build_object(
    'passed',true,
    'status','READY',
    'routes_updated',affected,
    'primary',jsonb_build_object('provider',primary_provider,'model_id',primary_model),
    'fallback',case when fallback_id is null then null else
      jsonb_build_object('provider',fallback_provider,'model_id',fallback_model) end,
    'max_cost',0
  );
end$$;

revoke all on function public.autonomous_reconcile_model_routes() from public,anon,authenticated;
grant execute on function public.autonomous_reconcile_model_routes() to service_role;
