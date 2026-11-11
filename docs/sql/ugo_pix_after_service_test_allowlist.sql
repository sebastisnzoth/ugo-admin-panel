-- UGO PIX after-service TEST allowlist. NEVER RUN IN ARENA PROD.
-- The private table is not available through the Data API.
-- Do not grant write access to anon/authenticated/service-facing roles.
create table if not exists private.ugo_pix_after_service_allowed_services (
 service_id uuid primary key references public.servicios(id) on delete cascade,
 authorized_by uuid not null,
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 constraint ugo_pix_after_service_expiry_future check (expires_at > created_at)
);
alter table private.ugo_pix_after_service_allowed_services enable row level security;
revoke all on private.ugo_pix_after_service_allowed_services from public,anon,authenticated;
-- This migration DOES NOT enroll any service and DOES NOT turn on the global
-- ugo_pix_after_service_test_enabled switch.
