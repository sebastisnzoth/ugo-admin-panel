-- UGO TEST/runtime server access for IP fixture cleanup.
-- RLS remains enabled; service_role bypasses RLS but still needs explicit table privileges
-- under current Supabase Data API grant behavior.
grant select, update on table public.ip_innovations to service_role;
