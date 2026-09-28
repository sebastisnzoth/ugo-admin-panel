-- Runtime probe persists only the validated model candidate needed by the fail-closed connector.
grant select,insert,update on public.autonomous_model_candidates to service_role;
