-- UGO Admin reports: allow authenticated actors to reach retiros through existing RLS.
-- RLS remains the authorization boundary: providers see their own rows; Admin/Super Admin can see all.
grant select on table public.retiros to authenticated;
revoke all on table public.retiros from anon;

notify pgrst,'reload schema';
