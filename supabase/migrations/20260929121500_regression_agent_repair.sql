-- Corrective, idempotent enablement for the deterministic D9 Regression Agent in UGO TEST.
-- Historical migrations remain immutable; this repairs states where the canonical agent exists but is not IDLE.
do $$
begin
  if to_regclass('public.autonomous_agents') is null then return; end if;
  update public.autonomous_agents
  set status='IDLE',
      capability='Reconcile permanent regressions from persisted QA runs',
      permissions='["qa.regression_reconcile"]'::jsonb,
      authority_class='GREEN',
      model_provider=null,
      model_id=null,
      updated_at=now()
  where agent_key='regression-agent'
    and department_id=9
    and status<>'IDLE';
end $$;
