-- UGO Pilot · provider capabilities and private work references for Faxina + Marido de Aluguel.
-- TEST-first, additive and reversible. No production-only assumptions.

alter table public.perfiles_proveedor
  add column if not exists pilot_capabilities jsonb not null default '{}'::jsonb;

create table if not exists public.proveedor_referencias_laborales (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references public.usuarios(id) on delete cascade,
  nombre text not null,
  relacion text not null,
  contacto text not null,
  autorizado_contacto boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proveedor_referencia_nombre_check check (char_length(trim(nombre)) between 2 and 120),
  constraint proveedor_referencia_relacion_check check (char_length(trim(relacion)) between 2 and 80),
  constraint proveedor_referencia_contacto_check check (char_length(trim(contacto)) between 4 and 180)
);

create index if not exists proveedor_referencias_laborales_proveedor_idx
  on public.proveedor_referencias_laborales(proveedor_id);

alter table public.proveedor_referencias_laborales enable row level security;

drop policy if exists "provider_reference_select_own_or_admin" on public.proveedor_referencias_laborales;
create policy "provider_reference_select_own_or_admin"
on public.proveedor_referencias_laborales for select to authenticated
using (proveedor_id=auth.uid() or private.is_admin(auth.uid()));

drop policy if exists "provider_reference_insert_own" on public.proveedor_referencias_laborales;
create policy "provider_reference_insert_own"
on public.proveedor_referencias_laborales for insert to authenticated
with check (proveedor_id=auth.uid());

drop policy if exists "provider_reference_update_own_or_admin" on public.proveedor_referencias_laborales;
create policy "provider_reference_update_own_or_admin"
on public.proveedor_referencias_laborales for update to authenticated
using (proveedor_id=auth.uid() or private.is_admin(auth.uid()))
with check (proveedor_id=auth.uid() or private.is_admin(auth.uid()));

drop policy if exists "provider_reference_delete_own" on public.proveedor_referencias_laborales;
create policy "provider_reference_delete_own"
on public.proveedor_referencias_laborales for delete to authenticated
using (proveedor_id=auth.uid());

revoke all on table public.proveedor_referencias_laborales from anon;
grant select,insert,update,delete on table public.proveedor_referencias_laborales to authenticated;

notify pgrst,'reload schema';
