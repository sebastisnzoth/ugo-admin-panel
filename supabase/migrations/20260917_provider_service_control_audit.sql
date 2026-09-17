create table if not exists public.servicio_estado_eventos (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  actor_id uuid null,
  actor_role text not null default 'system',
  estado_anterior public.servicio_estado null,
  estado_nuevo public.servicio_estado not null,
  motivo text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_servicio_estado_eventos_servicio_created
  on public.servicio_estado_eventos(servicio_id, created_at desc);

alter table public.servicio_estado_eventos enable row level security;

drop policy if exists servicio_estado_eventos_select_participants on public.servicio_estado_eventos;
create policy servicio_estado_eventos_select_participants
on public.servicio_estado_eventos
for select
to authenticated
using (
  exists (
    select 1
      from public.servicios s
     where s.id = servicio_estado_eventos.servicio_id
       and (s.cliente_id = auth.uid() or s.proveedor_id = auth.uid() or private.is_admin(auth.uid()))
  )
);

revoke insert, update, delete on public.servicio_estado_eventos from anon, authenticated;
grant select on public.servicio_estado_eventos to authenticated;

create or replace function private.registrar_cambio_estado_servicio()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := 'system';
  v_reason text := null;
begin
  if new.estado is not distinct from old.estado then return new; end if;

  if v_actor is not null then
    if new.proveedor_id = v_actor then v_role := 'provider';
    elsif new.cliente_id = v_actor then v_role := 'client';
    elsif private.is_admin(v_actor) then v_role := 'admin';
    else v_role := 'authenticated'; end if;
  end if;

  if new.estado::text = 'cancelado' then
    v_reason := coalesce(new.metadata #>> '{provider_cancellation,motivo}', new.metadata #>> '{cancellation,motivo}');
  end if;

  insert into public.servicio_estado_eventos(servicio_id,actor_id,actor_role,estado_anterior,estado_nuevo,motivo)
  values(new.id,v_actor,v_role,old.estado,new.estado,v_reason);
  return new;
end;
$$;

drop trigger if exists trg_registrar_cambio_estado_servicio on public.servicios;
create trigger trg_registrar_cambio_estado_servicio
after update of estado on public.servicios
for each row execute function private.registrar_cambio_estado_servicio();

create or replace function public.cancelar_servicio_proveedor(p_servicio_id uuid, p_motivo text)
returns public.servicios
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_servicio public.servicios%rowtype;
  v_motivo text := btrim(coalesce(p_motivo,''));
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if length(v_motivo) < 5 then raise exception 'Indicá el motivo de la cancelación'; end if;

  select * into v_servicio
    from public.servicios
   where id = p_servicio_id
   for update;

  if not found then raise exception 'Servicio inexistente'; end if;
  if v_servicio.proveedor_id <> auth.uid() and not private.is_admin(auth.uid()) then raise exception 'No autorizado'; end if;
  if v_servicio.estado::text not in ('asignado','en_camino','llegado') then
    raise exception 'Este servicio ya no puede cancelarse desde la app del proveedor';
  end if;

  update public.servicios
     set estado = 'cancelado',
         metadata = coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
           'provider_cancellation', jsonb_build_object(
             'motivo', v_motivo,
             'at', now(),
             'actor_id', auth.uid()
           )
         )
   where id = p_servicio_id
  returning * into v_servicio;

  perform private.crear_notificacion_unica(
    v_servicio.cliente_id,
    'servicio_cancelado',
    'El proveedor canceló el servicio',
    'El profesional no podrá realizar el servicio #'||coalesce(v_servicio.numero::text,'')||'. Motivo: '||v_motivo,
    jsonb_build_object('servicio_id',v_servicio.id,'estado','cancelado','motivo',v_motivo),
    'servicio:'||v_servicio.id||':cancelado:proveedor'
  );

  return v_servicio;
end;
$$;

revoke all on function public.cancelar_servicio_proveedor(uuid,text) from public;
grant execute on function public.cancelar_servicio_proveedor(uuid,text) to authenticated;
