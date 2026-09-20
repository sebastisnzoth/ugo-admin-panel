-- UGO · límite de deuda de comisión antes de recibir/aceptar más pedidos.
-- Regla comercial: con 3 servicios reales cuya comisión UGO sigue pendiente,
-- el proveedor queda fuera del radar hasta conciliar al menos una deuda.

create or replace function private.proveedor_bloqueado_por_deuda_ugo(p_proveedor_id uuid)
returns boolean
language sql
stable
security definer
set search_path='public','private','pg_temp'
as $$
  select count(*) >= 3
  from public.deudas_ugo_proveedor d
  where d.proveedor_id=p_proveedor_id
    and d.ambiente='real'
    and d.estado not in ('pagado','anulado')
    and d.saldo_pendiente>0;
$$;

revoke all on function private.proveedor_bloqueado_por_deuda_ugo(uuid) from public,anon,authenticated;

create or replace function public.estado_deuda_ugo_proveedor()
returns table(servicios_pendientes integer,saldo_pendiente numeric,limite integer,bloqueado boolean)
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'Autenticación requerida'; end if;
  if not exists(select 1 from public.usuarios u where u.id=v_uid and u.tipo='proveedor') then
    raise exception 'Cuenta de proveedor requerida';
  end if;
  return query
  select count(*)::integer,
         round(coalesce(sum(d.saldo_pendiente),0),2),
         3,
         count(*)>=3
  from public.deudas_ugo_proveedor d
  where d.proveedor_id=v_uid
    and d.ambiente='real'
    and d.estado not in ('pagado','anulado')
    and d.saldo_pendiente>0;
end;
$$;

revoke all on function public.estado_deuda_ugo_proveedor() from public,anon;
grant execute on function public.estado_deuda_ugo_proveedor() to authenticated;

create or replace function private.sync_provider_ugo_debt_limit()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
declare
  v_provider uuid:=new.proveedor_id;
begin
  if private.proveedor_bloqueado_por_deuda_ugo(v_provider) then
    update public.perfiles_proveedor
       set online=false,disponible=false,updated_at=now()
     where usuario_id=v_provider
       and (coalesce(online,false) or coalesce(disponible,false));

    update public.ofertas_servicio
       set estado='expirada',
           respondida_at=coalesce(respondida_at,now())
     where proveedor_id=v_provider
       and estado='pendiente';
  end if;
  return new;
end;
$$;

revoke all on function private.sync_provider_ugo_debt_limit() from public,anon,authenticated;

drop trigger if exists trg_provider_ugo_debt_limit on public.deudas_ugo_proveedor;
create trigger trg_provider_ugo_debt_limit
after insert or update of estado,monto_pagado_ugo,comision_ugo
on public.deudas_ugo_proveedor
for each row execute function private.sync_provider_ugo_debt_limit();

create or replace function private.guard_provider_online_when_ugo_debt_blocked()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if (coalesce(new.online,false) or coalesce(new.disponible,false))
     and private.proveedor_bloqueado_por_deuda_ugo(new.usuario_id) then
    raise exception 'Tenés 3 o más comisiones UGO pendientes. Pagá a UGO antes de volver Online.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_provider_online_when_ugo_debt_blocked() from public,anon,authenticated;

drop trigger if exists trg_guard_provider_online_ugo_debt on public.perfiles_proveedor;
create trigger trg_guard_provider_online_ugo_debt
before update of online,disponible
on public.perfiles_proveedor
for each row execute function private.guard_provider_online_when_ugo_debt_blocked();

create or replace function private.guard_provider_assignment_when_ugo_debt_blocked()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if new.proveedor_id is null then return new; end if;
  if tg_op='UPDATE' and new.proveedor_id is not distinct from old.proveedor_id then return new; end if;
  if private.proveedor_bloqueado_por_deuda_ugo(new.proveedor_id) then
    raise exception 'Tenés 3 o más comisiones UGO pendientes. Pagá a UGO antes de aceptar otro pedido.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_provider_assignment_when_ugo_debt_blocked() from public,anon,authenticated;

drop trigger if exists trg_guard_provider_assignment_ugo_debt_insert on public.servicios;
create trigger trg_guard_provider_assignment_ugo_debt_insert
before insert on public.servicios
for each row execute function private.guard_provider_assignment_when_ugo_debt_blocked();

drop trigger if exists trg_guard_provider_assignment_ugo_debt_update on public.servicios;
create trigger trg_guard_provider_assignment_ugo_debt_update
before update of proveedor_id on public.servicios
for each row execute function private.guard_provider_assignment_when_ugo_debt_blocked();

-- Backfill: si el límite ya estaba alcanzado antes de esta migración, sacar al
-- proveedor del radar y cerrar ofertas pendientes. Nunca se cancelan trabajos asignados.
update public.perfiles_proveedor pp
   set online=false,disponible=false,updated_at=now()
 where private.proveedor_bloqueado_por_deuda_ugo(pp.usuario_id)
   and (coalesce(pp.online,false) or coalesce(pp.disponible,false));

update public.ofertas_servicio o
   set estado='expirada',respondida_at=coalesce(o.respondida_at,now())
 where o.estado='pendiente'
   and private.proveedor_bloqueado_por_deuda_ugo(o.proveedor_id);

notify pgrst,'reload schema';
