-- Autonomous TEST worker needs only the model-router reads and agent route update required by the connector.
grant select on public.autonomous_model_candidates to service_role;
grant select,update on public.autonomous_agents to service_role;
