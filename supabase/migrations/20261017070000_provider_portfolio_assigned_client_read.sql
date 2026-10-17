-- Allow clients to view portfolio images only from professionals assigned to them.
-- Existing owner-only SELECT policy is retained.
do $$
begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='provider_portfolio_select_assigned_clients') then
  create policy "provider_portfolio_select_assigned_clients"
  on storage.objects for select to authenticated
  using (
   bucket_id='provider-public'
   and (storage.foldername(name))[2]='portfolio'
   and exists (
    select 1 from public.servicios s
    where s.proveedor_id::text=(storage.foldername(name))[1]
     and s.cliente_id=(select auth.uid())
     and s.estado in ('asignado','en_camino','llegado','en_progreso','esperando_aprobacion','completado')
   )
  );
 end if;
end;
$$;
