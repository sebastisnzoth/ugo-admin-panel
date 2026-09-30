-- Index the new actionable-agent artifact foreign keys used by Super Admin filters.
create index if not exists autonomous_action_artifacts_department_idx
on public.autonomous_action_artifacts(department_id);
create index if not exists autonomous_action_artifacts_agent_idx
on public.autonomous_action_artifacts(agent_id);
