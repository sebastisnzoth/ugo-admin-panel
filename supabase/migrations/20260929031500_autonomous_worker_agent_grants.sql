-- Service-role grants required by the browser-independent UGO TEST worker.
-- RLS remains enabled; service_role is the trusted server-side worker identity.
grant select, update on public.autonomous_agents to service_role;
