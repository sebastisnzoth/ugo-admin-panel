-- UGO P0 · Keep provider matching transactions from timing out while retiring stale lifecycle notifications.
-- The lifecycle retirement trigger filters unread notifications by service id stored in datos JSON.
-- Without an expression index, every service state transition can scan the full notifications table
-- and abort the enclosing matching transaction under statement_timeout.

create index if not exists notificaciones_servicio_pending_lifecycle_idx
  on public.notificaciones ((datos->>'servicio_id'))
  where leida_at is null
    and tipo in (
      'proveedor_asignado','trabajo_asignado','proveedor_en_camino','proveedor_llego',
      'servicio_iniciado','aprobacion_pendiente','servicio_completado','trabajo_aprobado',
      'servicio_cancelado','servicio_disputado'
    );

create index if not exists push_entregas_pending_notificacion_idx
  on public.push_entregas (notificacion_id)
  where estado='pendiente';

comment on index public.notificaciones_servicio_pending_lifecycle_idx is
  'P0 lifecycle lookup used by retire_superseded_service_notifications; prevents full scans inside matching transactions.';

comment on index public.push_entregas_pending_notificacion_idx is
  'P0 pending push lookup by notification id for lifecycle retirement.';
