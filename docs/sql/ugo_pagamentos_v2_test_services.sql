-- TEST-ONLY synthetic service fixtures for Pix Sandbox E2E. NEVER copy
-- production customer/provider data or connect this table to Arena PROD.
create table if not exists ugo_payments_v2.test_services (
  id uuid primary key,
  cliente_id uuid not null,
  proveedor_id uuid not null,
  estado text not null check (estado in ('asignado','en_progreso','esperando_aprobacion','completado','cancelado')),
  tarifa_cents bigint not null check (tarifa_cents > 0),
  moneda text not null default 'BRL' check (moneda = 'BRL'),
  created_at timestamptz not null default now()
);
alter table ugo_payments_v2.provider_accounts
  add column if not exists kyc_approved_at timestamptz;
revoke all on ugo_payments_v2.test_services from public;
