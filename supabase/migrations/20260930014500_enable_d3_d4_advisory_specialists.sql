-- Enable the D3/D4 canonical specialists as governed advisory workers in UGO TEST.
-- They may inspect persisted evidence through the existing consultation route, but they
-- are explicitly advisory_only and therefore have no mutation executor in Super Admin.
-- Operational mutations remain blocked until a separate capability-specific executor is validated.

with specialist_contract(agent_key,capability,permission_key) as (
  values
    ('client-support-agent','Client support triage from persisted UGO evidence','client_support'),
    ('client-journey-agent','Client journey analysis from persisted UGO evidence','client_journey'),
    ('billing-support-agent','Billing support analysis from persisted UGO evidence','billing_support'),
    ('complaint-agent','Complaint triage from persisted UGO evidence','complaint_triage'),
    ('retention-agent','Client retention analysis from persisted UGO evidence','client_retention'),
    ('client-feedback-agent','Client feedback synthesis from persisted UGO evidence','client_feedback'),
    ('voice-of-client-agent','Voice-of-client synthesis from persisted UGO evidence','voice_of_client'),
    ('provider-recruitment-agent','Provider recruitment analysis from persisted UGO evidence','provider_recruitment'),
    ('provider-onboarding-agent','Provider onboarding analysis from persisted UGO evidence','provider_onboarding'),
    ('provider-activation-agent','Provider activation analysis from persisted UGO evidence','provider_activation'),
    ('provider-supply-agent','Provider supply analysis from persisted UGO evidence','provider_supply'),
    ('provider-quality-agent','Provider quality analysis from persisted UGO evidence','provider_quality'),
    ('provider-retention-agent','Provider retention analysis from persisted UGO evidence','provider_retention'),
    ('provider-fairness-agent','Provider fairness analysis from persisted UGO evidence','provider_fairness'),
    ('provider-support-agent','Provider support triage from persisted UGO evidence','provider_support'),
    ('voice-of-provider-agent','Voice-of-provider synthesis from persisted UGO evidence','voice_of_provider')
)
update public.autonomous_agents a
set
  capability = s.capability,
  status = 'IDLE',
  model_provider = 'openrouter',
  model_id = 'FREE_FIRST',
  permissions = jsonb_build_array('advisory_only','persisted_evidence_read',s.permission_key),
  updated_at = now()
from specialist_contract s
where a.agent_key = s.agent_key
  and a.department_id in (3,4)
  and a.status = 'DISABLED';

-- Fail closed if a future roster change silently removes one of the expected specialists.
do $$
declare enabled_count integer;
begin
  select count(*) into enabled_count
  from public.autonomous_agents
  where department_id in (3,4)
    and permissions ? 'advisory_only'
    and status <> 'DISABLED';
  if enabled_count < 16 then
    raise exception 'D3_D4_ADVISORY_SPECIALIST_ENABLEMENT_INCOMPLETE: %/16', enabled_count;
  end if;
end $$;
