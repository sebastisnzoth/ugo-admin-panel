-- UGO TEST/runtime support for authenticated server-side Hugo audit persistence.
-- Service role remains server-only; RLS stays enabled on all three tables.
grant insert on table public.autonomous_decision_ledger to service_role;
grant insert on table public.audit_log to service_role;
grant usage, select on sequence public.audit_log_id_seq to service_role;
