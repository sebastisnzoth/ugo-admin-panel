-- UGO client-payment readiness: trusted server audit/cleanup access.
-- Keeps anon locked out and does not widen client/provider privileges.
grant select, delete on table public.deudas_ugo_proveedor to service_role;
grant select, delete on table public.audit_log to service_role;

revoke all on table public.deudas_ugo_proveedor from anon;
revoke all on table public.audit_log from anon;
