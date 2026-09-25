-- UGO P0 · expected lifecycle state by notification type.
-- trabajo_aprobado is emitted while cash payment is still pending and the service
-- remains esperando_aprobacion; it is not a completado notification.

create or replace function private.retire_superseded_service_notifications()
returns trigger
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $$
begin
  if old.estado is not distinct from new.estado then return new; end if;

  update public.push_entregas pe
     set estado='omitido',
         ultimo_error='Notificación superada por estado '||new.estado::text
   where pe.estado='pendiente'
     and pe.notificacion_id in (
       select n.id
         from public.notificaciones n
        where n.datos->>'servicio_id'=new.id::text
          and n.leida_at is null
          and n.tipo in ('proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado')
          and (case n.tipo
            when 'proveedor_asignado' then 'asignado'
            when 'trabajo_asignado' then 'asignado'
            when 'proveedor_en_camino' then 'en_camino'
            when 'proveedor_llego' then 'llegado'
            when 'servicio_iniciado' then 'en_progreso'
            when 'aprobacion_pendiente' then 'esperando_aprobacion'
            when 'trabajo_aprobado' then 'esperando_aprobacion'
            when 'servicio_completado' then 'completado'
            when 'servicio_cancelado' then 'cancelado'
            when 'servicio_disputado' then 'disputado'
            else null end) is distinct from new.estado::text
     );

  update public.notificaciones n
     set leida_at=coalesce(n.leida_at,now())
   where n.datos->>'servicio_id'=new.id::text
     and n.leida_at is null
     and n.tipo in ('proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado')
     and (case n.tipo
       when 'proveedor_asignado' then 'asignado'
       when 'trabajo_asignado' then 'asignado'
       when 'proveedor_en_camino' then 'en_camino'
       when 'proveedor_llego' then 'llegado'
       when 'servicio_iniciado' then 'en_progreso'
       when 'aprobacion_pendiente' then 'esperando_aprobacion'
       when 'trabajo_aprobado' then 'esperando_aprobacion'
       when 'servicio_completado' then 'completado'
       when 'servicio_cancelado' then 'cancelado'
       when 'servicio_disputado' then 'disputado'
       else null end) is distinct from new.estado::text;

  return new;
end;
$$;

revoke all on function private.retire_superseded_service_notifications() from public,anon,authenticated;

-- Reconcile any still-unread lifecycle rows using semantic expected state, not datos.estado.
update public.notificaciones n
   set leida_at=coalesce(n.leida_at,now())
  from public.servicios s
 where n.datos->>'servicio_id'=s.id::text
   and n.leida_at is null
   and n.tipo in ('proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado')
   and (case n.tipo
     when 'proveedor_asignado' then 'asignado'
     when 'trabajo_asignado' then 'asignado'
     when 'proveedor_en_camino' then 'en_camino'
     when 'proveedor_llego' then 'llegado'
     when 'servicio_iniciado' then 'en_progreso'
     when 'aprobacion_pendiente' then 'esperando_aprobacion'
     when 'trabajo_aprobado' then 'esperando_aprobacion'
     when 'servicio_completado' then 'completado'
     when 'servicio_cancelado' then 'cancelado'
     when 'servicio_disputado' then 'disputado'
     else null end) is distinct from s.estado::text;

notify pgrst,'reload schema';
