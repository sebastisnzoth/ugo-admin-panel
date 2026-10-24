-- P0 TEST: service-scoped notification cleanup was doing a sequential scan.
-- The existing lifecycle index is partial (unread lifecycle types only) and
-- cannot serve DELETE ... WHERE datos->>'servicio_id' = <service uuid>.
-- Index the exact expression used by the cleanup and service lookups.
-- Additive, idempotent, no data deletion or changes to matching/RLS.
create index if not exists notificaciones_service_id_cleanup_idx
  on public.notificaciones ((datos->>'servicio_id'));

comment on index public.notificaciones_service_id_cleanup_idx is
  'Service-scoped notification cleanup: prevents full-table scans in P0 E2E and service deletion.';
