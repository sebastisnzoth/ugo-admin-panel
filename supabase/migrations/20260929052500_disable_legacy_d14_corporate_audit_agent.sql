-- Preserve legacy audit history but remove the duplicate D14 agent from the active roster.
update public.autonomous_agents
set status='DISABLED', updated_at=now()
where department_id=14
  and agent_key='corporate-audit-agent'
  and status<>'DISABLED';
