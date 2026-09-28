-- P0 TEST harness regression fix: create the service before publishing the provider GPS.
-- Service creation may emit enough synchronous work that a prior 30-second location expires before matching.
-- The business RPC remains authoritative; no service state is mutated to simulate matching.
create or replace function public.autonomous_qa_refresh_provider_for_matching(p_provider_id uuid,p_lat double precision,p_lng double precision)
returns void language plpgsql security definer set search_path=public,private,auth as $$
begin
 perform set_config('request.jwt.claim.sub',p_provider_id::text,true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform public.publicar_ubicacion_disponibilidad_proveedor(p_lat,p_lng,now(),10);
end$$;
revoke all on function public.autonomous_qa_refresh_provider_for_matching(uuid,double precision,double precision) from public,anon,authenticated;
grant execute on function public.autonomous_qa_refresh_provider_for_matching(uuid,double precision,double precision) to service_role;
