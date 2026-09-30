-- UGO TEST/production-safe schema contract: expose saved places to authenticated clients.
-- RLS owner policies already exist in 20260920100000_client_saved_places.sql.
-- Explicit GRANT is required on projects where Data API default privileges are disabled.
grant select, insert, update, delete on table public.direcciones_cliente to authenticated;
grant select, insert, update, delete on table public.direcciones_cliente to service_role;
notify pgrst, 'reload schema';
