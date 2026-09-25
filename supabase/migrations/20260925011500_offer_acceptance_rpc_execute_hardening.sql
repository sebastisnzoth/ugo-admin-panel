-- UGO P0.2 · harden provider offer acceptance RPC execution surface.
-- Later CREATE OR REPLACE revisions of aceptar_oferta_impl in TEST restored
-- default EXECUTE privileges. Keep the public wrapper authenticated-only and
-- keep the SECURITY DEFINER helper callable only by authenticated/service_role.

revoke all on function public.aceptar_oferta(uuid) from public;
revoke all on function public.aceptar_oferta(uuid) from anon;
grant execute on function public.aceptar_oferta(uuid) to authenticated;

revoke all on function private.aceptar_oferta_impl(uuid) from public;
revoke all on function private.aceptar_oferta_impl(uuid) from anon;
grant execute on function private.aceptar_oferta_impl(uuid) to authenticated;
grant execute on function private.aceptar_oferta_impl(uuid) to service_role;

notify pgrst,'reload schema';
