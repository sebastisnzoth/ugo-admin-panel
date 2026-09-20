-- UGO · convergencia fuerte para asignaciones directas y alertas de proveedor.
-- Invariante: si servicios.proveedor_id tiene valor, un pedido en buscando/ofrecido
-- ya no puede seguir aparentando que está sin asignar.

create or replace function private.normalize_service_provider_assignment()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if new.proveedor_id is null then
    return new;
  end if;

  if new.estado::text in ('buscando','ofrecido') then
    new.estado='asignado'::public.servicio_estado;
    new.aceptado_at=coalesce(new.aceptado_at,now());
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_service_provider_assignment() from public,anon,authenticated;

drop trigger if exists trg_normalize_service_provider_assignment_insert on public.servicios;
create trigger trg_normalize_service_provider_assignment_insert
before insert on public.servicios
for each row execute function private.normalize_service_provider_assignment();

drop trigger if exists trg_normalize_service_provider_assignment_update on public.servicios;
create trigger trg_normalize_service_provider_assignment_update
before update of proveedor_id,estado on public.servicios
for each row execute function private.normalize_service_provider_assignment();

create or replace function private.close_pending_offers_after_assignment()
returns trigger
language plpgsql
security definer
set search_path='public','private','pg_temp'
as $$
begin
  if new.proveedor_id is null or new.estado::text <> 'asignado' then
    return new;
  end if;

  if tg_op='UPDATE'
     and old.proveedor_id is not distinct from new.proveedor_id
     and old.estado::text='asignado' then
    return new;
  end if;

  update public.ofertas_servicio
     set estado=case when proveedor_id=new.proveedor_id then 'aceptada'::public.oferta_estado else 'expirada'::public.oferta_estado end,
         respondida_at=coalesce(respondida_at,now())
   where servicio_id=new.id
     and estado='pendiente';

  return new;
end;
$$;

revoke all on function private.close_pending_offers_after_assignment() from public,anon,authenticated;

drop trigger if exists trg_close_pending_offers_after_assignment on public.servicios;
create trigger trg_close_pending_offers_after_assignment
after insert or update of proveedor_id,estado on public.servicios
for each row execute function private.close_pending_offers_after_assignment();

create or replace function private.notificar_estado_servicio()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_proveedor_nombre text;
  v_estado text := new.estado::text;
  v_num text := coalesce(new.numero::text,'');
begin
  if old.estado is not distinct from new.estado
     and old.proveedor_id is not distinct from new.proveedor_id then
    return new;
  end if;

  if new.proveedor_id is not null then
    select nombre into v_proveedor_nombre
    from public.usuarios
    where id=new.proveedor_id;
  end if;

  if v_estado='asignado' then
    perform private.crear_notificacion_unica(
      new.cliente_id,
      'proveedor_asignado',
      'Profesional asignado',
      coalesce(v_proveedor_nombre,'Un profesional UGO') || ' aceptó tu pedido #' || v_num || '.',
      jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),
      'servicio:' || new.id || ':asignado:cliente'
    );

    if new.proveedor_id is not null and auth.uid() is distinct from new.proveedor_id then
      perform private.crear_notificacion_unica(
        new.proveedor_id,
        'trabajo_asignado',
        'Nuevo trabajo asignado',
        'UGO te asignó el pedido #' || v_num || '. Abrilo para ver los detalles.',
        jsonb_build_object('servicio_id',new.id,'estado',v_estado,'numero',new.numero,'role','provider'),
        'servicio:' || new.id || ':asignado:proveedor'
      );
    end if;
  elsif v_estado='en_camino' then
    perform private.crear_notificacion_unica(new.cliente_id,'proveedor_en_camino','Tu profesional está en camino',coalesce(v_proveedor_nombre,'El profesional') || ' ya salió hacia tu dirección para el pedido #' || v_num || '.',jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),'servicio:' || new.id || ':en_camino:cliente');
  elsif v_estado='llegado' then
    perform private.crear_notificacion_unica(new.cliente_id,'proveedor_llego','Tu profesional llegó',coalesce(v_proveedor_nombre,'El profesional') || ' marcó llegada para el pedido #' || v_num || '.',jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),'servicio:' || new.id || ':llegado:cliente');
  elsif v_estado='en_progreso' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_iniciado','Trabajo iniciado','El trabajo del pedido #' || v_num || ' comenzó.',jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),'servicio:' || new.id || ':en_progreso:cliente');
  elsif v_estado='esperando_aprobacion' then
    perform private.crear_notificacion_unica(new.cliente_id,'aprobacion_pendiente','Trabajo listo para validar','Revisá las evidencias del pedido #' || v_num || ' y confirmá el trabajo.',jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),'servicio:' || new.id || ':esperando_aprobacion:cliente');
  elsif v_estado='completado' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_completado','Servicio completado','El pedido #' || v_num || ' quedó completado. Ya podés calificar al profesional.',jsonb_build_object('servicio_id',new.id,'estado',v_estado,'proveedor_id',new.proveedor_id),'servicio:' || new.id || ':completado:cliente');
    perform private.crear_notificacion_unica(new.proveedor_id,'servicio_completado','Trabajo aprobado','El cliente aprobó el pedido #' || v_num || '.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:' || new.id || ':completado:proveedor');
  elsif v_estado='cancelado' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_cancelado','Pedido cancelado','El pedido #' || v_num || ' fue cancelado.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:' || new.id || ':cancelado:cliente');
    perform private.crear_notificacion_unica(new.proveedor_id,'servicio_cancelado','Pedido cancelado','El pedido #' || v_num || ' fue cancelado.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:' || new.id || ':cancelado:proveedor');
  elsif v_estado='disputado' then
    perform private.crear_notificacion_unica(new.cliente_id,'servicio_disputado','Pedido en revisión','El pedido #' || v_num || ' está en revisión por UGO.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:' || new.id || ':disputado:cliente');
    perform private.crear_notificacion_unica(new.proveedor_id,'servicio_disputado','Pedido en revisión','El pedido #' || v_num || ' está en revisión por UGO.',jsonb_build_object('servicio_id',new.id,'estado',v_estado),'servicio:' || new.id || ':disputado:proveedor');
  end if;

  return new;
end;
$$;

revoke all on function private.notificar_estado_servicio() from public,anon,authenticated;

-- Reparar únicamente estados imposibles ya existentes. La guardia de deuda sigue
-- siendo la autoridad para impedir nuevas asignaciones a proveedores bloqueados.
update public.servicios
   set estado='asignado'::public.servicio_estado,
       aceptado_at=coalesce(aceptado_at,now()),
       updated_at=now()
 where proveedor_id is not null
   and estado::text in ('buscando','ofrecido');

notify pgrst,'reload schema';
