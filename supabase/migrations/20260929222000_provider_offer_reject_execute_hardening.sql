-- UGO readiness provider-accept · harden offer rejection RPC execution surface.
-- Keep provider accept/reject parity: anon/public cannot invoke either mutation,
-- while authenticated providers remain authorized through auth.uid() checks.

revoke all on function public.rechazar_oferta(uuid) from public;
revoke all on function public.rechazar_oferta(uuid) from anon;
grant execute on function public.rechazar_oferta(uuid) to authenticated;

revoke all on function private.rechazar_oferta_impl(uuid) from public;
revoke all on function private.rechazar_oferta_impl(uuid) from anon;
grant execute on function private.rechazar_oferta_impl(uuid) to authenticated;
grant execute on function private.rechazar_oferta_impl(uuid) to service_role;

notify pgrst,'reload schema';
