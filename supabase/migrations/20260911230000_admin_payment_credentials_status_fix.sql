-- UGO · Admin payment credential status hardening.
-- Avoid relying on jsonb_object_length for the configured check and keep the
-- RPC admin-only. No credential values are ever returned to the browser.

create or replace function public.admin_payment_credentials_status()
returns table(
  provider text,
  country text,
  environment text,
  enabled boolean,
  configured boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  return query
  select
    p.provider,
    p.country,
    p.environment,
    p.enabled,
    coalesce(p.credentials, '{}'::jsonb) <> '{}'::jsonb as configured,
    p.updated_at
  from private.payment_credentials p
  order by p.country, p.provider;
end;
$$;

revoke all on function public.admin_payment_credentials_status() from public, anon;
grant execute on function public.admin_payment_credentials_status() to authenticated, service_role;
