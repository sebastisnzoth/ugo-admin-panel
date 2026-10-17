-- UGO TEST: provider-selected demand zones are an ADDITIONAL matching constraint.
-- Their coordinates come from authorized aggregated demand signals, never an override of GPS.
create table if not exists public.proveedor_zonas_activas(
 proveedor_id uuid not null references public.usuarios(id) on delete cascade,
 zona text not null check(length(zona) between 2 and 100),
 lat double precision not null check(lat between -90 and 90),
 lng double precision not null check(lng between -180 and 180),
 principal boolean not null default false,
 created_at timestamptz not null default now(),
 primary key(proveedor_id,zona)
);
create unique index if not exists proveedor_zonas_one_primary on public.proveedor_zonas_activas(proveedor_id) where principal;
create index if not exists proveedor_zonas_provider on public.proveedor_zonas_activas(proveedor_id);
alter table public.proveedor_zonas_activas enable row level security;
drop policy if exists provider_zone_self_select on public.proveedor_zonas_activas;
create policy provider_zone_self_select on public.proveedor_zonas_activas for select to authenticated using (proveedor_id=(select auth.uid()));
drop policy if exists provider_zone_self_insert on public.proveedor_zonas_activas;
create policy provider_zone_self_insert on public.proveedor_zonas_activas for insert to authenticated with check (
 proveedor_id=(select auth.uid())
);
drop policy if exists provider_zone_self_update on public.proveedor_zonas_activas;
create policy provider_zone_self_update on public.proveedor_zonas_activas for update to authenticated
 using(proveedor_id=(select auth.uid())) with check(proveedor_id=(select auth.uid()));
drop policy if exists provider_zone_self_delete on public.proveedor_zonas_activas;
create policy provider_zone_self_delete on public.proveedor_zonas_activas for delete to authenticated using(proveedor_id=(select auth.uid()));

-- A selected zone cannot extend actual GPS coverage or bypass pilot, schedule, debt or assignment limits.
create or replace function private.proveedor_zonas_permitem(p_proveedor uuid,p_servico uuid)
returns boolean language sql stable security definer set search_path='public','private','extensions','pg_temp'
as $$
 select not exists(select 1 from public.proveedor_zonas_activas z where z.proveedor_id=p_proveedor)
    or exists(
     select 1 from public.proveedor_zonas_activas z join public.servicios s on s.id=p_servico
     where z.proveedor_id=p_proveedor
      and s.ubicacion_cliente is not null
      and extensions.st_dwithin(
       s.ubicacion_cliente,
       extensions.st_setsrid(extensions.st_makepoint(z.lng,z.lat),4326)::extensions.geography,
       3000.0
      )
    );
$$;
revoke all on function private.proveedor_zonas_permitem(uuid,uuid) from public,anon,authenticated;
