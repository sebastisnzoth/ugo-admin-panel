create schema if not exists private;

create table if not exists private.payment_credentials (
  provider text primary key,
  country text not null,
  environment text not null default 'sandbox',
  credentials jsonb not null default '{}'::jsonb,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

alter table private.payment_credentials enable row level security;
revoke all on private.payment_credentials from public, anon, authenticated;

create or replace function public.admin_payment_credentials_status()
returns table (
  provider text,
  country text,
  environment text,
  enabled boolean,
  configured boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
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
    jsonb_object_length(coalesce(p.credentials, '{}'::jsonb)) > 0 as configured,
    p.updated_at
  from private.payment_credentials p
  order by p.country, p.provider;
end;
$$;

create or replace function public.admin_set_payment_credentials(
  p_provider text,
  p_country text,
  p_environment text,
  p_credentials jsonb,
  p_enabled boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_provider text := lower(trim(coalesce(p_provider,'')));
  v_country text := upper(trim(coalesce(p_country,'')));
  v_environment text := lower(trim(coalesce(p_environment,'')));
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;

  if v_provider not in ('openpix','mercadopago_br','mercadopago_ar') then
    raise exception 'invalid provider';
  end if;
  if v_country not in ('BR','AR') then
    raise exception 'invalid country';
  end if;
  if v_environment not in ('sandbox','production') then
    raise exception 'invalid environment';
  end if;
  if p_credentials is null or jsonb_typeof(p_credentials) <> 'object' then
    raise exception 'credentials must be a json object';
  end if;

  insert into private.payment_credentials(provider,country,environment,credentials,enabled,updated_at,updated_by)
  values(v_provider,v_country,v_environment,p_credentials,coalesce(p_enabled,false),now(),auth.uid())
  on conflict(provider) do update set
    country=excluded.country,
    environment=excluded.environment,
    credentials=excluded.credentials,
    enabled=excluded.enabled,
    updated_at=now(),
    updated_by=auth.uid();
end;
$$;

create or replace function public.admin_clear_payment_credentials(p_provider text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if not private.is_admin(auth.uid()) then
    raise exception 'not authorized';
  end if;
  update private.payment_credentials
  set credentials='{}'::jsonb, enabled=false, updated_at=now(), updated_by=auth.uid()
  where provider=lower(trim(p_provider));
end;
$$;

revoke all on function public.admin_payment_credentials_status() from public, anon;
revoke all on function public.admin_set_payment_credentials(text,text,text,jsonb,boolean) from public, anon;
revoke all on function public.admin_clear_payment_credentials(text) from public, anon;
grant execute on function public.admin_payment_credentials_status() to authenticated;
grant execute on function public.admin_set_payment_credentials(text,text,text,jsonb,boolean) to authenticated;
grant execute on function public.admin_clear_payment_credentials(text) to authenticated;
