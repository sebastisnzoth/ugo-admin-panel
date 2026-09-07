-- Final pre-production privacy lock.
-- Providers with a pending offer use obtener_ofertas_proveedor(); exact client data is available only after assignment.

create or replace function private.puede_ver_usuario(p_usuario uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select p_uid is not null and (
    p_usuario = p_uid
    or private.is_admin(p_uid)
    or exists (
      select 1
      from public.servicios s
      where s.proveedor_id is not null
        and (
          (s.cliente_id = p_uid and s.proveedor_id = p_usuario)
          or
          (s.proveedor_id = p_uid and s.cliente_id = p_usuario)
        )
    )
  );
$$;

revoke all on function private.puede_ver_usuario(uuid,uuid) from public;
grant execute on function private.puede_ver_usuario(uuid,uuid) to authenticated;

drop policy if exists usuarios_select on public.usuarios;
create policy usuarios_select on public.usuarios
for select to authenticated
using (private.puede_ver_usuario(id, auth.uid()));

create or replace function private.puede_ver_perfil_cliente(p_cliente uuid, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    p_uid is not null
    and (
      p_cliente = p_uid
      or private.is_admin(p_uid)
      or exists (
        select 1
        from public.servicios s
        where s.cliente_id = p_cliente
          and s.proveedor_id = p_uid
      )
    );
$$;

drop policy if exists servicios_select on public.servicios;
create policy servicios_select on public.servicios
for select to authenticated
using (
  cliente_id = auth.uid()
  or proveedor_id = auth.uid()
  or private.is_admin(auth.uid())
);

comment on function private.puede_ver_usuario(uuid,uuid) is 'Private identity gate: self, admin, or counterpart on an assigned service only.';
comment on function private.puede_ver_perfil_cliente(uuid,uuid) is 'Client private profile visible to self, admin, or assigned provider only; pending offers are excluded.';
