-- UGO · Performance hardening for the new request-evidence / expansion flows.
-- Scope policies explicitly to authenticated users, evaluate auth.uid() once per query,
-- merge overlapping SELECT policies and cover the new foreign keys with indexes.

create index if not exists idx_ampliaciones_servicio_propuesto_por
  on public.ampliaciones_servicio(propuesto_por);
create index if not exists idx_ampliaciones_servicio_resuelto_por
  on public.ampliaciones_servicio(resuelto_por)
  where resuelto_por is not null;

drop policy if exists evidencia_solicitud_cliente_select on public.evidencias_solicitud;
drop policy if exists evidencia_solicitud_proveedor_select on public.evidencias_solicitud;
drop policy if exists evidencia_solicitud_participantes_select on public.evidencias_solicitud;
create policy evidencia_solicitud_participantes_select on public.evidencias_solicitud
for select to authenticated
using (
  cliente_id = (select auth.uid())
  or (
    servicio_id is not null
    and exists (
      select 1
      from public.ofertas_servicio o
      where o.servicio_id = evidencias_solicitud.servicio_id
        and o.proveedor_id = (select auth.uid())
    )
  )
);

drop policy if exists evidencia_solicitud_cliente_insert on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_insert on public.evidencias_solicitud
for insert to authenticated
with check (
  cliente_id = (select auth.uid())
  and servicio_id is null
);

drop policy if exists evidencia_solicitud_cliente_delete on public.evidencias_solicitud;
create policy evidencia_solicitud_cliente_delete on public.evidencias_solicitud
for delete to authenticated
using (
  cliente_id = (select auth.uid())
  and servicio_id is null
);

drop policy if exists ampliaciones_participantes_select on public.ampliaciones_servicio;
create policy ampliaciones_participantes_select on public.ampliaciones_servicio
for select to authenticated
using (
  (select auth.uid()) = cliente_id
  or (select auth.uid()) = proveedor_id
);
