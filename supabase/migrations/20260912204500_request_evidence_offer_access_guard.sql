-- UGO · P0 privacy guard for pre-service request evidence
--
-- A provider may inspect request evidence while deciding an active opportunity,
-- and after assignment as the service provider. A rejected/expired historical
-- offer must not keep permanent access to photos from a client's request.

alter policy evidencia_solicitud_participantes_select
on public.evidencias_solicitud
using (
  cliente_id = (select auth.uid())
  or private.is_admin((select auth.uid()))
  or (
    servicio_id is not null
    and (
      exists (
        select 1
        from public.servicios s
        where s.id = evidencias_solicitud.servicio_id
          and s.proveedor_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.ofertas_servicio o
        where o.servicio_id = evidencias_solicitud.servicio_id
          and o.proveedor_id = (select auth.uid())
          and o.estado = 'pendiente'
          and (o.expira_at is null or o.expira_at > now())
      )
    )
  )
);

alter policy request_evidence_participant_select
on storage.objects
using (
  bucket_id = 'request-evidence'
  and exists (
    select 1
    from public.evidencias_solicitud e
    where e.storage_path = storage.objects.name
      and (
        e.cliente_id = (select auth.uid())
        or private.is_admin((select auth.uid()))
        or (
          e.servicio_id is not null
          and (
            exists (
              select 1
              from public.servicios s
              where s.id = e.servicio_id
                and s.proveedor_id = (select auth.uid())
            )
            or exists (
              select 1
              from public.ofertas_servicio o
              where o.servicio_id = e.servicio_id
                and o.proveedor_id = (select auth.uid())
                and o.estado = 'pendiente'
                and (o.expira_at is null or o.expira_at > now())
            )
          )
        )
      )
  )
);
