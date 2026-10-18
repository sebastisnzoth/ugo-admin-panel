-- UGO KYC country configuration. No production execution by this PR.
-- Rollback (only after backup and confirming unused): DROP TABLE public.config_validacion_pais; DROP FUNCTION private.ugo_kyc_superadmin();
create table if not exists public.config_validacion_pais (
  id uuid primary key default gen_random_uuid(),
  codigo_iso text not null unique check (codigo_iso ~ '^[A-Z]{2}$'),
  pais text not null,
  activo boolean not null default false,
  docs_requeridos text[] not null default '{}',
  reglas_ocr jsonb not null default '{"docs":{}}'::jsonb check (jsonb_typeof(reglas_ocr)='object'),
  updated_at timestamptz not null default now()
);
alter table public.config_validacion_pais enable row level security;
create or replace function private.ugo_kyc_superadmin()
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$select exists(select 1 from public.usuarios where id=auth.uid() and tipo='superadmin' and activo is true)$$;
revoke all on function private.ugo_kyc_superadmin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.ugo_kyc_superadmin() to authenticated;
revoke all on public.config_validacion_pais from public, anon;
grant select on public.config_validacion_pais to authenticated;
grant update(activo) on public.config_validacion_pais to authenticated;
drop policy if exists kyc_country_admin_read on public.config_validacion_pais;
create policy kyc_country_admin_read on public.config_validacion_pais for select to authenticated using (private.is_admin());
drop policy if exists kyc_country_superadmin_update on public.config_validacion_pais;
create policy kyc_country_superadmin_update on public.config_validacion_pais for update to authenticated
 using (private.ugo_kyc_superadmin()) with check (private.ugo_kyc_superadmin());
-- Country shells are intentionally inactive until actual identity requirements are approved.
insert into public.config_validacion_pais (codigo_iso,pais,activo,docs_requeridos,reglas_ocr) values
 ('BR','Brasil',false,'{}','{"docs":{}}'),('AR','Argentina',false,'{}','{"docs":{}}'),
 ('CL','Chile',false,'{}','{"docs":{}}'),('CO','Colombia',false,'{}','{"docs":{}}'),
 ('MX','México',false,'{}','{"docs":{}}'),('UY','Uruguay',false,'{}','{"docs":{}}')
on conflict (codigo_iso) do nothing;
