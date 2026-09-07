create or replace function public.obtener_demanda_proveedor(
  p_categoria_id uuid default null,
  p_horas integer default 24
)
returns table(
  zona_lat double precision,
  zona_lng double precision,
  pedidos bigint,
  urgentes bigint,
  tarifa_promedio numeric,
  ultimo_pedido timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with base as (
    select
      round((st_y(s.ubicacion_cliente::geometry) / 0.02)::numeric) * 0.02 as lat_cell,
      round((st_x(s.ubicacion_cliente::geometry) / 0.02)::numeric) * 0.02 as lng_cell,
      s.urgencia,
      s.tarifa,
      s.created_at
    from public.servicios s
    where auth.uid() is not null
      and s.ambiente = 'real'
      and s.ubicacion_cliente is not null
      and s.created_at >= now() - make_interval(hours => greatest(1, least(coalesce(p_horas,24),168)))
      and (p_categoria_id is null or s.categoria_id = p_categoria_id)
      and s.estado <> 'cancelado'
  )
  select
    lat_cell::double precision as zona_lat,
    lng_cell::double precision as zona_lng,
    count(*)::bigint as pedidos,
    count(*) filter (where urgencia)::bigint as urgentes,
    round(avg(tarifa),2) as tarifa_promedio,
    max(created_at) as ultimo_pedido
  from base
  group by lat_cell,lng_cell
  order by count(*) desc, max(created_at) desc;
$$;

revoke all on function public.obtener_demanda_proveedor(uuid,integer) from public;
grant execute on function public.obtener_demanda_proveedor(uuid,integer) to authenticated;
comment on function public.obtener_demanda_proveedor(uuid,integer) is 'Aggregated REAL demand by ~2 km cells for authenticated UGO providers; never returns client addresses or exact request locations.';
