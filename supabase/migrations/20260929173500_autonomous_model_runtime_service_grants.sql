-- Minimal service-role grants required by the governed model router runtime.
grant select on public.autonomous_model_routes to service_role;
grant select,insert on public.autonomous_model_metrics to service_role;
