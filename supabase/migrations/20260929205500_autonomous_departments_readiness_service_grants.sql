-- Minimal service-role grants for the auto-departments readiness runtime.
-- The service_role credential is server-side only; client RLS remains unchanged.
grant select, update on table public.autonomous_departments to service_role;
grant select, insert on table public.autonomous_jobs to service_role;
grant select, insert on table public.autonomous_evidence_ledger to service_role;
