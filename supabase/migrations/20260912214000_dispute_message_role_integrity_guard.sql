-- P0 integrity guard: a dispute participant must not be able to forge the author role
-- of a direct disputa_mensajes insert (especially autor_rol='admin').
-- Keep direct inserts compatible, but bind autor_rol to the authenticated user's real role.

drop policy if exists disputa_mensajes_insert on public.disputa_mensajes;

create policy disputa_mensajes_insert
on public.disputa_mensajes
for insert
to authenticated
with check (
  autor_id = auth.uid()
  and exists (
    select 1
    from public.disputas d
    where d.id = disputa_id
      and (
        (autor_rol = 'admin' and private.is_admin(auth.uid()))
        or (autor_rol = 'cliente' and d.cliente_id = auth.uid())
        or (autor_rol = 'proveedor' and d.proveedor_id = auth.uid())
      )
  )
);
