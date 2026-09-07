-- Safe offer feed for provider before acceptance. No client id, exact address, phone or coordinates.
create or replace function public.obtener_ofertas_proveedor()
returns table(
  id uuid,
  servicio_id uuid,
  proveedor_id uuid,
  estado text,
  ranking integer,
  distancia_km numeric,
  tarifa_ofrecida numeric,
  expira_at timestamptz,
  created_at timestamptz,
  servicio jsonb
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    o.id,
    o.servicio_id,
    o.proveedor_id,
    o.estado::text,
    o.ranking,
    o.distancia_km,
    o.tarifa_ofrecida,
    o.expira_at,
    o.created_at,
    jsonb_build_object(
      'id', s.id,
      'numero', s.numero,
      'categoria_id', s.categoria_id,
      'estado', s.estado::text,
      'descripcion', s.descripcion,
      'urgencia', s.urgencia,
      'direccion_cliente', null,
      'tarifa', s.tarifa,
      'moneda', s.moneda,
      'created_at', s.created_at,
      'cliente', jsonb_build_object('nombre','Cliente UGO'),
      'categoria', jsonb_build_object('nombre',c.nombre,'emoji',c.emoji)
    ) as servicio
  from public.ofertas_servicio o
  join public.servicios s on s.id=o.servicio_id
  left join public.categorias c on c.id=s.categoria_id
  where auth.uid() is not null
    and o.proveedor_id=auth.uid()
    and o.estado='pendiente'
    and (o.expira_at is null or o.expira_at>now())
  order by o.created_at desc;
$$;
revoke all on function public.obtener_ofertas_proveedor() from public;
grant execute on function public.obtener_ofertas_proveedor() to authenticated;
comment on function public.obtener_ofertas_proveedor() is 'Safe provider offer feed: no client id, exact address, phone, or coordinates before acceptance.';
