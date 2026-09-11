-- UGO · Ampliar servicio / Agregar trabajo
-- Flujo trazable para trabajos adicionales dentro del mismo servicio.

create table if not exists public.ampliaciones_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  cliente_id uuid not null references public.usuarios(id) on delete cascade,
  proveedor_id uuid not null references public.usuarios(id) on delete cascade,
  propuesto_por uuid not null references public.usuarios(id) on delete restrict,
  propuesto_por_rol text not null check (propuesto_por_rol in ('cliente','proveedor')),
  descripcion text not null check (char_length(trim(descripcion)) >= 4),
  monto_extra numeric(12,2) not null default 0 check (monto_extra >= 0),
  minutos_extra integer not null default 0 check (minutos_extra >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobada','rechazada','cancelada')),
  pago_estado text not null default 'no_aplica' check (pago_estado in ('no_aplica','incluido','pendiente_ajuste')),
  resuelto_por uuid null references public.usuarios(id) on delete set null,
  resuelto_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ampliaciones_servicio_servicio on public.ampliaciones_servicio(servicio_id, created_at desc);
create index if not exists idx_ampliaciones_servicio_cliente on public.ampliaciones_servicio(cliente_id, created_at desc);
create index if not exists idx_ampliaciones_servicio_proveedor on public.ampliaciones_servicio(proveedor_id, created_at desc);

alter table public.ampliaciones_servicio enable row level security;

drop policy if exists ampliaciones_participantes_select on public.ampliaciones_servicio;
create policy ampliaciones_participantes_select on public.ampliaciones_servicio
for select using (auth.uid() = cliente_id or auth.uid() = proveedor_id);

revoke all on public.ampliaciones_servicio from anon;
grant select on public.ampliaciones_servicio to authenticated;

create or replace function public.proponer_ampliacion_servicio(
  p_servicio_id uuid,
  p_descripcion text,
  p_monto_extra numeric,
  p_minutos_extra integer default 0
) returns public.ampliaciones_servicio
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_servicio public.servicios%rowtype;
  v_rol text;
  v_row public.ampliaciones_servicio%rowtype;
begin
  if v_user is null then raise exception 'Sesión requerida'; end if;
  if length(trim(coalesce(p_descripcion,''))) < 4 then raise exception 'Describí el trabajo adicional'; end if;
  if coalesce(p_monto_extra,0) < 0 then raise exception 'Monto extra inválido'; end if;
  if coalesce(p_minutos_extra,0) < 0 then raise exception 'Tiempo extra inválido'; end if;

  select * into v_servicio from public.servicios where id = p_servicio_id for update;
  if not found then raise exception 'Servicio no encontrado'; end if;
  if v_servicio.proveedor_id is null then raise exception 'El servicio todavía no tiene proveedor asignado'; end if;
  if v_servicio.estado not in ('asignado','en_camino','llegado','en_progreso') then
    raise exception 'No se puede ampliar un servicio en estado %', v_servicio.estado;
  end if;

  if v_user = v_servicio.cliente_id then v_rol := 'cliente';
  elsif v_user = v_servicio.proveedor_id then v_rol := 'proveedor';
  else raise exception 'No participás de este servicio';
  end if;

  insert into public.ampliaciones_servicio(servicio_id,cliente_id,proveedor_id,propuesto_por,propuesto_por_rol,descripcion,monto_extra,minutos_extra)
  values(v_servicio.id,v_servicio.cliente_id,v_servicio.proveedor_id,v_user,v_rol,trim(p_descripcion),round(coalesce(p_monto_extra,0)::numeric,2),coalesce(p_minutos_extra,0))
  returning * into v_row;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(
    case when v_rol='cliente' then v_servicio.proveedor_id else v_servicio.cliente_id end,
    'ampliacion_servicio',
    case when v_rol='cliente' then 'El cliente solicitó trabajo adicional' else 'El proveedor propuso trabajo adicional' end,
    trim(p_descripcion),
    jsonb_build_object('servicio_id',v_servicio.id,'ampliacion_id',v_row.id,'monto_extra',v_row.monto_extra,'minutos_extra',v_row.minutos_extra)
  );

  return v_row;
end;
$$;

create or replace function public.resolver_ampliacion_servicio(
  p_ampliacion_id uuid,
  p_aprobar boolean
) returns public.ampliaciones_servicio
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_row public.ampliaciones_servicio%rowtype;
  v_pago public.pagos%rowtype;
  v_nuevo_total numeric;
  v_nueva_comision numeric;
  v_nueva_ganancia numeric;
begin
  if v_user is null then raise exception 'Sesión requerida'; end if;
  select * into v_row from public.ampliaciones_servicio where id = p_ampliacion_id for update;
  if not found then raise exception 'Ampliación no encontrada'; end if;
  if v_user <> v_row.cliente_id then raise exception 'Sólo el cliente puede aprobar o rechazar la ampliación'; end if;
  if v_row.estado <> 'pendiente' then raise exception 'La ampliación ya fue resuelta'; end if;

  if not p_aprobar then
    update public.ampliaciones_servicio
      set estado='rechazada',resuelto_por=v_user,resuelto_at=now(),updated_at=now()
      where id=v_row.id returning * into v_row;
  else
    select * into v_pago from public.pagos where servicio_id=v_row.servicio_id order by created_at desc limit 1 for update;

    -- Efectivo pendiente: el total presencial puede reajustarse de forma segura y trazable.
    if found and v_pago.metodo='efectivo' and v_pago.estado='pendiente' then
      v_nuevo_total := round((coalesce(v_pago.monto_bruto,0)+v_row.monto_extra)::numeric,2);
      v_nueva_comision := round((coalesce(v_pago.comision_ugo,0)+(v_row.monto_extra*0.15))::numeric,2);
      v_nueva_ganancia := round((coalesce(v_pago.ganancia_proveedor,0)+(v_row.monto_extra*0.85))::numeric,2);
      update public.pagos set monto_bruto=v_nuevo_total,comision_ugo=v_nueva_comision,ganancia_proveedor=v_nueva_ganancia,updated_at=now() where id=v_pago.id;
      update public.servicios set tarifa=v_nuevo_total,comision_ugo=v_nueva_comision,ganancia_proveedor=v_nueva_ganancia,updated_at=now() where id=v_row.servicio_id;
      update public.ampliaciones_servicio set estado='aprobada',pago_estado='incluido',resuelto_por=v_user,resuelto_at=now(),updated_at=now() where id=v_row.id returning * into v_row;
    else
      -- Sin pago aún: el nuevo total puede incorporarse al servicio antes del checkout.
      if not found then
        update public.servicios
          set tarifa=round((coalesce(tarifa,0)+v_row.monto_extra)::numeric,2),
              comision_ugo=round((coalesce(comision_ugo,0)+(v_row.monto_extra*0.15))::numeric,2),
              ganancia_proveedor=round((coalesce(ganancia_proveedor,0)+(v_row.monto_extra*0.85))::numeric,2),
              updated_at=now()
          where id=v_row.servicio_id;
        update public.ampliaciones_servicio set estado='aprobada',pago_estado='incluido',resuelto_por=v_user,resuelto_at=now(),updated_at=now() where id=v_row.id returning * into v_row;
      else
        -- Pago electrónico ya creado/protegido: no se modifica silenciosamente la custodia.
        update public.ampliaciones_servicio set estado='aprobada',pago_estado='pendiente_ajuste',resuelto_por=v_user,resuelto_at=now(),updated_at=now() where id=v_row.id returning * into v_row;
      end if;
    end if;
  end if;

  insert into public.notificaciones(usuario_id,tipo,titulo,cuerpo,datos)
  values(v_row.proveedor_id,'ampliacion_resuelta',case when v_row.estado='aprobada' then 'Trabajo adicional aprobado' else 'Trabajo adicional rechazado' end,v_row.descripcion,jsonb_build_object('servicio_id',v_row.servicio_id,'ampliacion_id',v_row.id,'estado',v_row.estado,'pago_estado',v_row.pago_estado));

  return v_row;
end;
$$;

grant execute on function public.proponer_ampliacion_servicio(uuid,text,numeric,integer) to authenticated;
grant execute on function public.resolver_ampliacion_servicio(uuid,boolean) to authenticated;
