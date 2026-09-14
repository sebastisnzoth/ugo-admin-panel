-- UGO · Chat canónico por servicio.
-- El chat pertenece al serviceId existente; no crea una conversación paralela.
-- Sólo Cliente, Proveedor asignado y Admin pueden leer. Sólo los participantes
-- pueden escribir y los mensajes quedan inmutables para auditoría.

create table if not exists public.mensajes_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  autor_id uuid not null references public.usuarios(id) on delete restrict,
  mensaje text not null check (char_length(trim(mensaje)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists mensajes_servicio_servicio_created_idx
  on public.mensajes_servicio(servicio_id, created_at);

alter table public.mensajes_servicio enable row level security;

drop policy if exists mensajes_servicio_select on public.mensajes_servicio;
create policy mensajes_servicio_select
on public.mensajes_servicio
for select
to authenticated
using (
  exists (
    select 1
    from public.servicios s
    where s.id = mensajes_servicio.servicio_id
      and (
        s.cliente_id = auth.uid()
        or s.proveedor_id = auth.uid()
        or private.is_admin(auth.uid())
      )
  )
);

drop policy if exists mensajes_servicio_insert on public.mensajes_servicio;
create policy mensajes_servicio_insert
on public.mensajes_servicio
for insert
to authenticated
with check (
  autor_id = auth.uid()
  and exists (
    select 1
    from public.servicios s
    where s.id = mensajes_servicio.servicio_id
      and s.proveedor_id is not null
      and (s.cliente_id = auth.uid() or s.proveedor_id = auth.uid())
      and s.estado not in ('cancelado')
  )
);

revoke all on public.mensajes_servicio from anon;
revoke update, delete on public.mensajes_servicio from authenticated;
grant select, insert on public.mensajes_servicio to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname='supabase_realtime'
         and schemaname='public'
         and tablename='mensajes_servicio'
     ) then
    alter publication supabase_realtime add table public.mensajes_servicio;
  end if;
end $$;
