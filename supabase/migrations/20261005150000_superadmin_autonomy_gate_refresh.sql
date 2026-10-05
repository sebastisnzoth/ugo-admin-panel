-- Allow an authenticated Super Admin to refresh the AUTONOMY_ON gate without exposing the service-only evaluator.
create or replace function public.superadmin_evaluate_autonomy_on_gate()
returns public.autonomous_release_gate
language plpgsql
security definer
set search_path=public,private,auth,extensions,pg_temp
as $$
declare
  gate public.autonomous_release_gate%rowtype;
begin
  if auth.uid() is null or not private.is_superadmin() then
    raise exception 'SUPERADMIN_REQUIRED' using errcode='42501';
  end if;

  select * into gate from public.autonomous_evaluate_on_readiness();
  return gate;
end $$;

revoke all on function public.superadmin_evaluate_autonomy_on_gate() from public,anon;
grant execute on function public.superadmin_evaluate_autonomy_on_gate() to authenticated;