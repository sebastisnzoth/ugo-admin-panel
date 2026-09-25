-- UGO P0 · convergencia de notificaciones con el estado real del servicio.
-- Una alerta de asignado/en camino/llegado/etc. deja de ser accionable apenas
-- el servicio avanza o termina. Esto evita avisos tardíos al reabrir la app.

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
          and coalesce(n.datos->>'estado','')<>new.estado::text
     );

  update public.notificaciones n
     set leida_at=coalesce(n.leida_at,now())
   where n.datos->>'servicio_id'=new.id::text
     and n.leida_at is null
     and n.tipo in ('proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado')
     and coalesce(n.datos->>'estado','')<>new.estado::text;

  return new;
end;
$$;

revoke all on function private.retire_superseded_service_notifications() from public,anon,authenticated;
drop trigger if exists trg_retire_superseded_service_notifications on public.servicios;
create trigger trg_retire_superseded_service_notifications
before update of estado on public.servicios
for each row execute function private.retire_superseded_service_notifications();

-- Backfill: retire unread lifecycle notices that are already behind the current service.
update public.push_entregas pe
   set estado='omitido',ultimo_error='Notificación histórica superada por el estado actual'
 where pe.estado='pendiente'
   and pe.notificacion_id in (
     select n.id
       from public.notificaciones n
       join public.servicios s on n.datos->>'servicio_id'=s.id::text
      where n.leida_at is null
        and n.tipo in ('proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado')
        and coalesce(n.datos->>'estado','')<>s.estado::text
   );

update public.notificaciones n
   set leida_at=coalesce(n.leida_at,now())
  from public.servicios s
 where n.datos->>'servicio_id'=s.id::text
   and n.leida_at is null
   and n.tipo in ('proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego','servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado','servicio_cancelado','servicio_disputado')
   and coalesce(n.datos->>'estado','')<>s.estado::text;

notify pgrst,'reload schema';
