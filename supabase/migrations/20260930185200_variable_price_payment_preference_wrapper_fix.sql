-- TEST/prod reconciliation if the first variable-price preference migration was already applied.
create or replace function public.seleccionar_metodo_pago_servicio(
  p_servicio_id uuid,
  p_metodo text
)
returns jsonb
language sql
security definer
set search_path='public','private','pg_temp'
as $$
  select private.seleccionar_metodo_pago_servicio_impl(p_servicio_id,p_metodo);
$$;

revoke all on function public.seleccionar_metodo_pago_servicio(uuid,text) from public,anon;
grant execute on function public.seleccionar_metodo_pago_servicio(uuid,text) to authenticated,service_role;
notify pgrst,'reload schema';
