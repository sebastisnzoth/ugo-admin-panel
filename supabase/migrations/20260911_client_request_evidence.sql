-- UGO · Evidencia previa del cliente
-- Permite que el cliente documente el trabajo a realizar para que el proveedor lo analice antes de aceptar.

alter table public.evidencias_servicio
  drop constraint if exists evidencias_servicio_tipo_check;

alter table public.evidencias_servicio
  add constraint evidencias_servicio_tipo_check
  check (tipo in ('solicitud','antes','durante','despues','documento'));

drop policy if exists evidencias_cliente_solicitud_insert on public.evidencias_servicio;
create policy evidencias_cliente_solicitud_insert on public.evidencias_servicio
for insert with check (
  usuario_id = auth.uid()
  and tipo = 'solicitud'
  and exists (
    select 1 from public.servicios s
    where s.id = evidencias_servicio.servicio_id
      and s.cliente_id = auth.uid()
      and s.estado in ('buscando','ofrecido','asignado')
  )
);

drop policy if exists service_evidence_client_request_upload on storage.objects;
create policy service_evidence_client_request_upload on storage.objects
for insert to authenticated
with check (
  bucket_id='service-evidence'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1 from public.servicios s
    where s.id::text = (storage.foldername(name))[1]
      and s.cliente_id = auth.uid()
      and s.estado in ('buscando','ofrecido','asignado')
  )
);
