-- The public matching gateway is SECURITY INVOKER. Authenticated clients must
-- be allowed to call its existing private implementation, which independently
-- requires auth.uid() and checks service ownership/admin authority before writes.
-- Keep that implementation outside the exposed API schema; preserve wrapper RLS.
-- Do not add SECURITY DEFINER to the public wrapper or grant anonymous access.
-- Reversible rollback: revoke execute on function
-- private.iniciar_matching_impl(uuid) from authenticated.
revoke all on function private.iniciar_matching_impl(uuid) from public, anon;
grant execute on function private.iniciar_matching_impl(uuid) to authenticated;
notify pgrst, 'reload schema';
