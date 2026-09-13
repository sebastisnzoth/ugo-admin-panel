alter table public.documentos enable row level security;

grant select, insert, update on table public.documentos to authenticated;

drop policy if exists documentos_select_own_or_admin on public.documentos;
create policy documentos_select_own_or_admin
on public.documentos
for select
to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()));

drop policy if exists documentos_insert_own on public.documentos;
create policy documentos_insert_own
on public.documentos
for insert
to authenticated
with check (usuario_id = auth.uid());

drop policy if exists documentos_update_own_or_admin on public.documentos;
create policy documentos_update_own_or_admin
on public.documentos
for update
to authenticated
using (usuario_id = auth.uid() or private.is_admin(auth.uid()))
with check (usuario_id = auth.uid() or private.is_admin(auth.uid()));
