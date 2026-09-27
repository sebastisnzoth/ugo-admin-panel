-- UGO security · matching is an authenticated client/admin RPC, never an anonymous endpoint.
-- The function already validates auth.uid(); tighten EXECUTE grants so anon/PUBLIC cannot invoke it.

revoke all on function public.iniciar_matching(uuid) from public;
revoke all on function public.iniciar_matching(uuid) from anon;
grant execute on function public.iniciar_matching(uuid) to authenticated;
grant execute on function public.iniciar_matching(uuid) to service_role;

notify pgrst,'reload schema';
