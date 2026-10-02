-- Keep the public lifecycle RPC callable while the private implementation remains non-executable.
create or replace function public.avanzar_servicio(
  p_servicio_id uuid,
  p_estado servicio_estado
)
returns public.servicios
language sql
security definer
set search_path='public','private','pg_temp'
as $$
  select private.avanzar_servicio_impl(p_servicio_id,p_estado);
$$;

revoke all on function public.avanzar_servicio(uuid,servicio_estado) from public,anon;
grant execute on function public.avanzar_servicio(uuid,servicio_estado) to authenticated,service_role;
notify pgrst,'reload schema';
