drop policy if exists ofertas_update on public.ofertas_servicio;
create policy ofertas_update on public.ofertas_servicio
for update using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

drop policy if exists servicios_update on public.servicios;
create policy servicios_update on public.servicios
for update using (private.is_admin((select auth.uid())))
with check (private.is_admin((select auth.uid())));

comment on policy ofertas_update on public.ofertas_servicio is 'Stage 5: normal providers must respond through aceptar_oferta/rechazar_oferta RPCs; only admins may update rows directly.';
comment on policy servicios_update on public.servicios is 'Critical service state changes go through backend/RPC; direct row updates are admin-only.';
