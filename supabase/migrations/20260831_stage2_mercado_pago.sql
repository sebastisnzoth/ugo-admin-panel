-- U.G.O. Stage 2 — Mercado Pago metadata
-- Additive/idempotent migration. Does not alter existing operational RPCs.

alter table if exists public.pagos
  add column if not exists mp_preference_id text,
  add column if not exists mp_payment_id text,
  add column if not exists mp_status text,
  add column if not exists mp_init_point text,
  add column if not exists fecha_confirmacion timestamptz,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_pagos_mp_preference_id
  on public.pagos (mp_preference_id)
  where mp_preference_id is not null;

create index if not exists idx_pagos_mp_payment_id
  on public.pagos (mp_payment_id)
  where mp_payment_id is not null;

create index if not exists idx_pagos_servicio_created
  on public.pagos (servicio_id, created_at desc);

comment on column public.pagos.mp_preference_id is 'Mercado Pago checkout preference id';
comment on column public.pagos.mp_payment_id is 'Mercado Pago approved/rejected payment id';
comment on column public.pagos.mp_status is 'Raw Mercado Pago payment status';
comment on column public.pagos.mp_init_point is 'Mercado Pago checkout URL';
