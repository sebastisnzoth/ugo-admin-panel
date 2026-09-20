-- UGO · Calificación bilateral por servicio
-- Conserva las reseñas históricas como cliente -> proveedor y habilita
-- una segunda reseña proveedor -> cliente sobre el mismo serviceId.

alter table public.resenas
  add column if not exists autor_tipo text not null default 'cliente';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.resenas'::regclass
      and conname='resenas_autor_tipo_check'
  ) then
    alter table public.resenas
      add constraint resenas_autor_tipo_check
      check (autor_tipo in ('cliente','proveedor'));
  end if;
end $$;

alter table public.resenas
  drop constraint if exists resenas_servicio_id_key;

create unique index if not exists resenas_servicio_autor_tipo_uidx
  on public.resenas(servicio_id,autor_tipo);

drop policy if exists resenas_insert on public.resenas;
create policy resenas_insert on public.resenas
for insert to authenticated
with check (
  exists (
    select 1
    from public.servicios s
    where s.id=resenas.servicio_id
      and s.estado='completado'
      and s.cliente_id=resenas.cliente_id
      and s.proveedor_id=resenas.proveedor_id
      and (
        (resenas.autor_tipo='cliente' and s.cliente_id=auth.uid())
        or
        (resenas.autor_tipo='proveedor' and s.proveedor_id=auth.uid())
      )
  )
);

comment on column public.resenas.autor_tipo is
  'Quién emitió la calificación: cliente califica proveedor o proveedor califica cliente.';
